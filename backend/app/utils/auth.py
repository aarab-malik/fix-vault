from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from pwdlib import PasswordHash

from app.config import get_settings

password_hash = PasswordHash.recommended()

# Used only to keep login timing similar when the email does not exist.
_DUMMY_PASSWORD_HASH = password_hash.hash("fixvault-timing-dummy-not-a-real-password")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bool(password_hash.verify(plain, hashed))
    except Exception:
        return False


def verify_password_or_dummy(plain: str, hashed: str | None) -> bool:
    """Verify password; if hash missing, still burn comparable work."""
    if hashed:
        return verify_password(plain, hashed)
    verify_password(plain, _DUMMY_PASSWORD_HASH)
    return False


def normalize_email(email: str) -> str:
    return email.strip().lower()


def create_access_token(subject: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        sub = payload.get("sub")
        return sub if isinstance(sub, str) else None
    except JWTError:
        return None
