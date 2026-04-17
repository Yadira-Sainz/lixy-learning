"""
Aggregated read-only endpoints for the administrative dashboard.
Protected by require_admin (see auth.py).
"""

from datetime import datetime

from fastapi import APIRouter, Depends

from auth import get_current_user, is_user_admin, require_admin
from db import get_db

router = APIRouter()


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
