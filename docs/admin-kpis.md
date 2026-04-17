# KPIs del dashboard administrativo (MVP)

Ventanas temporales en **UTC** salvo que se indique lo contrario. Los conteos de actividad combinan tres fuentes: `reading_sessions.completed_at`, `familiarity.last_reviewed` y `daily_streaks.streak_date`.

| KPI | Definición | Fuente |
|-----|------------|--------|
| `totalUsers` | `COUNT(*)` de `users` | `users` |
| `newUsers7d` / `newUsers30d` | Usuarios con `created_at >= now() - interval` | `users` |
| `activeUsers7d` | Usuarios distintos con **cualquier** actividad en los últimos 7 días (unión de las tres tablas) | `reading_sessions`, `familiarity`, `daily_streaks` |
| `activeUsersPrev7d` | Misma lógica para el intervalo **[14d, 7d)** respecto a `now()` | idem |
| `activityWeekOverWeekChange` | \((activeUsers7d - activeUsersPrev7d) / max(activeUsersPrev7d, 1)\) | derivado |
| `returningUsers7d` | Usuarios con actividad en **[14d, 7d)** **y** también en **[7d, now)** | idem |
| `activeUsers24h` | Usuarios distintos con actividad en ~24 h (timestamps 24 h + racha hoy/ayer UTC) | idem |
| `interactionCount7d` | Suma: lecturas completadas (7 d) + filas `familiarity` con `last_reviewed` (7 d) + filas `daily_streaks` (7 d) | idem |
| `popularPages` | Tres rutas proxy ordenadas por eventos (30 d): lecturas → Centro de lectura; repasos `last_reviewed` → Flashcards; filas de racha → Tablero | idem |
| `signupsByDay` | Altas por día (últimos 14 días, relleno con 0) | `users` + `generate_series` |
| `readingsByDay` | `reading_sessions` completadas por día (14 días) | `reading_sessions` |
| `avgFamiliarityLevel` | Media global de `familiarity_level_id` (1–5) | `familiarity` |
| `familiarityByLevel` | Conteo agrupado por nivel (join con `familiarity_levels`) | `familiarity` |
| `weakWordsTop` | Palabras con mayor `SUM(incorrect_answers)` y usuarios afectados | `familiarity`, `vocabulary` |
| `readingsByCategory` | Conteo de sesiones de lectura por categoría | `reading_sessions`, `categories` |
| `avgLongestStreak` / `maxLongestStreak` | Por usuario: `MAX(longest_streak)` en `daily_streaks`; luego AVG y MAX global | `daily_streaks` |
| `avgUserPoints` | `AVG(COALESCE(points,0))` | `users` |
| `badgesEarnedByType` | `COUNT(*)` de `user_badges` por badge | `user_badges`, `badges` |

**Notas**

- No hay tabla de logins poblada de forma fiable: el panel **no** usa `user_logins` en el MVP.
- “Actividad” es un proxy de producto, no DAU oficial de analytics.
- El acceso admin está restringido por `ADMIN_EMAILS` y/o `ADMIN_USER_IDS` (ver `.env.production.example`).
