from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUser, DbSession
from app.schemas import (
    ConnectionTestResponse,
    OpenAISettingsRequest,
    PineconeSettingsRequest,
    UserResponse,
)
from app.services.credentials import (
    clear_credentials,
    mark_openai_validated,
    mark_pinecone_validated,
    save_openai_settings,
    save_pinecone_settings,
    test_openai_connection,
    test_pinecone_connection,
)
from app.utils.serializers import build_user_response

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=UserResponse)
async def get_settings_status(user: CurrentUser):
    return build_user_response(user)


@router.post("/openai", response_model=UserResponse)
async def save_openai(body: OpenAISettingsRequest, user: CurrentUser, db: DbSession):
    user = await save_openai_settings(db, user, body.openai_api_key, body.openai_base_url)
    return build_user_response(user)


@router.post("/pinecone", response_model=UserResponse)
async def save_pinecone(body: PineconeSettingsRequest, user: CurrentUser, db: DbSession):
    user = await save_pinecone_settings(db, user, body.pinecone_api_key, body.pinecone_index_host)
    return build_user_response(user)


@router.post("/test/openai", response_model=ConnectionTestResponse)
async def test_openai(user: CurrentUser, db: DbSession):
    if not user.openai_api_key_enc:
        raise HTTPException(status_code=400, detail="OpenAI key not configured")
    ok, message = await test_openai_connection(user)
    if ok:
        await mark_openai_validated(db, user)
    return ConnectionTestResponse(ok=ok, message=message)


@router.post("/test/pinecone", response_model=ConnectionTestResponse)
async def test_pinecone(user: CurrentUser, db: DbSession):
    if not user.pinecone_api_key_enc or not user.pinecone_index_host:
        raise HTTPException(status_code=400, detail="Pinecone not configured")
    ok, message = await test_pinecone_connection(user)
    if ok:
        await mark_pinecone_validated(db, user)
    return ConnectionTestResponse(ok=ok, message=message)


@router.delete("", response_model=UserResponse)
async def delete_credentials(user: CurrentUser, db: DbSession):
    user = await clear_credentials(db, user)
    return build_user_response(user)
