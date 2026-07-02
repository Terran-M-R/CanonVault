-- Migration 003: Stories table
-- Each row is one story/project belonging to a user

CREATE TABLE IF NOT EXISTS stories (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  synopsis    TEXT,
  genre       VARCHAR(128),
  status      VARCHAR(32) NOT NULL DEFAULT 'draft', -- draft | wip | published
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup of all stories by a user
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
