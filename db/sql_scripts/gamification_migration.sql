-- Gamification: points and badges
-- Run this migration to add gamification support.
-- For existing DBs: docker exec -i lixylearning-postgres psql -U postgres -d lixylearning_db < db/sql_scripts/gamification_migration.sql

-- Add points column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS points INT DEFAULT 0;

-- Badges table (medals for streak milestones)
CREATE TABLE IF NOT EXISTS badges (
    badge_id SERIAL PRIMARY KEY,
    badge_key VARCHAR(50) NOT NULL UNIQUE,
    name_es VARCHAR(100) NOT NULL,
    description_es TEXT,
    required_streak INT NOT NULL,
    icon_name VARCHAR(50) DEFAULT 'trophy'
);

-- Insert default streak badges
INSERT INTO badges (badge_key, name_es, description_es, required_streak, icon_name) VALUES
('streak_3', 'Primeros pasos', '3 días consecutivos de práctica', 3, 'flame'),
('streak_7', 'Semana constante', '7 días consecutivos de práctica', 7, 'star'),
('streak_14', 'Dos semanas', '14 días consecutivos de práctica', 14, 'medal'),
('streak_30', 'Mes dedicado', '30 días consecutivos de práctica', 30, 'trophy'),
('streak_60', 'Dos meses', '60 días consecutivos de práctica', 60, 'crown'),
('streak_100', 'Centenario', '100 días consecutivos de práctica', 100, 'gem')
ON CONFLICT (badge_key) DO NOTHING;

-- User badges (earned badges)
CREATE TABLE IF NOT EXISTS user_badges (
    user_badge_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (badge_id) REFERENCES badges(badge_id),
    UNIQUE(user_id, badge_id)
);
