from dataclasses import dataclass
from datetime import datetime, timezone

from openai import OpenAI
from pinecone import Pinecone
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import User
from app.services.provider_presets import (
    DEFAULT_GEMINI_BASE,
    embedding_fingerprint,
    resolve_chat_config,
    resolve_embedding_config,
    resolve_model_name,
)
from app.utils.crypto import decrypt_value, encrypt_value, mask_secret


@dataclass
class ChatCredentials:
    provider: str
    api_key: str
    base_url: str
    model: str


@dataclass
class EmbeddingCredentials:
    provider: str
    api_key: str
    base_url: str
    model: str
    dimensions: int
    fingerprint: str


@dataclass
class UserCredentials:
    chat: ChatCredentials
    embedding: EmbeddingCredentials
    pinecone_api_key: str
    pinecone_index_host: str


def _decrypt_key(enc: str | None) -> str | None:
    if not enc:
        return None
    return decrypt_value(enc)


def _chat_key(user: User) -> str | None:
    return _decrypt_key(user.chat_api_key_enc) or _decrypt_key(user.openai_api_key_enc)


def _embedding_key(user: User) -> str | None:
    return _decrypt_key(user.embedding_api_key_enc) or _decrypt_key(user.openai_api_key_enc)


def get_chat_credentials(user: User) -> ChatCredentials:
    api_key = _chat_key(user)
    if not api_key or not user.chat_model:
        raise ValueError("Chat provider not configured")
    settings = get_settings()
    base_url = user.chat_base_url or user.openai_base_url or settings.default_openai_base_url or DEFAULT_GEMINI_BASE
    return ChatCredentials(
        provider=user.chat_provider or "gemini",
        api_key=api_key,
        base_url=base_url,
        model=user.chat_model,
    )


def get_embedding_credentials(user: User) -> EmbeddingCredentials:
    api_key = _embedding_key(user)
    if not api_key or not user.embedding_model or not user.embedding_dimensions:
        raise ValueError("Embedding provider not configured")
    settings = get_settings()
    base_url = user.embedding_base_url or user.openai_base_url or settings.default_openai_base_url or DEFAULT_GEMINI_BASE
    provider = user.embedding_provider or "gemini"
    dims = user.embedding_dimensions
    fingerprint = user.embedding_profile_fingerprint or embedding_fingerprint(provider, user.embedding_model, dims)
    return EmbeddingCredentials(
        provider=provider,
        api_key=api_key,
        base_url=base_url,
        model=user.embedding_model,
        dimensions=dims,
        fingerprint=fingerprint,
    )


def get_user_credentials(user: User) -> UserCredentials:
    if not user.pinecone_api_key_enc or not user.pinecone_index_host:
        raise ValueError("Credentials not configured")
    return UserCredentials(
        chat=get_chat_credentials(user),
        embedding=get_embedding_credentials(user),
        pinecone_api_key=decrypt_value(user.pinecone_api_key_enc),
        pinecone_index_host=user.pinecone_index_host,
    )


def get_chat_client(creds: ChatCredentials) -> OpenAI:
    return OpenAI(api_key=creds.api_key, base_url=creds.base_url)


def get_embedding_client(creds: EmbeddingCredentials) -> OpenAI:
    return OpenAI(api_key=creds.api_key, base_url=creds.base_url)


def get_openai_client(creds: UserCredentials) -> OpenAI:
    """Backward-compatible alias for embedding client."""
    return get_embedding_client(creds.embedding)


def get_pinecone_index(creds: UserCredentials):
    pc = Pinecone(api_key=creds.pinecone_api_key)
    return pc.Index(host=creds.pinecone_index_host)


async def save_chat_settings(
    db: AsyncSession,
    user: User,
    provider: str,
    api_key: str,
    base_url: str | None,
    model: str | None,
) -> User:
    resolved = resolve_chat_config(provider, api_key, base_url, model)
    user.chat_provider = resolved["provider"]
    user.chat_api_key_enc = encrypt_value(resolved["api_key"])
    user.chat_base_url = resolved["base_url"]
    user.chat_model = resolved["model"]
    user.chat_validated_at = None
    # Keep legacy fields in sync for older clients
    user.openai_api_key_enc = user.chat_api_key_enc
    user.openai_base_url = user.chat_base_url
    user.openai_validated_at = None
    await db.commit()
    await db.refresh(user)
    return user


async def save_embedding_settings(
    db: AsyncSession,
    user: User,
    provider: str,
    api_key: str,
    base_url: str | None,
    model: str | None,
    dimensions: int | None,
) -> User:
    resolved = resolve_embedding_config(provider, api_key, base_url, model, dimensions)
    user.embedding_provider = resolved["provider"]
    user.embedding_api_key_enc = encrypt_value(resolved["api_key"])
    user.embedding_base_url = resolved["base_url"]
    user.embedding_model = resolved["model"]
    user.embedding_dimensions = resolved["dimensions"]
    user.embedding_profile_fingerprint = embedding_fingerprint(
        resolved["provider"], resolved["model"], resolved["dimensions"]
    )
    user.embedding_validated_at = None
    await db.commit()
    await db.refresh(user)
    return user


async def save_openai_settings(
    db: AsyncSession, user: User, api_key: str, base_url: str | None
) -> User:
    """Legacy alias: saves chat and embedding providers from one key."""
    provider = "gemini"
    if base_url:
        lower = base_url.lower()
        if "api.openai.com" in lower:
            provider = "openai"
        elif "x.ai" in lower:
            provider = "xai"
        elif "generativelanguage" not in lower:
            provider = "custom"
    user = await save_chat_settings(db, user, provider, api_key, base_url, None)
    if provider != "xai":
        embed_provider = provider if provider in ("gemini", "openai", "custom") else "gemini"
        user = await save_embedding_settings(
            db, user, embed_provider, api_key, base_url, None, 1536
        )
    return user


async def save_pinecone_settings(
    db: AsyncSession, user: User, api_key: str, index_host: str
) -> User:
    user.pinecone_api_key_enc = encrypt_value(api_key)
    user.pinecone_index_host = index_host.strip()
    user.pinecone_validated_at = None
    await db.commit()
    await db.refresh(user)
    return user


async def clear_credentials(db: AsyncSession, user: User) -> User:
    user.openai_api_key_enc = None
    user.openai_base_url = None
    user.openai_validated_at = None
    user.chat_provider = None
    user.chat_api_key_enc = None
    user.chat_base_url = None
    user.chat_model = None
    user.chat_validated_at = None
    user.embedding_provider = None
    user.embedding_api_key_enc = None
    user.embedding_base_url = None
    user.embedding_model = None
    user.embedding_dimensions = None
    user.embedding_validated_at = None
    user.embedding_profile_fingerprint = None
    user.pinecone_api_key_enc = None
    user.pinecone_index_host = None
    user.pinecone_validated_at = None
    await db.commit()
    await db.refresh(user)
    return user


def _hint(enc: str | None) -> str | None:
    if not enc:
        return None
    try:
        return mask_secret(decrypt_value(enc))
    except ValueError:
        return "••••"


def user_to_status(user: User) -> dict:
    chat_configured = bool(_chat_key(user) and user.chat_model)
    embedding_configured = bool(
        _embedding_key(user) and user.embedding_model and user.embedding_dimensions
    )
    pinecone_configured = bool(user.pinecone_api_key_enc and user.pinecone_index_host)
    chat_validated = bool(user.chat_validated_at)
    embedding_validated = bool(user.embedding_validated_at)
    pinecone_validated = bool(user.pinecone_validated_at)
    return {
        "chat_provider": user.chat_provider,
        "chat_model": user.chat_model,
        "chat_base_url": user.chat_base_url,
        "chat_key_hint": _hint(user.chat_api_key_enc) or _hint(user.openai_api_key_enc),
        "chat_configured": chat_configured,
        "chat_validated": chat_validated,
        "embedding_provider": user.embedding_provider,
        "embedding_model": user.embedding_model,
        "embedding_dimensions": user.embedding_dimensions,
        "embedding_base_url": user.embedding_base_url,
        "embedding_key_hint": _hint(user.embedding_api_key_enc) or _hint(user.openai_api_key_enc),
        "embedding_configured": embedding_configured,
        "embedding_validated": embedding_validated,
        "embedding_profile_fingerprint": user.embedding_profile_fingerprint,
        "pinecone_key_hint": _hint(user.pinecone_api_key_enc),
        "pinecone_configured": pinecone_configured,
        "pinecone_validated": pinecone_validated,
        "credentials_configured": bool(
            chat_configured and embedding_configured and pinecone_configured
        ),
        "semantic_configured": bool(embedding_configured and pinecone_configured),
        # Legacy fields
        "openai_key_hint": _hint(user.openai_api_key_enc),
        "openai_configured": chat_configured,
        "openai_base_url": user.chat_base_url or user.openai_base_url,
    }


async def test_chat_connection(user: User) -> tuple[bool, str]:
    try:
        creds = get_chat_credentials(user)
        client = get_chat_client(creds)
        model = resolve_model_name(creds.base_url, creds.model)
        client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=5,
        )
        return True, f"{creds.provider.title()} chat connection successful"
    except Exception as exc:
        return False, f"Chat connection failed: {exc}"


async def test_embedding_connection(user: User) -> tuple[bool, str]:
    try:
        creds = get_embedding_credentials(user)
        client = get_embedding_client(creds)
        model = resolve_model_name(creds.base_url, creds.model)
        kwargs: dict = {"input": "connection test", "model": model}
        if creds.dimensions:
            kwargs["dimensions"] = creds.dimensions
        response = client.embeddings.create(**kwargs)
        vector = response.data[0].embedding
        if len(vector) != creds.dimensions:
            return (
                False,
                f"Embedding dimension mismatch: got {len(vector)}, expected {creds.dimensions}",
            )
        return True, f"{creds.provider.title()} embedding connection successful ({creds.dimensions} dims)"
    except Exception as exc:
        return False, f"Embedding connection failed: {exc}"


async def test_openai_connection(user: User) -> tuple[bool, str]:
    """Legacy alias for embedding test."""
    return await test_embedding_connection(user)


async def test_pinecone_connection(user: User, expected_dimensions: int | None = None) -> tuple[bool, str]:
    try:
        if not user.pinecone_api_key_enc or not user.pinecone_index_host:
            return False, "Pinecone not configured"
        api_key = decrypt_value(user.pinecone_api_key_enc)
        pc = Pinecone(api_key=api_key)
        index = pc.Index(host=user.pinecone_index_host)
        stats = index.describe_index_stats()
        if expected_dimensions and user.embedding_dimensions and user.embedding_dimensions != expected_dimensions:
            pass
        return True, f"Pinecone connection successful (vectors: {stats.total_vector_count})"
    except Exception as exc:
        return False, f"Pinecone connection failed: {exc}"


async def mark_chat_validated(db: AsyncSession, user: User) -> None:
    user.chat_validated_at = datetime.now(timezone.utc)
    await db.commit()


async def mark_embedding_validated(db: AsyncSession, user: User) -> None:
    user.embedding_validated_at = datetime.now(timezone.utc)
    user.openai_validated_at = user.embedding_validated_at
    await db.commit()


async def mark_openai_validated(db: AsyncSession, user: User) -> None:
    await mark_embedding_validated(db, user)


async def mark_pinecone_validated(db: AsyncSession, user: User) -> None:
    user.pinecone_validated_at = datetime.now(timezone.utc)
    await db.commit()
