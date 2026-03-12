-- Reading sessions: track completed readings for gamification
-- Run: docker exec -i lixylearning-postgres psql -U postgres -d lixylearning_db < db/sql_scripts/reading_sessions_migration.sql

CREATE TABLE IF NOT EXISTS reading_sessions (
    reading_session_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    reading_index INT NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    quiz_score INT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    UNIQUE(user_id, category_id, reading_index)
);
