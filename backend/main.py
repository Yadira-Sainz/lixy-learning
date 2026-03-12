import os
import base64
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import quote

import httpx
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import bcrypt
from jose import jwt
from openai import OpenAI
from dotenv import load_dotenv

from db import get_db
from auth import get_current_user
from story_generator import generate_content

load_dotenv()

app = FastAPI()

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
    password: str | None = None
    age: int | None = None
    gender: str | None = None
    country: str | None = None
    native_language_id: int | None = None
    learning_language_id: int | None = None


class GetImageUrlRequest(BaseModel):
    word: str


class UpdateProgressRequest(BaseModel):
    wordId: int
    correct: bool


class ReadingCompleteRequest(BaseModel):
    categoryId: int
    readingIndex: int
    quizScore: int | None = None


POINTS_PER_READING = 15


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
        "SELECT user_id, email, first_name, last_name, username, age, gender, country, native_language_id, learning_language_id FROM users WHERE user_id = %s",
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
        "SELECT username, email, COALESCE(points, 0) as points FROM users WHERE user_id = %s",
        (user["userId"],),
    )
    if not row:
        raise HTTPException(404, "User not found")
    return dict(row)


@app.put("/api/update-user")
async def update_user(
    req: UpdateUserRequest,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    current = _execute_query_one(conn, "SELECT * FROM users WHERE user_id = %s", (user["userId"],))
    if not current:
        raise HTTPException(404, "User not found")
    hashed = None
    if req.password:
        hashed = _hash_password(req.password)
    email = req.email if req.email is not None else current["email"]
    first_name = req.first_name if req.first_name is not None else current["first_name"]
    last_name = req.last_name if req.last_name is not None else current["last_name"]
    username = req.username if req.username is not None else current["username"]
    age = req.age if req.age is not None else current["age"]
    gender = req.gender if req.gender is not None else current["gender"]
    country = req.country if req.country is not None else current["country"]
    native_language_id = req.native_language_id if req.native_language_id is not None else current["native_language_id"]
    learning_language_id = req.learning_language_id if req.learning_language_id is not None else current["learning_language_id"]
    try:
        _execute_query(
            conn,
            """UPDATE users SET email = %s, first_name = %s, last_name = %s, age = %s, gender = %s, country = %s,
               native_language_id = %s, learning_language_id = %s, password_hash = COALESCE(%s, password_hash), username = %s
               WHERE user_id = %s""",
            (email, first_name, last_name, age, gender, country, native_language_id, learning_language_id, hashed, username, user["userId"]),
        )
        row = _execute_query_one(conn, "SELECT * FROM users WHERE user_id = %s", (user["userId"],))
        return dict(row) if row else {}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/login")
async def login(req: LoginRequest, conn=Depends(get_db)):
    row = _execute_query_one(conn, "SELECT * FROM users WHERE email = %s", (req.email,))
    if not row or not _verify_password(req.password, row["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = jwt.encode(
        {"userId": row["user_id"], "exp": datetime.utcnow() + timedelta(hours=1)},
        os.environ.get("JWT_SECRET", ""),
        algorithm="HS256",
    )
    return {"token": token}


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


@app.post("/api/get-image-url")
async def get_image_url(
    req: GetImageUrlRequest,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    if not req.word:
        raise HTTPException(400, "Word is required")
    row = _execute_query_one(
        conn,
        "SELECT image_url FROM vocabulary WHERE word = %s",
        (req.word,),
    )
    if row and row.get("image_url"):
        if await _check_image_url(row["image_url"]):
            return {"imageUrl": row["image_url"]}
    api_key = os.environ.get("PIXABAY_API_KEY")
    if not api_key:
        raise HTTPException(500, "Image search not configured. Add PIXABAY_API_KEY to .env")
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"https://pixabay.com/api/?key={api_key}&q={quote(req.word)}&image_type=photo&per_page=3&safesearch=true"
        )
    data = r.json()
    if data.get("hits"):
        url = data["hits"][0].get("webformatURL") or data["hits"][0].get("largeImageURL")
        _execute_query(
            conn,
            "UPDATE vocabulary SET image_url = %s WHERE word = %s",
            (url, req.word),
        )
        return {"imageUrl": url}
    raise HTTPException(404, "No image found for the word")


def _calculate_next_review_date(familiarity_level_id: int) -> datetime:
    now = datetime.utcnow()
    days = {1: 1, 2: 2, 3: 5, 4: 7, 5: 14}.get(familiarity_level_id, 1)
    return now + timedelta(days=days)


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


POINTS_PER_CORRECT = 5
POINTS_WORD_LEARNED = 20  # Bonus when word reaches Learned (4) or Known (5)


@app.post("/api/update-progress")
async def update_progress(
    req: UpdateProgressRequest,
    user: dict = Depends(get_current_user),
    conn=Depends(get_db),
):
    progress = _execute_query_one(
        conn,
        "SELECT familiarity_level_id, correct_answers, incorrect_answers FROM familiarity WHERE user_id = %s AND word_id = %s",
        (user["userId"], req.wordId),
    )
    if not progress:
        fid, ca, ia = 1, (1 if req.correct else 0), (0 if req.correct else 1)
        next_date = _calculate_next_review_date(fid)
        _execute_query(
            conn,
            """INSERT INTO familiarity (user_id, word_id, familiarity_level_id, correct_answers, incorrect_answers, last_reviewed, next_review_date)
               VALUES (%s, %s, %s, %s, %s, NOW(), %s)""",
            (user["userId"], req.wordId, fid, ca, ia, next_date),
        )
        points_earned = POINTS_PER_CORRECT if req.correct else 0
        if points_earned > 0:
            _award_points(conn, user["userId"], points_earned)
        return {"message": "Progress created successfully", "pointsEarned": points_earned}
    fid = progress["familiarity_level_id"]
    ca = progress["correct_answers"] + (1 if req.correct else 0)
    ia = progress["incorrect_answers"] + (0 if req.correct else 1)
    old_fid = fid
    if req.correct:
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
    next_date = _calculate_next_review_date(fid)
    _execute_query(
        conn,
        """UPDATE familiarity SET familiarity_level_id = %s, correct_answers = %s, incorrect_answers = %s, last_reviewed = NOW(), next_review_date = %s
           WHERE user_id = %s AND word_id = %s""",
        (fid, ca, ia, next_date, user["userId"], req.wordId),
    )
    points_earned = POINTS_PER_CORRECT if req.correct else 0
    if req.correct and fid >= 4 and old_fid < 4:
        points_earned += POINTS_WORD_LEARNED
    if points_earned > 0:
        _award_points(conn, user["userId"], points_earned)
    return {"message": "Progress updated successfully", "pointsEarned": points_earned}


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
        "SELECT current_streak FROM daily_streaks WHERE user_id = %s AND (streak_date = %s OR streak_date = %s) ORDER BY streak_date DESC LIMIT 1",
        (user["userId"], today, yesterday),
    )
    if not rows:
        return []
    current_streak = rows[0]["current_streak"]
    dates = []
    for i in range(current_streak):
        d = (now - timedelta(days=i)).date().isoformat()
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
