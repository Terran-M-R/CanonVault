-- Migration 004: Story content table
-- Stores the raw and AI-formatted manuscript text for each story

CREATE TABLE IF NOT EXISTS story_content (
  id                 SERIAL PRIMARY KEY,
  story_id           INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  raw_text           TEXT,        -- original text as typed or uploaded
  formatted_text     TEXT,        -- AI-processed version (grammar, structure, dialogue)
  last_processed_at  TIMESTAMP WITH TIME ZONE,
  UNIQUE(story_id)   -- one content record per story
);
