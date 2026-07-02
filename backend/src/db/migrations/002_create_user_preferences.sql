-- Migration 002: User preferences table
-- Stores onboarding survey results per user

CREATE TABLE IF NOT EXISTS user_preferences (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  writing_type       VARCHAR(64)  NOT NULL DEFAULT 'creative', -- creative | academic | other
  book_form          VARCHAR(64)  NOT NULL DEFAULT 'novel',    -- novel | short_story | other
  target_audience    VARCHAR(64)  NOT NULL DEFAULT 'adult',    -- adult | young_adult | middle_grade | children
  ai_criticism_level VARCHAR(32)  NOT NULL DEFAULT 'moderate', -- light | moderate | detailed
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
