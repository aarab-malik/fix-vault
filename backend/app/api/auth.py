from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession
from app.models import User
from app.schemas import LoginRequest, SignupRequest, UserResponse
from app.utils.serializers import build_user_response
from app.utils.auth import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    from app.config import get_settings
    settings = get_settings()
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.jwt_expire_minutes * 60,
        path="/",
    )


def _user_response(user: User) -> UserResponse:
    return build_user_response(user)


@router.post("/signup", response_model=UserResponse)
async def signup(body: SignupRequest, response: Response, db: DbSession):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(user.email)
    _set_auth_cookie(response, token)
    return _user_response(user)


@router.post("/login", response_model=UserResponse)
async def login(body: LoginRequest, response: Response, db: DbSession):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user.email)
    _set_auth_cookie(response, token)
    return _user_response(user)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser):
    return _user_response(user)
