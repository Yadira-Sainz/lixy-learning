-- Cognito integration: link users with Cognito identity
-- Run: docker exec -i lixylearning-postgres psql -U postgres -d lixylearning_db < db/sql_scripts/cognito_migration.sql

-- Add cognito_sub to link Cognito users with our users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS cognito_sub VARCHAR(255) UNIQUE;

-- Allow NULL password_hash for Cognito-only users (they authenticate via Cognito)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Index for fast lookup by cognito_sub
CREATE INDEX IF NOT EXISTS idx_users_cognito_sub ON users(cognito_sub);
