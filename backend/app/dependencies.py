from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.services.credentials import user_to_status
from app.utils.auth import decode_access_token

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DbSession,
    access_token: str | None = Cookie(default=None, alias="access_token"),
) -> User:
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    email = decode_access_token(access_token)
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    email = email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def _status(user: User) -> dict:
    return user_to_status(user)


async def require_chat(user: CurrentUser) -> User:
    status_data = _status(user)
    if not status_data["chat_configured"]:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="chat_provider_required",
        )
    return user


async def require_semantic(user: CurrentUser) -> User:
    status_data = _status(user)
    if not status_data["semantic_configured"]:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="semantic_provider_required",
        )
    return user


async def require_credentials(user: CurrentUser) -> User:
    status_data = _status(user)
    if not status_data["credentials_configured"]:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="credentials_required",
        )
    return user


ChatUser = Annotated[User, Depends(require_chat)]
SemanticUser = Annotated[User, Depends(require_semantic)]
CredentialsUser = Annotated[User, Depends(require_credentials)]
