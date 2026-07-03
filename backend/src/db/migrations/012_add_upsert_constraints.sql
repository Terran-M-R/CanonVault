-- Migration 012: Add unique constraints to support AI upserts
-- These constraints allow ON CONFLICT (story_id, name) DO UPDATE
-- when the Granite extraction endpoint auto-populates bible data.
-- Uses DO $$ blocks to skip gracefully if the constraint already exists.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_characters_story_name'
  ) THEN
    ALTER TABLE characters
      ADD CONSTRAINT uq_characters_story_name UNIQUE (story_id, name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_settings_story_name'
  ) THEN
    ALTER TABLE settings
      ADD CONSTRAINT uq_settings_story_name UNIQUE (story_id, name);
  END IF;
END $$;
