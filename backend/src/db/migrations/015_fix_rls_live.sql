-- Migration 015: Apply RLS to all public tables (live fix)
--
-- Supabase Security Advisor flagged all 11 tables as "RLS Disabled in Public"
-- (rls_disabled_in_public) on 12 Jul 2026. Migrations 013 and 014 contained
-- the correct SQL but were never executed against the live database.
--
-- This migration is SAFE TO RUN on any database state:
--   - ALTER TABLE ... ENABLE ROW LEVEL SECURITY is idempotent
--   - DROP POLICY IF EXISTS guards against errors if policies already exist
--   - CREATE POLICY is run after DROP so there are no duplicate-name conflicts
--
-- CanonVault's Node.js backend connects via DATABASE_URL using the postgres
-- superuser role, which BYPASSES RLS by default — so all existing backend
-- queries continue to work completely unchanged after this migration.
-- These policies only block direct Supabase REST API / anon key access.

-- ─── Step 1: Enable RLS on all 11 tables ─────────────────────────────────────

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_content       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plot_points         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.continuity_flags    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_books     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storyboard_images   ENABLE ROW LEVEL SECURITY;

-- ─── Step 2: Drop any existing policies (safe, idempotent) ───────────────────

DROP POLICY IF EXISTS "deny_all_users"              ON public.users;
DROP POLICY IF EXISTS "deny_all_user_preferences"   ON public.user_preferences;
DROP POLICY IF EXISTS "deny_all_stories"            ON public.stories;
DROP POLICY IF EXISTS "deny_all_story_content"      ON public.story_content;
DROP POLICY IF EXISTS "deny_all_characters"         ON public.characters;
DROP POLICY IF EXISTS "deny_all_settings"           ON public.settings;
DROP POLICY IF EXISTS "deny_all_plot_points"        ON public.plot_points;
DROP POLICY IF EXISTS "deny_all_continuity_flags"   ON public.continuity_flags;
DROP POLICY IF EXISTS "deny_all_collaborators"      ON public.collaborators;
DROP POLICY IF EXISTS "deny_all_published_books"    ON public.published_books;
DROP POLICY IF EXISTS "deny_all_storyboard_images"  ON public.storyboard_images;

-- ─── Step 3: Create deny-all policies for all 11 tables ──────────────────────
-- USING (false) means no row ever matches — all REST API access is denied.
-- The Node.js backend (superuser connection) is unaffected by these policies.

CREATE POLICY "deny_all_users"
  ON public.users FOR ALL USING (false);

CREATE POLICY "deny_all_user_preferences"
  ON public.user_preferences FOR ALL USING (false);

CREATE POLICY "deny_all_stories"
  ON public.stories FOR ALL USING (false);

CREATE POLICY "deny_all_story_content"
  ON public.story_content FOR ALL USING (false);

CREATE POLICY "deny_all_characters"
  ON public.characters FOR ALL USING (false);

CREATE POLICY "deny_all_settings"
  ON public.settings FOR ALL USING (false);

CREATE POLICY "deny_all_plot_points"
  ON public.plot_points FOR ALL USING (false);

CREATE POLICY "deny_all_continuity_flags"
  ON public.continuity_flags FOR ALL USING (false);

CREATE POLICY "deny_all_collaborators"
  ON public.collaborators FOR ALL USING (false);

CREATE POLICY "deny_all_published_books"
  ON public.published_books FOR ALL USING (false);

CREATE POLICY "deny_all_storyboard_images"
  ON public.storyboard_images FOR ALL USING (false);
