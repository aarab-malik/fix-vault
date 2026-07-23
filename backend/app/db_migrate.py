"""Lightweight schema migrations for deployments without Alembic history."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine


MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_provider VARCHAR(32)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_api_key_enc TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_base_url VARCHAR(512)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_model VARCHAR(128)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_validated_at TIMESTAMPTZ",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS embedding_provider VARCHAR(32)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS embedding_api_key_enc TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS embedding_base_url VARCHAR(512)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(128)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS embedding_dimensions INTEGER",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS embedding_validated_at TIMESTAMPTZ",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS embedding_profile_fingerprint VARCHAR(256)",
    # Backfill legacy Gemini users into split provider fields
    """
    UPDATE users
    SET chat_provider = COALESCE(chat_provider, 'gemini'),
        embedding_provider = COALESCE(embedding_provider, 'gemini'),
        chat_api_key_enc = COALESCE(chat_api_key_enc, openai_api_key_enc),
        embedding_api_key_enc = COALESCE(embedding_api_key_enc, openai_api_key_enc),
        chat_base_url = COALESCE(chat_base_url, openai_base_url),
        embedding_base_url = COALESCE(embedding_base_url, openai_base_url),
        chat_model = COALESCE(chat_model, 'gemini-flash-latest'),
        embedding_model = COALESCE(embedding_model, 'gemini-embedding-001'),
        embedding_dimensions = COALESCE(embedding_dimensions, 1536),
        chat_validated_at = COALESCE(chat_validated_at, openai_validated_at),
        embedding_validated_at = COALESCE(embedding_validated_at, openai_validated_at),
        embedding_profile_fingerprint = COALESCE(
            embedding_profile_fingerprint,
            CASE
                WHEN embedding_model IS NOT NULL THEN 'gemini:gemini-embedding-001:1536'
                ELSE NULL
            END
        )
    WHERE openai_api_key_enc IS NOT NULL
    """,
]


async def run_migrations(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        for stmt in MIGRATIONS:
            await conn.execute(text(stmt))
