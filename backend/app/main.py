from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import APIStatusError, RateLimitError

from app.api import ask, auth, incidents, settings
from app.config import get_settings
from app.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


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


@app.get("/health")
async def health():
    return {"status": "ok"}
