import os
import re
import random
import base64
import asyncio
import time
import traceback
import unicodedata
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import quote

import httpx
import resend
from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
import bcrypt
from jose import jwt
from openai import OpenAI
from dotenv import load_dotenv

from db import get_db
from auth import get_current_user, get_cognito_token_payload, cognito_email_from_payload
from story_generator import generate_content
from admin_api import router as admin_router

load_dotenv()

app = FastAPI()
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class NoCacheMiddleware(BaseHTTPMiddleware):
    """Evita caché del navegador/proxy para que el frontend siempre reciba datos frescos."""
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response


app.add_middleware(NoCacheMiddleware)

openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

AUDIOS_DIR = Path(__file__).parent / "audios"
AUDIOS_DIR.mkdir(exist_ok=True)

UPLOADS_DIR = Path(__file__).parent / "uploads"
PROFILES_DIR = UPLOADS_DIR / "profiles"
PROFILES_DIR.mkdir(parents=True, exist_ok=True)


# Pydantic models
class GenerateSentenceRequest(BaseModel):
    word: str


class TranslateSentenceRequest(BaseModel):
    sentence: str


class GenerateAudioRequest(BaseModel):
    sentence: str


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    username: str
    email: str
    password: str
    age: int | None = None
    gender: str | None = None
    country: str | None = None
    native_language: int
    learning_language: int


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateUserRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None
    email: str | None = None
    current_password: str | None = None  # Required when changing email
    password: str | None = None
    age: int | None = None
    gender: str | None = None
    country: str | None = None
    native_language_id: int | None = None
    learning_language_id: int | None = None
    profile_image: str | None = None  # base64 data URL (data:image/...;base64,...)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class CognitoSyncProfileRequest(BaseModel):
    """Profile data for first-time Cognito user creation."""
    first_name: str
    last_name: str
    username: str
    age: int | None = None
    gender: str | None = None
    country: str | None = None
    native_language: int
    learning_language: int


class CognitoOAuthExchangeRequest(BaseModel):
    """Authorization code + PKCE verifier from Cognito Hosted UI OAuth redirect."""

    code: str
    code_verifier: str
    redirect_uri: str


class GetImageUrlRequest(BaseModel):
    word: str
    vocabulary_id: int | None = None
    definition: str | None = None
    force_refresh: bool = False


class UpdateProgressRequest(BaseModel):
    wordId: int
    correct: bool


class PlacementAnswerIn(BaseModel):
    vocabulary_id: int
    selected_option: str = Field(..., max_length=8000)


class PlacementSubmitRequest(BaseModel):
    answers: list[PlacementAnswerIn]


class ReadingCompleteRequest(BaseModel):
    categoryId: int
    readingIndex: int
    quizScore: int | None = None


class ContactMessageRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., min_length=3, max_length=254)
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=10000)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        v = v.strip()
        if "@" not in v or len(v.split("@")) != 2:
            raise ValueError("Invalid email")
        return v


POINTS_PER_READING = 15
POINTS_PER_CORRECT = 5
POINTS_WORD_LEARNED = 20  # Bonus when word reaches Learned (4) or Known (5)
PLACEMENT_QUESTION_COUNT = 8

# Simple rate limit for public contact endpoint (IP -> list of unix times)
_contact_rate: dict[str, list[float]] = {}
CONTACT_RATE_WINDOW_SEC = 300
CONTACT_RATE_MAX = 8


def _contact_rate_check(ip: str) -> None:
    now = time.time()
    if ip not in _contact_rate:
        _contact_rate[ip] = []
    _contact_rate[ip] = [t for t in _contact_rate[ip] if now - t < CONTACT_RATE_WINDOW_SEC]
    if len(_contact_rate[ip]) >= CONTACT_RATE_MAX:
        raise HTTPException(429, "Too many messages. Try again later.")
    _contact_rate[ip].append(now)


def _contact_resend_configured() -> bool:
    """Envío vía API Resend (https://resend.com/docs/send-with-python). Sin SMTP."""
    return bool(
        os.environ.get("RESEND_API_KEY", "").strip()
        and os.environ.get("RESEND_FROM_EMAIL", "").strip()
        and os.environ.get("CONTACT_TO_EMAIL", "").strip()
    )


def _send_contact_resend(req: ContactMessageRequest) -> None:
    resend.api_key = os.environ["RESEND_API_KEY"].strip()
    to_addr = os.environ["CONTACT_TO_EMAIL"].strip()
    from_addr = os.environ["RESEND_FROM_EMAIL"].strip()
    text_body = (
        f"Nombre: {req.name}\n"
        f"Correo del visitante: {req.email}\n\n"
        f"Mensaje:\n{req.message}\n"
    )
    params = {
        "from": from_addr,
        "to": [to_addr],
        "subject": f"[LixyLearning] {req.subject}",
        "text": text_body,
        "reply_to": req.email.strip(),
    }
    resend.Emails.send(params)


def _execute_query(conn, query: str, params: tuple = ()):
    with conn.cursor() as cur:
        cur.execute(query, params)
        result = cur.fetchall() if cur.description else []
        conn.commit()
        return result


def _execute_query_one(conn, query: str, params: tuple = ()):
    rows = _execute_query(conn, query, params)
    return rows[0] if rows else None


# Routes


@app.get("/api/contact/status")
async def contact_status():
    """Indica si Resend está configurado para el formulario de contacto."""
    ok = _contact_resend_configured()
    return {"smtpConfigured": ok, "configured": ok}


@app.post("/api/contact")
async def contact_post(req: ContactMessageRequest, request: Request):
    """Recibe el mensaje del visitante y lo envía con la API Resend."""
    if not _contact_resend_configured():
        raise HTTPException(503, "Contact email is not configured on the server")
    ip = request.client.host if request.client else "unknown"
    _contact_rate_check(ip)
    try:
        await asyncio.to_thread(_send_contact_resend, req)
    except Exception as e:
        print(f"[contact] Resend error: {e!r}")
        traceback.print_exc()
        raise HTTPException(502, "Could not send message. Try again later.")
    return {"ok": True}


@app.post("/api/generate-sentence")
async def generate_sentence(
    req: GenerateSentenceRequest,
    user: dict = Depends(get_current_user),
):
    if not req.word:
        raise HTTPException(400, "Word is required")
    try:
        completion = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": f'Generate a simple sentence using the word "{req.word}" in English.'}
            ],
        )
        sentence = completion.choices[0].message.content
        return {"sentence": sentence}
    except Exception as e:
        raise HTTPException(500, "Error generating sentence")


@app.post("/api/translate-sentence")
async def translate_sentence(
    req: TranslateSentenceRequest,
    user: dict = Depends(get_current_user),
):
    if not req.sentence:
        raise HTTPException(400, "Sentence is required")
    try:
        completion = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": f'Translate the following sentence to Spanish: "{req.sentence}"'}
            ],
        )
        translated = completion.choices[0].message.content
        return {"translatedSentence": translated}
    except Exception as e:
        raise HTTPException(500, "Error translating sentence")


@app.post("/api/generate-audio")
async def generate_audio(
    req: GenerateAudioRequest,
    user: dict = Depends(get_current_user),
):
    if not req.sentence:
        raise HTTPException(400, "Sentence is required")
    try:
        url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={os.environ.get('GOOGLE_API_KEY')}"
        body = {
            "input": {"text": req.sentence},
            "voice": {
                "languageCode": "en-US",
                "name": "en-US-Standard-H",
                "ssmlGender": "MALE",
            },
            "audioConfig": {"audioEncoding": "MP3"},
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=body)
            data = response.json()
        if data.get("audioContent"):
            audio_bytes = base64.b64decode(data["audioContent"])
            filename = f"audio-{int(datetime.now().timestamp() * 1000)}.mp3"
            filepath = AUDIOS_DIR / filename
            filepath.write_bytes(audio_bytes)

            async def delete_later():
                await asyncio.sleep(60)
                try:
                    filepath.unlink(missing_ok=True)
                except Exception:
                    pass

            asyncio.create_task(delete_later())
            return {"audioUrl": f"/audios/{filename}"}
        raise HTTPException(500, "Error generating audio")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, "Internal server error")


app.mount("/audios", StaticFiles(directory=str(AUDIOS_DIR)), name="audios")
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.post("/register")
async def register(req: RegisterRequest, conn=Depends(get_db)):
    hashed = _hash_password(req.password)
    try:
        rows = _execute_query(
            conn,
            """INSERT INTO users (first_name, last_name, username, email, password_hash, age, gender, country, native_language_id, learning_language_id)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING user_id""",
            (
                req.first_name,
                req.last_name,
                req.username,
                req.email,
                hashed,
                req.age,
                req.gender,
                req.country,
                req.native_language,
                req.learning_language,
            ),
        )
        user_id = rows[0]["user_id"] if rows else None
        if not user_id:
            raise HTTPException(500, "Failed to create user")
        token = jwt.encode(
            {"userId": user_id, "exp": datetime.utcnow() + timedelta(hours=1)},
            os.environ.get("JWT_SECRET", ""),
            algorithm="HS256",
        )
        return {"token": token}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/user/profile")
async def get_profile(
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    row = _execute_query_one(
        conn,
        "SELECT user_id, email, first_name, last_name, username, age, gender, country, native_language_id, learning_language_id, profile_image_url FROM users WHERE user_id = %s",
        (user["userId"],),
    )
    if not row:
        raise HTTPException(404, "User not found")
    return dict(row)


@app.get("/user-details")
async def user_details(
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    row = _execute_query_one(
        conn,
        "SELECT username, email, COALESCE(points, 0) as points, profile_image_url FROM users WHERE user_id = %s",
        (user["userId"],),
    )
    if not row:
        raise HTTPException(404, "User not found")
    return dict(row)


def _save_profile_image(user_id: int, data_url: str) -> str | None:
    """Save base64 data URL to file. Returns path like 'profiles/123.jpg' or None."""
    if not data_url or not data_url.startswith("data:image/"):
        return None
    try:
        header, b64 = data_url.split(",", 1)
        ext = "jpg"
        if "png" in header:
            ext = "png"
        elif "gif" in header:
            ext = "gif"
        elif "webp" in header:
            ext = "webp"
        data = base64.b64decode(b64)
        path = PROFILES_DIR / f"{user_id}.{ext}"
        path.write_bytes(data)
        return f"profiles/{user_id}.{ext}"
    except Exception as e:
        print(f"[profile_image] base64 save failed: {e}")
        return None


@app.post("/api/upload-profile-image")
async def upload_profile_image(
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
    image: UploadFile = File(...),
):
    """Upload profile image via multipart form. More reliable than base64 in JSON."""
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    ext = "jpg"
    if "png" in (image.content_type or ""):
        ext = "png"
    elif "gif" in (image.content_type or ""):
        ext = "gif"
    elif "webp" in (image.content_type or ""):
        ext = "webp"
    try:
        data = await image.read()
        if len(data) > 5 * 1024 * 1024:  # 5MB max
            raise HTTPException(400, "Image too large (max 5MB)")
        path = PROFILES_DIR / f"{user['userId']}.{ext}"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        profile_image_url = f"profiles/{user['userId']}.{ext}"
        _execute_query(
            conn,
            "UPDATE users SET profile_image_url = %s WHERE user_id = %s",
            (profile_image_url, user["userId"]),
        )
        return {"profile_image_url": profile_image_url}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[profile_image] upload failed: {e}")
        raise HTTPException(500, "Failed to save profile image")


@app.put("/api/update-user")
async def update_user(
    req: UpdateUserRequest,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    current = _execute_query_one(conn, "SELECT * FROM users WHERE user_id = %s", (user["userId"],))
    if not current:
        raise HTTPException(404, "User not found")
    email = req.email if req.email is not None else current["email"]
    if email != current["email"]:
        if not req.current_password:
            raise HTTPException(400, "Current password is required to change email")
        if current.get("cognito_sub") and not current.get("password_hash"):
            raise HTTPException(400, "Cognito users cannot change email through this form")
        if not _verify_password(req.current_password, current["password_hash"] or ""):
            raise HTTPException(401, "Current password is incorrect")
    hashed = None
    if req.password:
        hashed = _hash_password(req.password)
    first_name = req.first_name if req.first_name is not None else current["first_name"]
    last_name = req.last_name if req.last_name is not None else current["last_name"]
    username = req.username if req.username is not None else current["username"]
    age = req.age if req.age is not None else current["age"]
    gender = req.gender if req.gender is not None else current["gender"]
    country = req.country if req.country is not None else current["country"]
    native_language_id = req.native_language_id if req.native_language_id is not None else current["native_language_id"]
    learning_language_id = req.learning_language_id if req.learning_language_id is not None else current["learning_language_id"]

    profile_image_url = current.get("profile_image_url")
    if req.profile_image:
        saved = _save_profile_image(user["userId"], req.profile_image)
        if saved:
            profile_image_url = saved

    try:
        _execute_query(
            conn,
            """UPDATE users SET email = %s, first_name = %s, last_name = %s, age = %s, gender = %s, country = %s,
               native_language_id = %s, learning_language_id = %s, password_hash = COALESCE(%s, password_hash), username = %s,
               profile_image_url = COALESCE(%s, profile_image_url)
               WHERE user_id = %s""",
            (email, first_name, last_name, age, gender, country, native_language_id, learning_language_id, hashed, username, profile_image_url, user["userId"]),
        )
        row = _execute_query_one(conn, "SELECT * FROM users WHERE user_id = %s", (user["userId"],))
        return dict(row) if row else {}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/change-password")
async def change_password(
    req: ChangePasswordRequest,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Change password. Requires current password verification."""
    if len(req.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    current = _execute_query_one(conn, "SELECT password_hash, cognito_sub FROM users WHERE user_id = %s", (user["userId"],))
    if not current:
        raise HTTPException(404, "User not found")
    if current.get("cognito_sub") and not current.get("password_hash"):
        raise HTTPException(400, "Cognito users must change password in Cognito")
    if not _verify_password(req.current_password, current["password_hash"] or ""):
        raise HTTPException(401, "Current password is incorrect")
    hashed = _hash_password(req.new_password)
    _execute_query(
        conn,
        "UPDATE users SET password_hash = %s WHERE user_id = %s",
        (hashed, user["userId"]),
    )
    return {"message": "Password updated successfully"}


@app.post("/login")
async def login(req: LoginRequest, conn=Depends(get_db)):
    row = _execute_query_one(conn, "SELECT * FROM users WHERE email = %s", (req.email,))
    if not row or not row.get("password_hash") or not _verify_password(req.password, row["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = jwt.encode(
        {"userId": row["user_id"], "exp": datetime.utcnow() + timedelta(hours=1)},
        os.environ.get("JWT_SECRET", ""),
        algorithm="HS256",
    )
    return {"token": token}


@app.post("/api/cognito/oauth-exchange")
async def cognito_oauth_exchange(req: CognitoOAuthExchangeRequest):
    """
    Exchange Cognito Hosted UI authorization code for tokens (public client + PKCE).
    Redirect URI must match the app client callback URL and COGNITO_OAUTH_REDIRECT_URI.
    """
    domain_prefix = (os.environ.get("COGNITO_DOMAIN") or "").strip()
    region = (os.environ.get("COGNITO_REGION") or "").strip()
    client_id = (os.environ.get("COGNITO_CLIENT_ID") or "").strip()
    expected_redirect = (os.environ.get("COGNITO_OAUTH_REDIRECT_URI") or "").strip()
    if not domain_prefix or not region or not client_id or not expected_redirect:
        raise HTTPException(503, "OAuth is not configured (missing COGNITO_DOMAIN, COGNITO_REGION, COGNITO_CLIENT_ID, or COGNITO_OAUTH_REDIRECT_URI)")
    if req.redirect_uri != expected_redirect:
        raise HTTPException(400, "redirect_uri does not match server configuration")

    token_url = f"https://{domain_prefix}.auth.{region}.amazoncognito.com/oauth2/token"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                token_url,
                data={
                    "grant_type": "authorization_code",
                    "client_id": client_id,
                    "code": req.code,
                    "redirect_uri": req.redirect_uri,
                    "code_verifier": req.code_verifier,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=20.0,
            )
        except httpx.HTTPError as e:
            raise HTTPException(502, f"Token endpoint error: {e}") from e

    try:
        body = resp.json()
    except Exception:
        raise HTTPException(502, "Invalid response from Cognito token endpoint")

    if resp.status_code != 200:
        err = body.get("error", "unknown_error")
        desc = body.get("error_description", "")
        raise HTTPException(400, f"Cognito OAuth error: {err} {desc}".strip())

    id_token = body.get("id_token")
    if not id_token:
        raise HTTPException(502, "Cognito did not return id_token")
    return {"id_token": id_token}


@app.post("/api/cognito/sync-profile")
async def cognito_sync_profile(
    req: CognitoSyncProfileRequest,
    cognito_payload: dict = Depends(get_cognito_token_payload),
    conn=Depends(get_db),
):
    """
    Create or update app user linked to Cognito identity.
    Call this after Cognito sign-in with the Id Token.
    For new users, profile data is required. For existing users, updates are optional.
    """
    cognito_sub = cognito_payload.get("sub")
    email = cognito_email_from_payload(cognito_payload)
    if not cognito_sub or not email:
        raise HTTPException(400, "Invalid Cognito token: missing sub or email")

    existing_by_sub = _execute_query_one(conn, "SELECT user_id FROM users WHERE cognito_sub = %s", (cognito_sub,))
    if existing_by_sub:
        return {
            "message": "Profile already synced",
            "userId": existing_by_sub["user_id"],
            "isNewUser": False,
        }

    existing_by_email = _execute_query_one(conn, "SELECT user_id FROM users WHERE email = %s", (email,))
    if existing_by_email:
        _execute_query(conn, "UPDATE users SET cognito_sub = %s WHERE user_id = %s", (cognito_sub, existing_by_email["user_id"]))
        return {
            "message": "Profile linked to Cognito",
            "userId": existing_by_email["user_id"],
            "isNewUser": False,
        }

    rows = _execute_query(
        conn,
        """INSERT INTO users (
            username, email, first_name, last_name, cognito_sub,
            age, gender, country, native_language_id, learning_language_id
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING user_id""",
        (
            req.username,
            email,
            req.first_name,
            req.last_name,
            cognito_sub,
            req.age,
            req.gender,
            req.country,
            req.native_language,
            req.learning_language,
        ),
    )
    user_id = rows[0]["user_id"] if rows else None
    return {"message": "Profile synced", "userId": user_id, "isNewUser": True}


@app.get("/languages")
async def get_languages(conn=Depends(get_db)):
    rows = _execute_query(conn, "SELECT language_id, language_name FROM languages")
    return list(rows)


@app.get("/api/vocabulary/{category_id}")
async def get_vocabulary(
    category_id: int,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    rows = _execute_query(
        conn,
        "SELECT * FROM vocabulary WHERE category_id = %s",
        (category_id,),
    )
    return list(rows)


@app.get("/api/categories")
async def get_categories(
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    rows = _execute_query(conn, "SELECT category_id, category_name FROM categories")
    return list(rows)


@app.get("/api/generate-content")
async def api_generate_content(
    words: str,
    categoryId: int,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    cat = _execute_query_one(
        conn,
        "SELECT category_name FROM categories WHERE category_id = %s",
        (categoryId,),
    )
    if not cat:
        raise HTTPException(404, "Category not found")
    words_list = [w.strip() for w in words.split(",") if w.strip()]
    result = await generate_content(words_list, cat["category_name"])
    return result


async def _check_image_url(url: str) -> bool:
    try:
        async with httpx.AsyncClient() as client:
            r = await client.head(url)
            return r.status_code == 200
    except Exception:
        return False


_PIXABAY_STOPWORDS = frozenset(
    """
    the a an of to in on for and or is are was were be been being with by from as at
    this that these those it its we you they he she them their our your my me i
    un una uno el la los las lo al del de en por para con sin sobre entre hacia
    que quien cual como cuando donde cuanto muy mas menos tambien tampoco pero
    y o a se es son ser ha han haber hay sea sido si no ni ya
    """.split()
)


def _fold_accents(s: str) -> str:
    if not s:
        return ""
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    )


def _definition_keywords(definition: str | None, max_words: int = 5) -> list[str]:
    if not definition or not definition.strip():
        return []
    raw = re.findall(r"[A-Za-zÀ-ÿ']+", definition.lower())
    seen: set[str] = set()
    out: list[str] = []
    for tok in raw:
        tok = tok.strip("'")
        if len(tok) < 3 or tok in _PIXABAY_STOPWORDS:
            continue
        if tok in seen:
            continue
        seen.add(tok)
        out.append(tok)
    out.sort(key=len, reverse=True)
    return out[:max_words]


def _pixabay_q_variants(word: str, definition: str | None) -> list[str]:
    w = re.sub(r"[^\w\sÀ-ÿ'-]", "", word, flags=re.UNICODE).strip()
    if not w:
        w = (word or "").strip()
    w = w[:80]
    keys = _definition_keywords(definition)
    variants: list[str] = []
    if keys:
        combo = f"{w} {' '.join(keys)}".strip()
        if len(combo) <= 100:
            variants.append(combo)
        if len(keys) >= 2:
            combo2 = f"{w} {keys[0]} {keys[1]}".strip()
            if combo2 not in variants and len(combo2) <= 100:
                variants.append(combo2)
        if len(keys) >= 1:
            combo3 = f"{w} {keys[0]}".strip()
            if combo3 not in variants and len(combo3) <= 100:
                variants.append(combo3)
    if w:
        variants.append(w[:100])
    seen: set[str] = set()
    ordered: list[str] = []
    for v in variants:
        v = v.strip()
        if v and v not in seen:
            seen.add(v)
            ordered.append(v)
    if not ordered:
        ordered = [(word or "").strip()[:100] or "photo"]
    return ordered


def _pixabay_tag_tokens(tags_str: str) -> set[str]:
    s = _fold_accents((tags_str or "").lower())
    tokens: set[str] = set()
    for part in re.split(r"[,;]+", s):
        for t in part.split():
            t = re.sub(r"[^\w-]", "", t)
            if len(t) >= 2:
                tokens.add(t)
    return tokens


def _pixabay_score_hit(hit: dict, w_fold: str, def_keys: list[str]) -> tuple[int, int]:
    tag_tok = _pixabay_tag_tokens(hit.get("tags") or "")
    score = 0
    if w_fold and w_fold in tag_tok:
        score += 14
    elif w_fold and len(w_fold) >= 4:
        for tt in tag_tok:
            if w_fold == tt or (len(tt) >= 4 and (w_fold in tt or tt in w_fold)):
                score += 6
                break
    for k in def_keys:
        kf = _fold_accents(k.lower())
        if not kf:
            continue
        if kf in tag_tok:
            score += 5
        elif len(kf) >= 4 and any(len(tt) >= 4 and (kf in tt or tt in kf) for tt in tag_tok):
            score += 2
    likes = int(hit.get("likes") or 0)
    return (score, likes)


def _pick_best_pixabay_hit(hits: list[dict], word: str, def_keys: list[str]) -> dict | None:
    if not hits:
        return None
    w_fold = _fold_accents(word.strip().lower())
    best = max(hits, key=lambda h: _pixabay_score_hit(h, w_fold, def_keys))
    return best


async def _pixabay_best_image_url(
    client: httpx.AsyncClient, api_key: str, word: str, definition: str | None
) -> str | None:
    def_keys = _definition_keywords(definition)
    best_hit: dict | None = None
    best_key: tuple[int, int] = (-1, -1)
    for qstr in _pixabay_q_variants(word, definition):
        url = (
            f"https://pixabay.com/api/?key={api_key}&q={quote(qstr)}"
            "&image_type=photo&per_page=40&safesearch=true"
        )
        r = await client.get(url)
        if r.status_code != 200:
            continue
        data = r.json()
        hits = data.get("hits") or []
        if not hits:
            continue
        candidate = _pick_best_pixabay_hit(hits, word, def_keys)
        if not candidate:
            continue
        sc = _pixabay_score_hit(candidate, _fold_accents(word.strip().lower()), def_keys)
        if sc > best_key or (sc == best_key and best_hit is None):
            best_key = sc
            best_hit = candidate
        if sc[0] >= 10:
            break
    if not best_hit:
        return None
    return best_hit.get("webformatURL") or best_hit.get("largeImageURL")


@app.post("/api/get-image-url")
async def get_image_url(
    req: GetImageUrlRequest,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    word = (req.word or "").strip()
    if not word:
        raise HTTPException(400, "Word is required")
    vid = req.vocabulary_id
    if not req.force_refresh:
        if vid is not None:
            row = _execute_query_one(
                conn,
                "SELECT image_url FROM vocabulary WHERE vocabulary_id = %s",
                (vid,),
            )
        else:
            row = _execute_query_one(
                conn,
                "SELECT image_url FROM vocabulary WHERE word = %s LIMIT 1",
                (word,),
            )
        if row and row.get("image_url"):
            if await _check_image_url(row["image_url"]):
                return {"imageUrl": row["image_url"]}
    api_key = os.environ.get("PIXABAY_API_KEY")
    if not api_key:
        raise HTTPException(500, "Image search not configured. Add PIXABAY_API_KEY to .env")
    definition = (req.definition or "").strip() or None
    if not definition:
        if vid is not None:
            row_def = _execute_query_one(
                conn,
                "SELECT definition FROM vocabulary WHERE vocabulary_id = %s",
                (vid,),
            )
        else:
            row_def = _execute_query_one(
                conn,
                "SELECT definition FROM vocabulary WHERE word = %s LIMIT 1",
                (word,),
            )
        if row_def and row_def.get("definition"):
            definition = (row_def["definition"] or "").strip() or None
    async with httpx.AsyncClient(timeout=20.0) as client:
        url = await _pixabay_best_image_url(client, api_key, word, definition)
    if url:
        if vid is not None:
            _execute_query(
                conn,
                "UPDATE vocabulary SET image_url = %s WHERE vocabulary_id = %s",
                (url, vid),
            )
        else:
            _execute_query(
                conn,
                "UPDATE vocabulary SET image_url = %s WHERE word = %s",
                (url, word),
            )
        return {"imageUrl": url}
    raise HTTPException(404, "No image found for the word")


def _calculate_next_review_date(familiarity_level_id: int, base: datetime | None = None) -> datetime:
    ref = base if base is not None else datetime.utcnow()
    days = {1: 1, 2: 2, 3: 5, 4: 7, 5: 14}.get(familiarity_level_id, 1)
    return ref + timedelta(days=days)


def _norm_def(s: str | None) -> str:
    if not s:
        return ""
    return " ".join(s.split()).strip().lower()


def _apply_single_progress_update(
    conn,
    user_id: int,
    word_id: int,
    correct: bool,
    *,
    last_reviewed_at: datetime | None = None,
) -> int:
    """Upserts familiarity for one word like flashcard progress. Returns points earned."""
    ref = last_reviewed_at if last_reviewed_at is not None else datetime.utcnow()
    progress = _execute_query_one(
        conn,
        "SELECT familiarity_level_id, correct_answers, incorrect_answers FROM familiarity WHERE user_id = %s AND word_id = %s",
        (user_id, word_id),
    )
    if not progress:
        fid, ca, ia = 1, (1 if correct else 0), (0 if correct else 1)
        next_date = _calculate_next_review_date(fid, base=ref)
        _execute_query(
            conn,
            """INSERT INTO familiarity (user_id, word_id, familiarity_level_id, correct_answers, incorrect_answers, last_reviewed, next_review_date)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (user_id, word_id, fid, ca, ia, ref, next_date),
        )
        points_earned = POINTS_PER_CORRECT if correct else 0
        if points_earned > 0:
            _award_points(conn, user_id, points_earned)
        return points_earned
    fid = progress["familiarity_level_id"]
    ca = progress["correct_answers"] + (1 if correct else 0)
    ia = progress["incorrect_answers"] + (0 if correct else 1)
    old_fid = fid
    if correct:
        if fid == 1 and ca >= 1:
            fid = 2
        elif fid == 2 and ca >= 3:
            fid = 3
        elif fid == 3 and ca >= 5:
            fid = 4
        elif fid == 4 and ca >= 7:
            fid = 5
    else:
        if fid > 1:
            fid = 2
    next_date = _calculate_next_review_date(fid, base=ref)
    _execute_query(
        conn,
        """UPDATE familiarity SET familiarity_level_id = %s, correct_answers = %s, incorrect_answers = %s, last_reviewed = %s, next_review_date = %s
           WHERE user_id = %s AND word_id = %s""",
        (fid, ca, ia, ref, next_date, user_id, word_id),
    )
    points_earned = POINTS_PER_CORRECT if correct else 0
    if correct and fid >= 4 and old_fid < 4:
        points_earned += POINTS_WORD_LEARNED
    if points_earned > 0:
        _award_points(conn, user_id, points_earned)
    return points_earned


def _award_points(conn, user_id: int, points: int):
    try:
        _execute_query(
            conn,
            "UPDATE users SET points = COALESCE(points, 0) + %s WHERE user_id = %s",
            (points, user_id),
        )
    except Exception:
        pass  # Graceful: points column may not exist yet


def _award_streak_badges(conn, user_id: int, current_streak: int) -> list:
    """Award badges for streak milestones. Returns list of newly earned badges."""
    new_badges = []
    try:
        badges = _execute_query(
            conn,
            "SELECT badge_id, badge_key, name_es, description_es, required_streak, icon_name FROM badges WHERE required_streak <= %s ORDER BY required_streak DESC",
            (current_streak,),
        )
        for b in badges:
            existing = _execute_query_one(
                conn,
                "SELECT 1 FROM user_badges WHERE user_id = %s AND badge_id = %s",
                (user_id, b["badge_id"]),
            )
            if not existing:
                _execute_query(
                    conn,
                    "INSERT INTO user_badges (user_id, badge_id) VALUES (%s, %s)",
                    (user_id, b["badge_id"]),
                )
                new_badges.append(dict(b))
    except Exception:
        pass
    return new_badges


@app.get("/api/next-session")
async def next_session(
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    rows = _execute_query(
        conn,
        """SELECT v.word, f.familiarity_level_id, f.next_review_date
           FROM vocabulary v JOIN familiarity f ON v.vocabulary_id = f.word_id
           WHERE f.user_id = %s AND f.next_review_date <= NOW()
           ORDER BY f.next_review_date ASC LIMIT 10""",
        (user["userId"],),
    )
    return [dict(r) for r in rows]


@app.post("/api/update-progress")
async def update_progress(
    req: UpdateProgressRequest,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    points_earned = _apply_single_progress_update(conn, user["userId"], req.wordId, req.correct)
    return {"message": "Progress updated successfully", "pointsEarned": points_earned}


@app.get("/api/placement/status")
async def placement_status(
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    row = _execute_query_one(
        conn,
        "SELECT COUNT(*)::int AS c FROM familiarity WHERE user_id = %s",
        (user["userId"],),
    )
    c = int(row["c"]) if row else 0
    return {"needsPlacement": c == 0}


@app.get("/api/placement/quiz")
async def placement_quiz(
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    count_row = _execute_query_one(
        conn,
        "SELECT COUNT(*)::int AS c FROM familiarity WHERE user_id = %s",
        (user["userId"],),
    )
    if not count_row or int(count_row["c"]) > 0:
        raise HTTPException(400, "Placement already completed")

    rows = _execute_query(
        conn,
        """SELECT vocabulary_id, word, definition FROM vocabulary
           WHERE definition IS NOT NULL AND TRIM(definition) <> ''
           ORDER BY RANDOM() LIMIT %s""",
        (PLACEMENT_QUESTION_COUNT,),
    )
    if len(rows) < PLACEMENT_QUESTION_COUNT:
        raise HTTPException(503, "Not enough vocabulary for placement quiz")

    questions: list[dict] = []
    for r in rows:
        vid = r["vocabulary_id"]
        word = r["word"]
        correct = (r["definition"] or "").strip()
        wrong_pool = _execute_query(
            conn,
            """SELECT definition FROM vocabulary
               WHERE vocabulary_id <> %s AND definition IS NOT NULL AND TRIM(definition) <> ''
               ORDER BY RANDOM() LIMIT 40""",
            (vid,),
        )
        wrongs: list[str] = []
        seen = {_norm_def(correct)}
        for w in wrong_pool:
            d = (w["definition"] or "").strip()
            nd = _norm_def(d)
            if nd and nd not in seen:
                wrongs.append(d)
                seen.add(nd)
            if len(wrongs) >= 3:
                break
        if len(wrongs) < 3:
            raise HTTPException(503, "Not enough distractor definitions for placement quiz")
        options = [correct] + wrongs[:3]
        random.shuffle(options)
        questions.append({"vocabularyId": int(vid), "word": word, "options": options})
    return {"questions": questions}


@app.post("/api/placement/submit")
async def placement_submit(
    req: PlacementSubmitRequest,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if len(req.answers) != PLACEMENT_QUESTION_COUNT:
        raise HTTPException(400, f"Expected {PLACEMENT_QUESTION_COUNT} answers")

    count_row = _execute_query_one(
        conn,
        "SELECT COUNT(*)::int AS c FROM familiarity WHERE user_id = %s",
        (user["userId"],),
    )
    if not count_row or int(count_row["c"]) > 0:
        raise HTTPException(400, "Placement already completed")

    seen_ids: set[int] = set()
    correct_total = 0
    for i, ans in enumerate(req.answers):
        if ans.vocabulary_id in seen_ids:
            raise HTTPException(400, "Duplicate vocabulary_id in answers")
        seen_ids.add(ans.vocabulary_id)
        row = _execute_query_one(
            conn,
            "SELECT definition FROM vocabulary WHERE vocabulary_id = %s",
            (ans.vocabulary_id,),
        )
        if not row:
            raise HTTPException(400, "Invalid vocabulary_id")
        actual = (row["definition"] or "").strip()
        ok = _norm_def(ans.selected_option) == _norm_def(actual)
        if ok:
            correct_total += 1
        ref = datetime.utcnow() - timedelta(days=(i % 8))
        _apply_single_progress_update(conn, user["userId"], ans.vocabulary_id, ok, last_reviewed_at=ref)

    return {
        "message": "Placement recorded",
        "correctCount": correct_total,
        "questionCount": PLACEMENT_QUESTION_COUNT,
    }


@app.get("/api/daily-words/{category_id}")
async def daily_words(
    category_id: int,
    limit: int = 20,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    limit = min(max(limit, 1), 100)
    rows = _execute_query(
        conn,
        """SELECT v.* FROM vocabulary v JOIN familiarity f ON v.vocabulary_id = f.word_id
           WHERE f.user_id = %s AND v.category_id = %s AND f.next_review_date <= NOW()
           ORDER BY f.next_review_date ASC LIMIT %s""",
        (user["userId"], category_id, limit),
    )
    result = [dict(r) for r in rows]
    if len(result) < limit:
        extra = _execute_query(
            conn,
            """SELECT v.* FROM vocabulary v
               LEFT JOIN familiarity f ON v.vocabulary_id = f.word_id AND f.user_id = %s
               WHERE v.category_id = %s AND f.word_id IS NULL LIMIT %s""",
            (user["userId"], category_id, limit - len(result)),
        )
        result.extend([dict(r) for r in extra])
    return result


@app.post("/api/daily-streak")
async def daily_streak(
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    # Use local time (not UTC) to avoid streak dates shifting to next day in some timezones
    now = datetime.now()
    today = now.date().isoformat()
    yesterday = (now - timedelta(days=1)).date().isoformat()
    yesterday_row = _execute_query_one(
        conn,
        "SELECT current_streak FROM daily_streaks WHERE user_id = %s AND streak_date = %s",
        (user["userId"], yesterday),
    )
    new_current = 1
    if yesterday_row:
        new_current = yesterday_row["current_streak"] + 1
    longest_row = _execute_query_one(
        conn,
        "SELECT longest_streak FROM daily_streaks WHERE user_id = %s ORDER BY longest_streak DESC LIMIT 1",
        (user["userId"],),
    )
    new_longest = longest_row["longest_streak"] if longest_row else 0
    if new_current > new_longest:
        new_longest = new_current
    existing = _execute_query_one(
        conn,
        "SELECT * FROM daily_streaks WHERE user_id = %s AND streak_date = %s",
        (user["userId"], today),
    )
    if existing:
        _execute_query(
            conn,
            "UPDATE daily_streaks SET current_streak = %s, longest_streak = %s WHERE user_id = %s AND streak_date = %s",
            (new_current, new_longest, user["userId"], today),
        )
    else:
        _execute_query(
            conn,
            "INSERT INTO daily_streaks (user_id, streak_date, current_streak, longest_streak) VALUES (%s, %s, %s, %s)",
            (user["userId"], today, new_current, new_longest),
        )
    new_badges = _award_streak_badges(conn, user["userId"], new_current)
    return {
        "message": "Racha diaria actualizada",
        "currentStreak": new_current,
        "longestStreak": new_longest,
        "newBadges": new_badges,
    }


@app.post("/api/streaks")
@app.post("/api/streaks/")
async def get_streaks(
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    # Use local time (not UTC) to avoid streak dates shifting to next day in some timezones
    now = datetime.now()
    today = now.date().isoformat()
    yesterday = (now - timedelta(days=1)).date().isoformat()
    rows = _execute_query(
        conn,
        "SELECT streak_date, current_streak FROM daily_streaks WHERE user_id = %s AND (streak_date = %s OR streak_date = %s) ORDER BY streak_date DESC LIMIT 1",
        (user["userId"], today, yesterday),
    )
    if not rows:
        return []
    current_streak = rows[0]["current_streak"]
    last_streak_date = rows[0]["streak_date"]
    # Use streak_date from DB as the last day of the streak (not "today")
    dates = []
    for i in range(current_streak):
        d = (last_streak_date - timedelta(days=i)).isoformat()
        dates.append(d)
    return dates


@app.post("/api/reading-complete")
async def reading_complete(
    req: ReadingCompleteRequest,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Record a completed reading session and award points."""
    existing = _execute_query_one(
        conn,
        "SELECT 1 FROM reading_sessions WHERE user_id = %s AND category_id = %s AND reading_index = %s",
        (user["userId"], req.categoryId, req.readingIndex),
    )
    if existing:
        return {"message": "Reading already recorded", "pointsEarned": 0}
    try:
        _execute_query(
            conn,
            "INSERT INTO reading_sessions (user_id, category_id, reading_index, quiz_score) VALUES (%s, %s, %s, %s)",
            (user["userId"], req.categoryId, req.readingIndex, req.quizScore),
        )
        _award_points(conn, user["userId"], POINTS_PER_READING)
        return {"message": "Reading recorded", "pointsEarned": POINTS_PER_READING}
    except Exception:
        return {"message": "Error recording reading", "pointsEarned": 0}


@app.get("/api/gamification")
async def get_gamification(
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Returns points, words learned, streaks, and badges for gamification UI."""
    user_row = _execute_query_one(
        conn,
        "SELECT COALESCE(points, 0) as points FROM users WHERE user_id = %s",
        (user["userId"],),
    )
    points = user_row["points"] if user_row else 0

    readings_row = _execute_query_one(
        conn,
        "SELECT COUNT(*) as count FROM reading_sessions WHERE user_id = %s",
        (user["userId"],),
    )
    readings_completed = readings_row["count"] if readings_row else 0

    today = datetime.utcnow().date().isoformat()
    yesterday = (datetime.utcnow() - timedelta(days=1)).date().isoformat()
    streak_row = _execute_query_one(
        conn,
        "SELECT current_streak FROM daily_streaks WHERE user_id = %s AND (streak_date = %s OR streak_date = %s) ORDER BY streak_date DESC LIMIT 1",
        (user["userId"], today, yesterday),
    )
    longest_row = _execute_query_one(
        conn,
        "SELECT COALESCE(MAX(longest_streak), 0) as longest_streak FROM daily_streaks WHERE user_id = %s",
        (user["userId"],),
    )
    current_streak = streak_row["current_streak"] if streak_row else 0
    longest_streak = longest_row["longest_streak"] if longest_row else 0

    badges_rows = _execute_query(
        conn,
        """SELECT b.badge_id, b.badge_key, b.name_es, b.description_es, b.required_streak, b.icon_name, ub.earned_at
           FROM user_badges ub JOIN badges b ON ub.badge_id = b.badge_id
           WHERE ub.user_id = %s ORDER BY b.required_streak ASC""",
        (user["userId"],),
    )
    badges = [dict(r) for r in badges_rows] if badges_rows else []

    return {
        "points": points,
        "readingsCompleted": readings_completed,
        "currentStreak": current_streak,
        "longestStreak": longest_streak,
        "badges": badges,
    }


@app.get("/api/dashboard/difficulty")
async def get_dashboard_difficulty(
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Returns word counts by difficulty (easy=levels 1-2, medium=3, hard=4-5)."""
    rows = _execute_query(
        conn,
        """SELECT familiarity_level_id, COUNT(*) as count
           FROM familiarity WHERE user_id = %s GROUP BY familiarity_level_id""",
        (user["userId"],),
    )
    by_level = {r["familiarity_level_id"]: int(r["count"]) for r in rows}
    return {
        "easy": (by_level.get(1, 0) + by_level.get(2, 0)),
        "medium": by_level.get(3, 0),
        "hard": (by_level.get(4, 0) + by_level.get(5, 0)),
    }


@app.get("/api/dashboard/upcoming-reviews")
async def get_dashboard_upcoming_reviews(
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Returns counts of words due for review: today, tomorrow, next week."""
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    tomorrow_end = today_start + timedelta(days=2)
    next_week_end = today_start + timedelta(days=7)

    today_rows = _execute_query(
        conn,
        """SELECT COUNT(*) as count FROM familiarity
           WHERE user_id = %s AND next_review_date IS NOT NULL AND next_review_date < %s""",
        (user["userId"], today_end),
    )
    tomorrow_rows = _execute_query(
        conn,
        """SELECT COUNT(*) as count FROM familiarity
           WHERE user_id = %s AND next_review_date >= %s AND next_review_date < %s""",
        (user["userId"], today_end, tomorrow_end),
    )
    next_week_rows = _execute_query(
        conn,
        """SELECT COUNT(*) as count FROM familiarity
           WHERE user_id = %s AND next_review_date >= %s AND next_review_date < %s""",
        (user["userId"], tomorrow_end, next_week_end),
    )

    total_today = int(today_rows[0]["count"]) if today_rows else 0
    total_tomorrow = int(tomorrow_rows[0]["count"]) if tomorrow_rows else 0
    total_next_week = int(next_week_rows[0]["count"]) if next_week_rows else 0

    max_count = max(total_today, total_tomorrow, total_next_week, 1)
    return {
        "today": {"count": total_today, "percent": round((total_today / max_count) * 100)},
        "tomorrow": {"count": total_tomorrow, "percent": round((total_tomorrow / max_count) * 100)},
        "nextWeek": {"count": total_next_week, "percent": round((total_next_week / max_count) * 100)},
    }


@app.get("/api/dashboard/progress")
async def get_dashboard_progress(
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Returns review counts per day of week (Mon-Sun) for the last 28 days.
    Converts timestamps to America/Mexico_City so the day matches when the user practiced."""
    rows = _execute_query(
        conn,
        """SELECT EXTRACT(DOW FROM (
               last_reviewed AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City'
           ))::int as dow, COUNT(*) as count
           FROM familiarity
           WHERE user_id = %s AND last_reviewed >= NOW() - INTERVAL '28 days'
           GROUP BY EXTRACT(DOW FROM (
               last_reviewed AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City'
           ))""",
        (user["userId"],),
    )
    by_dow = {int(r["dow"]): int(r["count"]) for r in rows}
    # DOW: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    # Chart order: Mon, Tue, Wed, Thu, Fri, Sat, Sun
    return {
        "mon": by_dow.get(1, 0),
        "tue": by_dow.get(2, 0),
        "wed": by_dow.get(3, 0),
        "thu": by_dow.get(4, 0),
        "fri": by_dow.get(5, 0),
        "sat": by_dow.get(6, 0),
        "sun": by_dow.get(0, 0),
    }


@app.get("/api/dashboard/weak-words")
async def get_dashboard_weak_words(
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Returns words the user has struggled with (high incorrect_answers, low familiarity)."""
    rows = _execute_query(
        conn,
        """SELECT v.word, v.definition
           FROM vocabulary v
           JOIN familiarity f ON v.vocabulary_id = f.word_id
           WHERE f.user_id = %s
           ORDER BY f.incorrect_answers DESC, f.familiarity_level_id ASC
           LIMIT 10""",
        (user["userId"],),
    )
    return [{"word": r["word"], "translation": r["definition"] or r["word"]} for r in rows]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
