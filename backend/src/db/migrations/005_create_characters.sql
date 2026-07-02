-- Migration 005: Characters table
-- Stores character entries in a story's bible

CREATE TABLE IF NOT EXISTS characters (
  id        SERIAL PRIMARY KEY,
  story_id  INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name      VARCHAR(255) NOT NULL,
  traits    TEXT,   -- comma-separated or prose description of personality traits
  role      VARCHAR(128), -- e.g. protagonist, antagonist, supporting
  arc_notes TEXT,   -- notes on the character's development arc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_characters_story_id ON characters(story_id);
