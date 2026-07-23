from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, DbSession
from app.schemas import (
    ChatProviderSettingsRequest,
    ConnectionTestResponse,
    EmbeddingProviderSettingsRequest,
    OpenAISettingsRequest,
    PineconeSettingsRequest,
    UserResponse,
)
from app.services.credentials import (
    clear_credentials,
    mark_chat_validated,
    mark_embedding_validated,
    mark_openai_validated,
    mark_pinecone_validated,
    save_chat_settings,
    save_embedding_settings,
    save_openai_settings,
    save_pinecone_settings,
    test_chat_connection,
    test_embedding_connection,
    test_openai_connection,
    test_pinecone_connection,
)
from app.services.provider_presets import (
    CHAT_PROVIDER_PRESETS,
    EMBEDDING_PROVIDER_PRESETS,
)
from app.utils.serializers import build_user_response

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/presets")
async def get_provider_presets():
    return {
        "chat": [
            {
                "id": p.id,
                "label": p.label,
                "base_url": p.base_url,
                "default_chat_model": p.default_chat_model,
                "supports_embeddings": p.supports_embeddings,
                "key_hint": p.key_hint,
                "docs_url": p.docs_url,
            }
            for p in CHAT_PROVIDER_PRESETS.values()
        ],
        "embedding": [
            {
                "id": p.id,
                "label": p.label,
                "base_url": p.base_url,
                "default_embedding_model": p.default_embedding_model,
                "default_dimensions": p.default_dimensions,
                "key_hint": p.key_hint,
                "docs_url": p.docs_url,
            }
            for p in EMBEDDING_PROVIDER_PRESETS.values()
        ],
    }


@router.get("", response_model=UserResponse)
async def get_settings_status(user: CurrentUser):
    return build_user_response(user)


@router.post("/chat", response_model=UserResponse)
async def save_chat(body: ChatProviderSettingsRequest, user: CurrentUser, db: DbSession):
    try:
        user = await save_chat_settings(
            db, user, body.provider, body.api_key, body.base_url, body.model
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return build_user_response(user)


@router.post("/embedding", response_model=UserResponse)
async def save_embedding(body: EmbeddingProviderSettingsRequest, user: CurrentUser, db: DbSession):
    try:
        user = await save_embedding_settings(
            db,
            user,
            body.provider,
            body.api_key,
            body.base_url,
            body.model,
            body.dimensions,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return build_user_response(user)


@router.post("/openai", response_model=UserResponse)
async def save_openai(body: OpenAISettingsRequest, user: CurrentUser, db: DbSession):
    """Legacy alias for combined Gemini/OpenAI setup."""
    user = await save_openai_settings(db, user, body.openai_api_key, body.openai_base_url)
    return build_user_response(user)


@router.post("/pinecone", response_model=UserResponse)
async def save_pinecone(body: PineconeSettingsRequest, user: CurrentUser, db: DbSession):
    user = await save_pinecone_settings(db, user, body.pinecone_api_key, body.pinecone_index_host)
    return build_user_response(user)


@router.post("/test/chat", response_model=ConnectionTestResponse)
async def test_chat(user: CurrentUser, db: DbSession):
    ok, message = await test_chat_connection(user)
    if ok:
        await mark_chat_validated(db, user)
    return ConnectionTestResponse(ok=ok, message=message)


@router.post("/test/embedding", response_model=ConnectionTestResponse)
async def test_embedding(user: CurrentUser, db: DbSession):
    ok, message = await test_embedding_connection(user)
    if ok:
        await mark_embedding_validated(db, user)
    return ConnectionTestResponse(ok=ok, message=message)


@router.post("/test/openai", response_model=ConnectionTestResponse)
async def test_openai(user: CurrentUser, db: DbSession):
    """Legacy alias for embedding test."""
    ok, message = await test_openai_connection(user)
    if ok:
        await mark_openai_validated(db, user)
    return ConnectionTestResponse(ok=ok, message=message)


@router.post("/test/pinecone", response_model=ConnectionTestResponse)
async def test_pinecone(user: CurrentUser, db: DbSession):
    if not user.pinecone_api_key_enc or not user.pinecone_index_host:
        raise HTTPException(status_code=400, detail="Pinecone not configured")
    ok, message = await test_pinecone_connection(user, user.embedding_dimensions)
    if ok:
        await mark_pinecone_validated(db, user)
    return ConnectionTestResponse(ok=ok, message=message)


@router.delete("", response_model=UserResponse)
async def delete_credentials(user: CurrentUser, db: DbSession):
    user = await clear_credentials(db, user)
    return build_user_response(user)
