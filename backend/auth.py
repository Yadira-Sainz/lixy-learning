import os
from functools import lru_cache
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt, jwk
from dotenv import load_dotenv

from db import get_db

load_dotenv()

security = HTTPBearer(auto_error=False)

# Cognito config (optional - if set, Cognito tokens are accepted)
COGNITO_REGION = os.environ.get("COGNITO_REGION")
COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID")
COGNITO_CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID")
JWT_SECRET = os.environ.get("JWT_SECRET", "")

COGNITO_JWKS_URL = (
    f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
    if COGNITO_USER_POOL_ID and COGNITO_REGION
    else None
)


@lru_cache(maxsize=1)
def _get_cognito_jwks() -> dict:
    """Fetch Cognito JWKS (cached)."""
    if not COGNITO_JWKS_URL:
        return {}
    resp = httpx.get(COGNITO_JWKS_URL, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _verify_cognito_token(token: str) -> dict | None:
    """Verify Cognito Id token. Returns payload dict with sub, email or None."""
    if not COGNITO_USER_POOL_ID or not COGNITO_REGION or not COGNITO_CLIENT_ID:
        return None
    try:
        unverified = jwt.get_unverified_header(token)
        kid = unverified.get("kid")
        if not kid:
            return None
        jwks = _get_cognito_jwks()
        key_data = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key_data:
            return None
        public_key = jwk.construct(key_data)
        # OAuth code flow Id tokens include at_hash; python-jose requires access_token to verify it.
        # We only receive the Id token on API calls; signature + aud + exp are still enforced.
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=COGNITO_CLIENT_ID,
            options={"verify_aud": True, "verify_at_hash": False},
        )
        if payload.get("token_use") != "id":
            return None
        return payload
    except (JWTError, httpx.HTTPError, KeyError) as e:
        print(f"[auth] Cognito verify failed: {e}")
        return None


def _verify_legacy_token(token: str) -> dict | None:
    """Verify legacy JWT. Returns payload dict with userId or None."""
    if not JWT_SECRET:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        return None


def cognito_email_from_payload(payload: dict) -> str | None:
    """
    Email for sync-profile: Cognito/Google use email; Microsoft often sends preferred_username or upn.
    """
    for key in ("email", "cognito:username"):
        v = payload.get(key)
        if isinstance(v, str) and "@" in v:
            return v.strip()
    for key in ("preferred_username", "upn"):
        v = payload.get(key)
        if isinstance(v, str) and "@" in v:
            return v.strip()
    return None


def get_cognito_token_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """
    Dependency for endpoints that need Cognito token before user exists in DB
    (e.g. sync-profile). Verifies Cognito Id token and returns payload.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access denied. No token provided.",
        )
    payload = _verify_cognito_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired Cognito token.",
        )
    return payload


def _lookup_user_by_cognito_sub(conn, cognito_sub: str) -> dict | None:
    """Lookup user by cognito_sub. Returns row dict or None."""
    with conn.cursor() as cur:
        cur.execute("SELECT user_id FROM users WHERE cognito_sub = %s", (cognito_sub,))
        row = cur.fetchone()
        return dict(row) if row else None


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    conn=Depends(get_db),
):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access denied. No token provided.",
        )
    token = credentials.credentials

    # Try Cognito first if configured
    cognito_payload = _verify_cognito_token(token)
    if cognito_payload:
        cognito_sub = cognito_payload.get("sub")
        if not cognito_sub:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Cognito token.")
        row = _lookup_user_by_cognito_sub(conn, cognito_sub)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found. Please complete your profile first.",
            )
        return {"userId": row["user_id"], "auth_type": "cognito"}

    # Fallback to legacy JWT
    legacy_payload = _verify_legacy_token(token)
    if legacy_payload and "userId" in legacy_payload:
        return {"userId": legacy_payload["userId"], "auth_type": "legacy"}

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid token.",
    )
