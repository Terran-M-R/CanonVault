-- Migration 006: Settings table
-- Stores world-building locations and environments in a story's bible

CREATE TABLE IF NOT EXISTS settings (
  id          SERIAL PRIMARY KEY,
  story_id    INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  time_period VARCHAR(128), -- e.g. "Year 2347", "Medieval era", "Present day"
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_story_id ON settings(story_id);
