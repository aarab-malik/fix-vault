from collections.abc import AsyncGenerator
import ssl
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import get_settings

settings = get_settings()


def _asyncpg_ssl_context() -> ssl.SSLContext:
    """TLS to Supabase/pooler without breaking on managed cert chains."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


# NullPool is required on Vercel/serverless: reused pooled connections break
# against Supabase transaction-mode PgBouncer (DuplicatePreparedStatementError).
engine = create_async_engine(
    settings.database_url,
    echo=False,
    poolclass=NullPool,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_name_func": lambda: f"__fv_{uuid4().hex}__",
        "ssl": _asyncpg_ssl_context(),
    },
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
