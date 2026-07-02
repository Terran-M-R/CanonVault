-- Migration 007: Plot points table
-- Stores key plot events in a story's bible, ordered by sequence

CREATE TABLE IF NOT EXISTS plot_points (
  id              SERIAL PRIMARY KEY,
  story_id        INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  sequence_order  INTEGER NOT NULL DEFAULT 0, -- used to sort plot points in order
  is_spoiler      BOOLEAN NOT NULL DEFAULT FALSE, -- spoilers are hidden on public page
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plot_points_story_id ON plot_points(story_id);
