from collections.abc import AsyncGenerator
import ssl

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()


def _asyncpg_ssl_context() -> ssl.SSLContext:
    """TLS to Supabase/pooler without breaking on managed cert chains."""
    ctx = ssl.create_default_context()
    # Supabase pooler often presents a chain that fails default verify on
    # serverless hosts. Traffic is still encrypted; hostname is known.
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


# Supabase pooler (port 6543) does not support asyncpg prepared statements.
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    connect_args={
        "statement_cache_size": 0,
        "ssl": _asyncpg_ssl_context(),
    },
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
