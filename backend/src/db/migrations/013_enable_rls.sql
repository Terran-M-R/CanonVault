-- Migration 013: Enable Row Level Security on all tables
-- This prevents direct Supabase REST API access to any table without
-- going through CanonVault's authenticated backend.
--
-- CanonVault's Node.js backend connects via DATABASE_URL using the
-- postgres superuser role, which bypasses RLS by default — so all
-- existing backend queries continue to work unchanged.
--
-- The policies below restrict Supabase REST API (anon/service_role)
-- access so that no table is publicly readable or writable.

-- ─── Enable RLS on every table ───────────────────────────────────────────────

ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_content       ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters          ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_points         ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuity_flags    ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators       ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_books     ENABLE ROW LEVEL SECURITY;
ALTER TABLE storyboard_images   ENABLE ROW LEVEL SECURITY;

-- ─── Drop any accidental permissive policies that may already exist ───────────

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ─── Deny all access via Supabase REST API (anon + authenticated roles) ───────
-- CanonVault never uses the Supabase JS client or REST API directly —
-- all data access goes through the Node.js backend over a direct
-- PostgreSQL connection, which is not subject to RLS.
-- These policies therefore deny everything through the REST layer
-- while leaving the backend unaffected.

-- users
CREATE POLICY "deny_all_users"
  ON users FOR ALL
  USING (false);

-- user_preferences
CREATE POLICY "deny_all_user_preferences"
  ON user_preferences FOR ALL
  USING (false);

-- stories
CREATE POLICY "deny_all_stories"
  ON stories FOR ALL
  USING (false);

-- story_content
CREATE POLICY "deny_all_story_content"
  ON story_content FOR ALL
  USING (false);

-- characters
CREATE POLICY "deny_all_characters"
  ON characters FOR ALL
  USING (false);

-- settings
CREATE POLICY "deny_all_settings"
  ON settings FOR ALL
  USING (false);

-- plot_points
CREATE POLICY "deny_all_plot_points"
  ON plot_points FOR ALL
  USING (false);

-- continuity_flags
CREATE POLICY "deny_all_continuity_flags"
  ON continuity_flags FOR ALL
  USING (false);

-- collaborators
CREATE POLICY "deny_all_collaborators"
  ON collaborators FOR ALL
  USING (false);

-- published_books: allow public SELECT only (needed for the browse page
-- if you ever switch to a Supabase JS client — for now also denied
-- since the Node backend handles all public queries)
CREATE POLICY "deny_all_published_books"
  ON published_books FOR ALL
  USING (false);

-- storyboard_images
CREATE POLICY "deny_all_storyboard_images"
  ON storyboard_images FOR ALL
  USING (false);
