from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import APIStatusError, RateLimitError

from app.db_migrate import run_migrations
from app.api import ask, auth, incidents, settings
from app.config import get_settings
from app.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await run_migrations(engine)
    except Exception as exc:
        # Do not crash the whole serverless function on cold start if DB is briefly
        # unreachable; /health can still respond and logs will show the real error.
        print(f"[fixvault] database init failed: {exc}")
    yield
    try:
        await engine.dispose()
    except Exception:
        pass


app = FastAPI(title="FixVault API", version="1.0.0", lifespan=lifespan)

settings_cfg = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings_cfg.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RateLimitError)
async def rate_limit_handler(request: Request, exc: RateLimitError):
    return JSONResponse(
        status_code=429,
        content={
            "detail": (
                "Your AI provider rate limit was hit (free tier quota). "
                "Wait a minute and try again, or check your quota at "
                "https://ai.google.dev/gemini-api/docs/rate-limits"
            )
        },
    )


@app.exception_handler(APIStatusError)
async def provider_error_handler(request: Request, exc: APIStatusError):
    provider_message = str(exc)[:400]
    return JSONResponse(
        status_code=502,
        content={"detail": f"AI provider error ({exc.status_code}): {provider_message}"},
    )


app.include_router(auth.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(ask.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "service": "FixVault API",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/health/db")
async def health_db():
    """Temporary diagnostics: shows whether Postgres is reachable (password redacted)."""
    import re

    from sqlalchemy import text

    from app.config import get_settings

    settings = get_settings()
    safe_url = re.sub(r":([^:@/]+)@", ":***@", settings.database_url)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"ok": True, "database_url": safe_url}
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"ok": False, "database_url": safe_url, "error": str(exc)[:800]},
        )
