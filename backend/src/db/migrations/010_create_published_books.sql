-- Migration 010: Published books table
-- Stores the public profile for a published or WIP story

CREATE TABLE IF NOT EXISTS published_books (
  id              SERIAL PRIMARY KEY,
  story_id        INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  hook            TEXT,           -- short compelling description shown on browse page
  genre_display   VARCHAR(128),   -- genre label shown publicly
  audience_display VARCHAR(128),  -- target audience shown publicly
  external_link   VARCHAR(512),   -- link to Amazon, Wattpad, etc.
  is_wip          BOOLEAN NOT NULL DEFAULT TRUE, -- true = work in progress
  published_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(story_id) -- one public profile per story
);

-- Index for fast browse/search queries
CREATE INDEX IF NOT EXISTS idx_published_books_is_wip ON published_books(is_wip);
