-- Migration 016: Add description field to characters table
-- Stores a brief physical/appearance description of the character.
-- Used to improve storyboard image generation prompts and displayed in the Story Bible.

ALTER TABLE characters ADD COLUMN IF NOT EXISTS description TEXT;
