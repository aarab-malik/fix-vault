import pytest


@pytest.mark.asyncio
async def test_health(client):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_signup_login_me(client, unique_email):
    signup = await client.post("/api/auth/signup", json={"email": unique_email, "password": "password123"})
    assert signup.status_code == 200
    me = await client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == unique_email.lower()
    assert me.json()["credentials_configured"] is False

    await client.post("/api/auth/logout")
    login = await client.post("/api/auth/login", json={"email": unique_email, "password": "password123"})
    assert login.status_code == 200


@pytest.mark.asyncio
async def test_login_rejects_unknown_account(client):
    res = await client.post(
        "/api/auth/login",
        json={"email": "definitely-missing-user@example.com", "password": "password123"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid email or password"
    me = await client.get("/api/auth/me")
    assert me.status_code == 401


@pytest.mark.asyncio
async def test_login_rejects_wrong_password(client, unique_email):
    await client.post("/api/auth/signup", json={"email": unique_email, "password": "password123"})
    await client.post("/api/auth/logout")
    res = await client.post(
        "/api/auth/login",
        json={"email": unique_email, "password": "wrong-password"},
    )
    assert res.status_code == 401
    me = await client.get("/api/auth/me")
    assert me.status_code == 401


@pytest.mark.asyncio
async def test_incidents_require_credentials(client, unique_email):
    await client.post("/api/auth/signup", json={"email": unique_email, "password": "password123"})
    res = await client.post("/api/incidents/draft", json={"notes": "Docker container keeps restarting"})
    assert res.status_code == 428
    assert res.json()["detail"] == "chat_provider_required"


@pytest.mark.asyncio
async def test_provider_presets_endpoint(client, unique_email):
    await client.post("/api/auth/signup", json={"email": unique_email, "password": "password123"})
    res = await client.get("/api/settings/presets")
    assert res.status_code == 200
    data = res.json()
    assert "chat" in data and "embedding" in data
    chat_ids = {p["id"] for p in data["chat"]}
    embed_ids = {p["id"] for p in data["embedding"]}
    assert {"gemini", "openai", "xai", "custom"}.issubset(chat_ids)
    assert "xai" not in embed_ids
    assert {"gemini", "openai", "custom"}.issubset(embed_ids)


@pytest.mark.asyncio
async def test_chat_settings_partial_setup_masks_key(client, unique_email):
    await client.post("/api/auth/signup", json={"email": unique_email, "password": "password123"})
    api_key = "AIza" + "a" * 20
    res = await client.post(
        "/api/settings/chat",
        json={"provider": "gemini", "api_key": api_key, "base_url": None, "model": None},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["chat_configured"] is True
    assert data["credentials_configured"] is False
    assert data["semantic_configured"] is False
    assert data["chat_provider"] == "gemini"
    assert data["chat_key_hint"] == f"{api_key[:3]}…{api_key[-3:]}"
    assert api_key not in str(data)


@pytest.mark.asyncio
async def test_similar_incidents_require_semantic(client, unique_email):
    await client.post("/api/auth/signup", json={"email": unique_email, "password": "password123"})
    await client.post(
        "/api/settings/chat",
        json={"provider": "gemini", "api_key": "AIza" + "a" * 20, "base_url": None, "model": None},
    )
    res = await client.post("/api/incidents/similar", json={"notes": "Docker keeps restarting"})
    assert res.status_code == 428
    assert res.json()["detail"] == "semantic_provider_required"


@pytest.mark.asyncio
async def test_custom_chat_url_rejected(client, unique_email):
    await client.post("/api/auth/signup", json={"email": unique_email, "password": "password123"})
    res = await client.post(
        "/api/settings/chat",
        json={
            "provider": "custom",
            "api_key": "sk-" + "a" * 20,
            "base_url": "http://localhost:11434/v1",
            "model": "llama3",
        },
    )
    assert res.status_code == 400
    assert "https" in res.json()["detail"].lower() or "localhost" in res.json()["detail"].lower()
