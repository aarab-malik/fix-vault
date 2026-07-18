from dataclasses import dataclass
from datetime import datetime, timezone

from openai import OpenAI
from pinecone import Pinecone
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import User
from app.utils.crypto import decrypt_value, encrypt_value, mask_secret


@dataclass
class UserCredentials:
    openai_api_key: str
    openai_base_url: str
    pinecone_api_key: str
    pinecone_index_host: str


def get_user_credentials(user: User) -> UserCredentials:
    if not user.openai_api_key_enc or not user.pinecone_api_key_enc or not user.pinecone_index_host:
        raise ValueError("Credentials not configured")
    settings = get_settings()
    return UserCredentials(
        openai_api_key=decrypt_value(user.openai_api_key_enc),
        openai_base_url=user.openai_base_url or settings.default_openai_base_url,
        pinecone_api_key=decrypt_value(user.pinecone_api_key_enc),
        pinecone_index_host=user.pinecone_index_host,
    )


def get_openai_client(creds: UserCredentials) -> OpenAI:
    return OpenAI(api_key=creds.openai_api_key, base_url=creds.openai_base_url)


def resolve_model_name(base_url: str, model: str) -> str:
    """Map short model ids for gateways that need provider prefixes."""
    url = (base_url or "").lower()
    if "openrouter.ai" in url and "/" not in model:
        return f"google/{model}" if model.startswith("gemini") else f"openai/{model}"
    return model


def get_pinecone_index(creds: UserCredentials):
    pc = Pinecone(api_key=creds.pinecone_api_key)
    return pc.Index(host=creds.pinecone_index_host)


async def save_openai_settings(
    db: AsyncSession, user: User, api_key: str, base_url: str | None
) -> User:
    user.openai_api_key_enc = encrypt_value(api_key)
    user.openai_base_url = base_url or get_settings().default_openai_base_url
    await db.commit()
    await db.refresh(user)
    return user


async def save_pinecone_settings(
    db: AsyncSession, user: User, api_key: str, index_host: str
) -> User:
    user.pinecone_api_key_enc = encrypt_value(api_key)
    user.pinecone_index_host = index_host.strip()
    await db.commit()
    await db.refresh(user)
    return user


async def clear_credentials(db: AsyncSession, user: User) -> User:
    user.openai_api_key_enc = None
    user.openai_base_url = None
    user.pinecone_api_key_enc = None
    user.pinecone_index_host = None
    user.openai_validated_at = None
    user.pinecone_validated_at = None
    await db.commit()
    await db.refresh(user)
    return user


def user_to_status(user: User) -> dict:
    openai_hint = None
    pinecone_hint = None
    if user.openai_api_key_enc:
        try:
            openai_hint = mask_secret(decrypt_value(user.openai_api_key_enc))
        except ValueError:
            openai_hint = "••••"
    if user.pinecone_api_key_enc:
        try:
            pinecone_hint = mask_secret(decrypt_value(user.pinecone_api_key_enc))
        except ValueError:
            pinecone_hint = "••••"
    return {
        "openai_key_hint": openai_hint,
        "pinecone_key_hint": pinecone_hint,
        "openai_configured": bool(user.openai_api_key_enc),
        "pinecone_configured": bool(user.pinecone_api_key_enc and user.pinecone_index_host),
        "credentials_configured": bool(
            user.openai_api_key_enc and user.pinecone_api_key_enc and user.pinecone_index_host
        ),
    }


async def test_openai_connection(user: User) -> tuple[bool, str]:
    try:
        if not user.openai_api_key_enc:
            return False, "OpenAI key not configured"
        settings = get_settings()
        api_key = decrypt_value(user.openai_api_key_enc)
        base_url = user.openai_base_url or settings.default_openai_base_url
        client = OpenAI(api_key=api_key, base_url=base_url)
        model = resolve_model_name(base_url, settings.embedding_model)
        kwargs: dict = {"input": "connection test", "model": model}
        if settings.embedding_dimensions:
            kwargs["dimensions"] = settings.embedding_dimensions
        client.embeddings.create(**kwargs)
        return True, "Gemini connection successful"
    except Exception as exc:
        text = str(exc)
        if "API key" in text or "401" in text or "403" in text:
            return (
                False,
                "Gemini connection failed: check your API key from Google AI Studio "
                f"(https://aistudio.google.com/apikey). ({exc})",
            )
        return False, f"Gemini connection failed: {exc}"


async def test_pinecone_connection(user: User) -> tuple[bool, str]:
    try:
        if not user.pinecone_api_key_enc or not user.pinecone_index_host:
            return False, "Pinecone not configured"
        api_key = decrypt_value(user.pinecone_api_key_enc)
        pc = Pinecone(api_key=api_key)
        index = pc.Index(host=user.pinecone_index_host)
        stats = index.describe_index_stats()
        return True, f"Pinecone connection successful (vectors: {stats.total_vector_count})"
    except Exception as exc:
        return False, f"Pinecone connection failed: {exc}"


async def mark_openai_validated(db: AsyncSession, user: User) -> None:
    user.openai_validated_at = datetime.now(timezone.utc)
    await db.commit()


async def mark_pinecone_validated(db: AsyncSession, user: User) -> None:
    user.pinecone_validated_at = datetime.now(timezone.utc)
    await db.commit()
