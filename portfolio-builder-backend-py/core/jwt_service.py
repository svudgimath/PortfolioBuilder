from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings

ALGORITHM = "HS256"


def _build_token(user_id: str, email: str, expiration_seconds: int, token_type: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "type": token_type,
        "iat": now,
        "exp": now + timedelta(seconds=expiration_seconds),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def generate_access_token(user_id: str, email: str) -> str:
    return _build_token(user_id, email, settings.JWT_ACCESS_EXPIRATION_SECONDS, "access")


def generate_refresh_token(user_id: str, email: str) -> str:
    return _build_token(user_id, email, settings.JWT_REFRESH_EXPIRATION_SECONDS, "refresh")


def parse_token(token: str) -> dict:
    """Raises jwt.PyJWTError (or a subclass) on any invalid/expired/malformed token."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])


def is_token_valid(token: str) -> bool:
    try:
        parse_token(token)
        return True
    except jwt.PyJWTError:
        return False


def get_token_type(token: str) -> str | None:
    try:
        return parse_token(token).get("type")
    except jwt.PyJWTError:
        return None


def is_access_token(token: str) -> bool:
    return get_token_type(token) == "access"


def get_user_id_from_token(token: str) -> str:
    return parse_token(token)["sub"]
