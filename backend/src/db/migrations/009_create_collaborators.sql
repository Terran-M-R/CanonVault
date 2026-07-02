-- Migration 009: Collaborators table
-- Stores collaboration invites for each story

CREATE TABLE IF NOT EXISTS collaborators (
  id             SERIAL PRIMARY KEY,
  story_id       INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  email          VARCHAR(255) NOT NULL,
  role           VARCHAR(32) NOT NULL DEFAULT 'editor', -- editor | viewer
  invite_status  VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending | accepted
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(story_id, email) -- one invite per email per story
);

CREATE INDEX IF NOT EXISTS idx_collaborators_story_id ON collaborators(story_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_email ON collaborators(email);
