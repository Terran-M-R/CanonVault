-- Migration 008: Continuity flags table
-- Stores AI-generated continuity issues, inconsistencies, and writing tips

CREATE TABLE IF NOT EXISTS continuity_flags (
  id           SERIAL PRIMARY KEY,
  story_id     INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  flag_text    TEXT NOT NULL,    -- description of the issue
  flag_type    VARCHAR(64) NOT NULL DEFAULT 'continuity',
                                 -- continuity | show_dont_tell | plot_hole | suggestion
  suggestion   TEXT,             -- AI-suggested fix
  resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_continuity_flags_story_id ON continuity_flags(story_id);
CREATE INDEX IF NOT EXISTS idx_continuity_flags_resolved ON continuity_flags(resolved);
