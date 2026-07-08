-- Migration 014: Idempotent re-enforcement of Row Level Security
--
-- Migration 013 contains the correct RLS setup but may not have been
-- executed against the live Supabase database (hence the Security Advisor
-- "RLS Disabled in Public" alerts for all 11 tables).
--
-- This migration re-runs the same ALTER TABLE + policy setup using
-- IF NOT EXISTS guards so it is safe to apply on any database state.
-- Running it on a database that already has 013 applied is a no-op.

-- ─── 1. Enable RLS (safe to call if already enabled) ─────────────────────────

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

-- ─── 2. Drop any existing policies before recreating ─────────────────────────
-- Uses a DO block so it doesn't error if policies don't exist yet.

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

-- ─── 3. Deny all access via Supabase REST API (anon + authenticated roles) ───
--
-- CanonVault never uses the Supabase JS client or REST API directly.
-- All data access goes through the Node.js backend over a direct
-- PostgreSQL connection (DATABASE_URL superuser), which is NOT subject
-- to RLS — so these deny-all policies have zero impact on the backend.
-- They block any direct Supabase REST / SDK access.

CREATE POLICY "deny_all_users"
  ON users FOR ALL USING (false);

CREATE POLICY "deny_all_user_preferences"
  ON user_preferences FOR ALL USING (false);

CREATE POLICY "deny_all_stories"
  ON stories FOR ALL USING (false);

CREATE POLICY "deny_all_story_content"
  ON story_content FOR ALL USING (false);

CREATE POLICY "deny_all_characters"
  ON characters FOR ALL USING (false);

CREATE POLICY "deny_all_settings"
  ON settings FOR ALL USING (false);

CREATE POLICY "deny_all_plot_points"
  ON plot_points FOR ALL USING (false);

CREATE POLICY "deny_all_continuity_flags"
  ON continuity_flags FOR ALL USING (false);

CREATE POLICY "deny_all_collaborators"
  ON collaborators FOR ALL USING (false);

CREATE POLICY "deny_all_published_books"
  ON published_books FOR ALL USING (false);

CREATE POLICY "deny_all_storyboard_images"
  ON storyboard_images FOR ALL USING (false);
