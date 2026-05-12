"""
Aggregated read-only endpoints for the administrative dashboard.
Protected by require_admin (see auth.py).
"""

import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict, Field

from auth import get_current_user, is_user_admin, require_admin
from db import get_db

router = APIRouter()

_MAX_CSV_BYTES = 5 * 1024 * 1024
_MAX_CSV_ROWS = 5000

_VOCAB_HEADER_ALIASES: dict[str, tuple[str, ...]] = {
    "word": ("word", "palabra", "término", "termino", "term", "w"),
    "type": ("type", "tipo", "pos", "part_of_speech"),
    "cefr": ("cefr", "level", "nivel"),
    "definition": ("definition", "definición", "definicion", "meaning", "significado"),
    "example": ("example", "ejemplo", "sample"),
    "image_url": ("image_url", "imageurl", "url_imagen", "imagen", "image", "url"),
}


def _norm_header(s: str) -> str:
    return (s or "").strip().lower().replace("\ufeff", "")


def _resolve_vocab_columns(fieldnames: list[str] | None) -> dict[str, str | None]:
    """Maps logical column name -> CSV header string present in file (or None)."""
    if not fieldnames:
        return {k: None for k in _VOCAB_HEADER_ALIASES}
    inv: dict[str, str] = {}
    for fn in fieldnames:
        inv[_norm_header(fn)] = fn
    out: dict[str, str | None] = {}
    for logical, aliases in _VOCAB_HEADER_ALIASES.items():
        found = None
        for a in aliases:
            key = _norm_header(a)
            if key in inv:
                found = inv[key]
                break
        out[logical] = found
    return out


def _cell(row: dict, header_key: str | None) -> str | None:
    if not header_key:
        return None
    v = row.get(header_key)
    if v is None:
        return None
    return str(v)


def _optional_text(s: str | None) -> str | None:
    if s is None:
        return None
    t = s.strip()
    return t if t else None


def _append_vocab_row(
    conn,
    category_id: int,
    word: str,
    type_: str | None,
    cefr: str | None,
    definition: str | None,
    example: str | None,
    image_url: str | None,
) -> tuple[str, int | None]:
    """
    Insert one vocabulary row unless it duplicates (same category, word, definition).
    Returns ('inserted', vocabulary_id) or ('skipped_duplicate', None).
    """
    with conn.cursor() as cur:
        cur.execute(
            """SELECT 1 AS x FROM vocabulary
               WHERE category_id = %s AND word = %s
                 AND definition IS NOT DISTINCT FROM %s
               LIMIT 1""",
            (category_id, word, definition),
        )
        if cur.fetchone():
            return ("skipped_duplicate", None)
        try:
            cur.execute(
                """INSERT INTO vocabulary (word, type, cefr, definition, example, category_id, image_url)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)
                   RETURNING vocabulary_id""",
                (word, type_, cefr, definition, example, category_id, image_url),
            )
            row = cur.fetchone()
            if not row:
                conn.rollback()
                raise RuntimeError("Insert returned no row")
            vid = int(row["vocabulary_id"])
        except Exception:
            conn.rollback()
            raise
    conn.commit()
    return ("inserted", vid)


class AdminVocabEntryBody(BaseModel):
    """Single vocabulary row from the admin UI (no image: filled later by app / AI)."""

    model_config = ConfigDict(str_strip_whitespace=True)
    category_id: int
    word: str = Field(..., min_length=1, max_length=255)
    speech_type: str | None = Field(None, max_length=255, alias="type")
    cefr: str | None = Field(None, max_length=10)
    definition: str | None = None
    example: str | None = None


def _fetch_all(conn, query: str, params: tuple = ()):
    with conn.cursor() as cur:
        cur.execute(query, params)
        return [dict(row) for row in cur.fetchall()]


def _fetch_one(conn, query: str, params: tuple = ()):
    rows = _fetch_all(conn, query, params)
    return rows[0] if rows else None


@router.get("/me")
async def admin_me(user: dict = Depends(get_current_user), conn=Depends(get_db)):
    """Returns whether the authenticated user may access admin APIs (no 403 if false)."""
    return {"isAdmin": is_user_admin(conn, user["userId"])}


@router.get("/overview")
async def admin_overview(_: dict = Depends(require_admin), conn=Depends(get_db)):
    totals = _fetch_one(
        conn,
        """SELECT
               COUNT(*)::int AS total_users,
               COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS new_users_7d,
               COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new_users_30d
           FROM users""",
    )

    active_24h = _fetch_one(
        conn,
        """SELECT COUNT(*)::int AS c FROM (
               SELECT user_id FROM reading_sessions
               WHERE completed_at >= NOW() - INTERVAL '24 hours'
               UNION
               SELECT user_id FROM familiarity
               WHERE last_reviewed >= NOW() - INTERVAL '24 hours'
               UNION
               SELECT user_id FROM daily_streaks
               WHERE streak_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '1 day'
           ) u""",
    )

    interactions_7d = _fetch_one(
        conn,
        """SELECT (
               (SELECT COUNT(*)::int FROM reading_sessions
                WHERE completed_at >= NOW() - INTERVAL '7 days')
             + (SELECT COUNT(*)::int FROM familiarity
                WHERE last_reviewed >= NOW() - INTERVAL '7 days')
             + (SELECT COUNT(*)::int FROM daily_streaks
                WHERE streak_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '7 days')
           ) AS c""",
    )

    reading_hits_30d = _fetch_one(
        conn,
        """SELECT COUNT(*)::int AS c FROM reading_sessions
           WHERE completed_at >= NOW() - INTERVAL '30 days'""",
    )
    flashcard_hits_30d = _fetch_one(
        conn,
        """SELECT COUNT(*)::int AS c FROM familiarity
           WHERE last_reviewed >= NOW() - INTERVAL '30 days'""",
    )
    dashboard_hits_30d = _fetch_one(
        conn,
        """SELECT COUNT(*)::int AS c FROM daily_streaks
           WHERE streak_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '30 days'""",
    )

    popular_pages = [
        {"pageKey": "reading_center", "hits": int(reading_hits_30d["c"]) if reading_hits_30d else 0},
        {"pageKey": "flashcards", "hits": int(flashcard_hits_30d["c"]) if flashcard_hits_30d else 0},
        {"pageKey": "dashboard", "hits": int(dashboard_hits_30d["c"]) if dashboard_hits_30d else 0},
    ]
    popular_pages.sort(key=lambda x: -x["hits"])

    active_7d = _fetch_one(
        conn,
        """SELECT COUNT(*)::int AS c FROM (
               SELECT user_id FROM reading_sessions
               WHERE completed_at >= NOW() - INTERVAL '7 days'
               UNION
               SELECT user_id FROM familiarity
               WHERE last_reviewed >= NOW() - INTERVAL '7 days'
               UNION
               SELECT user_id FROM daily_streaks
               WHERE streak_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '7 days'
           ) u""",
    )

    active_prev = _fetch_one(
        conn,
        """SELECT COUNT(*)::int AS c FROM (
               SELECT user_id FROM reading_sessions
               WHERE completed_at >= NOW() - INTERVAL '14 days'
                 AND completed_at < NOW() - INTERVAL '7 days'
               UNION
               SELECT user_id FROM familiarity
               WHERE last_reviewed >= NOW() - INTERVAL '14 days'
                 AND last_reviewed < NOW() - INTERVAL '7 days'
               UNION
               SELECT user_id FROM daily_streaks
               WHERE streak_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '14 days'
                 AND streak_date < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '7 days'
           ) u""",
    )

    returning = _fetch_one(
        conn,
        """WITH prev AS (
               SELECT user_id FROM reading_sessions
               WHERE completed_at >= NOW() - INTERVAL '14 days'
                 AND completed_at < NOW() - INTERVAL '7 days'
               UNION
               SELECT user_id FROM familiarity
               WHERE last_reviewed >= NOW() - INTERVAL '14 days'
                 AND last_reviewed < NOW() - INTERVAL '7 days'
               UNION
               SELECT user_id FROM daily_streaks
               WHERE streak_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '14 days'
                 AND streak_date < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '7 days'
           ),
           curr AS (
               SELECT user_id FROM reading_sessions
               WHERE completed_at >= NOW() - INTERVAL '7 days'
               UNION
               SELECT user_id FROM familiarity
               WHERE last_reviewed >= NOW() - INTERVAL '7 days'
               UNION
               SELECT user_id FROM daily_streaks
               WHERE streak_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '7 days'
           )
           SELECT COUNT(*)::int AS c FROM prev p INNER JOIN curr c ON p.user_id = c.user_id""",
    )

    signups_by_day = _fetch_all(
        conn,
        """SELECT d::date::text AS day, COALESCE(s.cnt, 0)::int AS count
           FROM generate_series(
               ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '13 days')::date,
               (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
               INTERVAL '1 day'
           ) AS d
           LEFT JOIN (
               SELECT (created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*)::int AS cnt
               FROM users
               WHERE created_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '14 days'
               GROUP BY 1
           ) s ON s.day = d::date
           ORDER BY day""",
    )

    readings_by_day = _fetch_all(
        conn,
        """SELECT d::date::text AS day, COALESCE(s.cnt, 0)::int AS count
           FROM generate_series(
               ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '13 days')::date,
               (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
               INTERVAL '1 day'
           ) AS d
           LEFT JOIN (
               SELECT (completed_at AT TIME ZONE 'UTC')::date AS day, COUNT(*)::int AS cnt
               FROM reading_sessions
               WHERE completed_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '14 days'
               GROUP BY 1
           ) s ON s.day = d::date
           ORDER BY day""",
    )

    a7 = int(active_7d["c"]) if active_7d else 0
    ap = int(active_prev["c"]) if active_prev else 0
    wow = (a7 - ap) / float(max(ap, 1))

    return {
        "totalUsers": int(totals["total_users"]) if totals else 0,
        "newUsers7d": int(totals["new_users_7d"]) if totals else 0,
        "newUsers30d": int(totals["new_users_30d"]) if totals else 0,
        "activeUsers7d": a7,
        "activeUsersPrev7d": ap,
        "activityWeekOverWeekChange": round(wow, 4),
        "returningUsers7d": int(returning["c"]) if returning else 0,
        "activeUsers24h": int(active_24h["c"]) if active_24h else 0,
        "interactionCount7d": int(interactions_7d["c"]) if interactions_7d else 0,
        "popularPages": popular_pages,
        "signupsByDay": signups_by_day,
        "readingsByDay": readings_by_day,
        "generatedAt": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/learning")
async def admin_learning(_: dict = Depends(require_admin), conn=Depends(get_db)):
    avg_level = _fetch_one(
        conn,
        "SELECT ROUND(AVG(familiarity_level_id)::numeric, 3) AS avg FROM familiarity",
    )
    by_level = _fetch_all(
        conn,
        """SELECT fl.familiarity_level_id, fl.familiarity_name, COUNT(*)::int AS count
           FROM familiarity f
           JOIN familiarity_levels fl ON f.familiarity_level_id = fl.familiarity_level_id
           GROUP BY fl.familiarity_level_id, fl.familiarity_name
           ORDER BY fl.familiarity_level_id""",
    )
    weak_words = _fetch_all(
        conn,
        """SELECT v.word,
                  SUM(f.incorrect_answers)::int AS total_incorrect,
                  COUNT(DISTINCT f.user_id)::int AS users_affected
           FROM familiarity f
           JOIN vocabulary v ON v.vocabulary_id = f.word_id
           GROUP BY v.vocabulary_id, v.word
           ORDER BY total_incorrect DESC NULLS LAST
           LIMIT 15""",
    )
    by_category = _fetch_all(
        conn,
        """SELECT c.category_id, c.category_name, COUNT(rs.reading_session_id)::int AS readings_completed,
                  ROUND(AVG(rs.quiz_score)::numeric, 2) AS avg_quiz_score
           FROM reading_sessions rs
           JOIN categories c ON c.category_id = rs.category_id
           GROUP BY c.category_id, c.category_name
           ORDER BY readings_completed DESC""",
    )
    return {
        "avgFamiliarityLevel": float(avg_level["avg"]) if avg_level and avg_level.get("avg") is not None else 0.0,
        "familiarityByLevel": by_level,
        "weakWordsTop": weak_words,
        "readingsByCategory": by_category,
        "generatedAt": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/engagement")
async def admin_engagement(_: dict = Depends(require_admin), conn=Depends(get_db)):
    streaks = _fetch_one(
        conn,
        """SELECT
               ROUND(AVG(max_longest)::numeric, 2) AS avg_longest,
               COALESCE(MAX(max_longest), 0)::int AS max_longest
           FROM (
               SELECT user_id, MAX(longest_streak) AS max_longest
               FROM daily_streaks
               GROUP BY user_id
           ) t""",
    )
    points = _fetch_one(
        conn,
        "SELECT ROUND(AVG(COALESCE(points, 0))::numeric, 2) AS avg_points FROM users",
    )
    badges = _fetch_all(
        conn,
        """SELECT b.badge_key, b.name_es, COUNT(ub.user_badge_id)::int AS earned_count
           FROM badges b
           LEFT JOIN user_badges ub ON ub.badge_id = b.badge_id
           GROUP BY b.badge_id, b.badge_key, b.name_es
           ORDER BY earned_count DESC, b.required_streak""",
    )
    total_readings = _fetch_one(conn, "SELECT COUNT(*)::int AS c FROM reading_sessions")
    return {
        "avgLongestStreak": float(streaks["avg_longest"]) if streaks and streaks.get("avg_longest") is not None else 0.0,
        "maxLongestStreak": int(streaks["max_longest"]) if streaks else 0,
        "avgUserPoints": float(points["avg_points"]) if points and points.get("avg_points") is not None else 0.0,
        "badgesEarnedByType": badges,
        "totalReadingsCompleted": int(total_readings["c"]) if total_readings else 0,
        "generatedAt": datetime.utcnow().isoformat() + "Z",
    }


@router.post("/vocabulary/entry")
async def admin_vocab_entry(
    body: AdminVocabEntryBody,
    _: dict = Depends(require_admin),
    conn=Depends(get_db),
):
    """Add a single vocabulary row. Image URL is left empty for the app to fill (e.g. via AI)."""
    cat = _fetch_one(conn, "SELECT category_id FROM categories WHERE category_id = %s", (body.category_id,))
    if not cat:
        raise HTTPException(404, "Category not found")

    word = body.word.strip()
    if not word:
        raise HTTPException(400, "Word required")

    type_ = _optional_text(body.speech_type)
    if type_ and len(type_) > 255:
        raise HTTPException(400, "type exceeds 255 characters")

    cefr = _optional_text(body.cefr)
    if cefr and len(cefr) > 10:
        raise HTTPException(400, "cefr exceeds 10 characters")

    definition = _optional_text(body.definition)
    example = _optional_text(body.example)

    try:
        status, vocabulary_id = _append_vocab_row(
            conn,
            body.category_id,
            word,
            type_,
            cefr,
            definition,
            example,
            None,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"Could not save vocabulary: {exc}") from exc

    return {
        "status": status,
        "vocabularyId": vocabulary_id,
        "generatedAt": datetime.utcnow().isoformat() + "Z",
    }


@router.post("/vocabulary/import-csv")
async def admin_import_vocabulary_csv(
    category_id: int = Form(...),
    file: UploadFile = File(...),
    _: dict = Depends(require_admin),
    conn=Depends(get_db),
):
    """
    Append vocabulary rows for an existing category. Does not delete or replace existing rows.
    Duplicate rows (same category, word, and definition, including both empty/null) are skipped.
    """
    cat = _fetch_one(conn, "SELECT category_id FROM categories WHERE category_id = %s", (category_id,))
    if not cat:
        raise HTTPException(404, "Category not found")

    raw = await file.read()
    if len(raw) > _MAX_CSV_BYTES:
        raise HTTPException(413, "CSV file too large (max 5 MB)")

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as e:
        raise HTTPException(400, "File must be UTF-8 encoded") from e

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(400, "CSV has no header row")

    col = _resolve_vocab_columns(list(reader.fieldnames))
    if not col.get("word"):
        raise HTTPException(
            400,
            "CSV must include a word column (e.g. word, palabra, termino).",
        )

    inserted = 0
    skipped_duplicates = 0
    errors: list[dict[str, str | int]] = []

    for line_no, row in enumerate(reader, start=2):
        if line_no > _MAX_CSV_ROWS + 1:
            errors.append({"line": line_no, "message": f"Stopped after {_MAX_CSV_ROWS} data rows"})
            break

        word_raw = _cell(row, col["word"])
        word = (word_raw or "").strip()
        if not word:
            errors.append({"line": line_no, "message": "Missing word"})
            continue
        if len(word) > 255:
            errors.append({"line": line_no, "message": "Word exceeds 255 characters"})
            continue

        type_ = _optional_text(_cell(row, col["type"]))
        if type_ and len(type_) > 255:
            errors.append({"line": line_no, "message": "type exceeds 255 characters"})
            continue

        cefr = _optional_text(_cell(row, col["cefr"]))
        if cefr and len(cefr) > 10:
            errors.append({"line": line_no, "message": "cefr exceeds 10 characters"})
            continue

        definition = _optional_text(_cell(row, col["definition"]))
        example = _optional_text(_cell(row, col["example"]))
        image_url = _optional_text(_cell(row, col["image_url"]))

        try:
            status, _vid = _append_vocab_row(
                conn,
                category_id,
                word,
                type_,
                cefr,
                definition,
                example,
                image_url,
            )
            if status == "inserted":
                inserted += 1
            else:
                skipped_duplicates += 1
        except Exception as exc:  # noqa: BLE001
            errors.append({"line": line_no, "message": str(exc)})

    return {
        "categoryId": category_id,
        "inserted": inserted,
        "skippedDuplicates": skipped_duplicates,
        "errors": errors,
        "generatedAt": datetime.utcnow().isoformat() + "Z",
    }
