-- Migration 011: Storyboard images table
-- Stores AI-generated images linked to plot points for the public book profile

CREATE TABLE IF NOT EXISTS storyboard_images (
  id             SERIAL PRIMARY KEY,
  story_id       INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  image_url      TEXT NOT NULL,       -- URL or base64 data URI of the generated image
  prompt_used    TEXT,                -- the prompt sent to Hugging Face (for transparency/debugging)
  plot_point_ref INTEGER REFERENCES plot_points(id) ON DELETE SET NULL,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storyboard_images_story_id ON storyboard_images(story_id);
