from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession
from app.models import User
from app.schemas import LoginRequest, SignupRequest, UserResponse
from app.utils.serializers import build_user_response
from app.utils.auth import (
    create_access_token,
    hash_password,
    normalize_email,
    verify_password_or_dummy,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _cookie_settings() -> dict:
    from app.config import get_settings

    settings = get_settings()
    return {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "path": "/",
    }


def _set_auth_cookie(response: Response, token: str) -> None:
    from app.config import get_settings

    settings = get_settings()
    response.set_cookie(
        key="access_token",
        value=token,
        max_age=settings.jwt_expire_minutes * 60,
        **_cookie_settings(),
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(key="access_token", **_cookie_settings())


def _user_response(user: User) -> UserResponse:
    return build_user_response(user)


@router.post("/signup", response_model=UserResponse)
async def signup(body: SignupRequest, response: Response, db: DbSession):
    email = normalize_email(str(body.email))
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(email=email, password_hash=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(user.email)
    _set_auth_cookie(response, token)
    return _user_response(user)


@router.post("/login", response_model=UserResponse)
async def login(body: LoginRequest, response: Response, db: DbSession):
    email = normalize_email(str(body.email))
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    # Always run a password check (dummy hash if user missing) so absence
    # of an account does not look like a different failure mode.
    password_ok = verify_password_or_dummy(body.password, user.password_hash if user else None)
    if not user or not password_ok:
        _clear_auth_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(user.email)
    _set_auth_cookie(response, token)
    return _user_response(user)


@router.post("/logout")
async def logout(response: Response):
    _clear_auth_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser):
    return _user_response(user)
