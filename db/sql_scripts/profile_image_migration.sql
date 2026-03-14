-- Profile image support
-- Run: docker exec -i lixylearning-postgres psql -U postgres -d lixylearning_db < db/sql_scripts/profile_image_migration.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
