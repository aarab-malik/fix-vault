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
