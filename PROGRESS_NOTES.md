# CanonVault — Progress Notes
> Last updated: July 20, 2026 (Session 2)
> Use this file to catch up a new Bob chat session quickly.

---

## Project Overview
**CanonVault** — IBM Hackathon July 2026 submission by Terran Roberson.
A centralized creative writing management platform with AI-powered story bible, continuity checking, and public publishing.

**GitHub:** https://github.com/Terran-M-R/CanonVault

**Workflow:** Bob writes/updates code in `C:/Users/tmich/.bob/playground/canonvault`. Terran copies the updated files into `C:/Users/tmich/Projects/canonvault` and pushes to GitHub.

---

## Sub-Task Status

| # | Sub-Task | Status |
|---|----------|--------|
| 1 | Project Scaffolding and Repository Setup | ✅ Complete |
| 2 | Database Schema Design and Setup (Supabase) | ✅ Complete |
| 3 | Authentication and Onboarding (Firebase) | ✅ Complete |
| 4 | Story Bible Editor (Core Dashboard) | ✅ Complete |
| 5 | IBM Granite AI Integration | ✅ Complete |
| 6 | AI Continuity Checker with Pop-up Notifications | ✅ Complete |
| 7 | Publishing Page and Storyboard Image Generation | ✅ Complete |
| 8 | Collaboration Feature | ✅ Complete |
| 9 | IBM Cloud Deployment and Final Polish | 🔄 In Progress |
| 10 | Supabase RLS Live Fix + Storyboard Bug | 🔄 In Progress |

---

## Sub-Task 9 — Current Todo List

- [x] WATSONX_API_KEY — created and saved
- [x] Firebase Auth — configured (completed in Sub-Task 3)
- [x] Supabase DATABASE_URL — configured (completed in Sub-Task 2)
- [x] HUGGINGFACE_TOKEN — added to backend/.env
- [x] Create watsonx.ai Deployment Space and get Space ID
- [x] Update granite.js to use space_id instead of project_id
- [x] Update .env.example to reflect WATSONX_SPACE_ID
- [ ] Verify all AI features work locally (process-text, check-continuity, publish/image gen, collaboration)
- [ ] UI polish pass (Terran will handle UI changes)
- [ ] IBM Cloud Code Engine deployment (backend)
- [ ] Frontend deployment
- [ ] FRONTEND_URL — set after deployment
- [ ] Update README — document IBM Object Storage blocker, Option B solution, and AI-assisted development process
- [ ] Final submission polish

---

## Sub-Task 10 — Supabase RLS Live Fix + Storyboard Bug

### Security Fix (RLS)
- [x] Created `015_fix_rls_live.sql` — idempotent migration enabling RLS and deny-all policies on all 11 tables
- [x] Updated `run-migrations.js` to track applied migrations via `schema_migrations` table (prevents re-running)
- [x] **CONFIRMED:** Migration 015 was run twice; 2nd run was successful and tested in Supabase SQL Editor — RLS is live
- [x] Supabase Security Advisor vulnerabilities resolved

### Storyboard Bug
- [x] Terran provided screenshots (July 18, 2026)
- [x] Diagnosed 3 bugs — white screen crash, silent HF model failure, modal not closing
- [x] Fix 1: Decoupled image generation from publish response (fire-and-forget) — publish can never crash due to HF
- [x] Fix 2: Switched HF model `stabilityai/stable-diffusion-2` → `black-forest-labs/FLUX.1-schnell` (free, no gating)
- [x] Fix 3: `PublishModal` now always closes on success; `onPublished` callback is null-safe in `StoryEditor`
- [x] Added `X-Wait-For-Model: true` header + JSON error body detection in `imagegen.js`
- [x] Added "images generating in background" banner in `StoryEditor`
- [x] Root cause confirmed: `getaddrinfo ENOTFOUND api-inference.huggingface.co` — local network/DNS blocks HF entirely
- [x] **Fix 4: Switched image provider from Hugging Face → Pollinations.ai** (free, no API key, plain HTTPS GET — not blocked by network). `HUGGINGFACE_TOKEN` env var is now unused for image gen but can stay in `.env` harmlessly.
- [x] Terran to test: publish with "Regenerate storyboard images" checked → modal should close cleanly → refresh public page after ~1 min to see storyboard — **CONFIRMED WORKING (July 19, 2026)**

### Post-Publish UX + Storyboard Display Improvements (July 19, 2026)
- [x] Fixed white screen after "Update" publish — was a Carbon Modal unmount race; fixed with `setTimeout(..., 0)` before `onClose()`
- [x] Improved published banner: title now says "Published — storyboard images generating…" when images are being generated; subtitle gives explicit "click View Public Page, wait ~1 min, refresh" instructions
- [x] `BookProfile`: storyboard cards now show **plot point title** (from `plot_points` JOIN) instead of "Scene N"
- [x] `BookProfile`: storyboard cards now show **brief plot point description** (2-line clamped) under the title
- [x] `BookProfile`: hover/click on storyboard image opens a **full-screen lightbox** with enlarged image, title, and full description; closes on click-outside or Escape
- [x] `books.js` GET `/:id` now JOINs `plot_points` to return `plot_point_title` and `plot_point_description` with each storyboard image

### Character Description Field (July 19, 2026)
- [x] Created `016_add_character_description.sql` — `ALTER TABLE characters ADD COLUMN IF NOT EXISTS description TEXT`
- [x] Updated `stories.js` POST/PUT character routes to accept and store `description`
- [x] Updated AI upsert in `process-text` to include `description` (COALESCE so manual entries aren't overwritten by empty AI result)
- [x] Updated `granite.js` `extractBibleData` prompt to extract appearance description for each character
- [x] Updated `StoryBiblePanel` `characterFields` to include "Appearance Description" (multiline textarea) between Role and Traits
- [ ] **ACTION REQUIRED (Terran):** Run migration 016 in Supabase SQL Editor — paste contents of `backend/src/db/migrations/016_add_character_description.sql` and click Run

### Plot Points is_spoiler COALESCE Bug (July 20, 2026)
- [x] Diagnosed: `COALESCE($4, is_spoiler)` fails for boolean `false` — PostgreSQL COALESCE treats `false` as non-null but the JS side was sending `false` correctly. The real issue: if `is_spoiler` was `false` on edit open, saving would not persist the unchecked state because the CASE expression was not being used. Fixed with `CASE WHEN $4::boolean IS NOT NULL THEN $4::boolean ELSE is_spoiler END` and explicit `?? null` coercion on all params.
- [x] Fix applied in `backend/src/routes/stories.js` PUT `/plot-points/:pointId`

### Plot Points Save Button Bug
- [x] Diagnosed: `BibleCard` `save()` had no try/catch — API errors were silently swallowed, user saw nothing
- [x] Also diagnosed: `BibleCard` edit mode had no checkbox renderer for `is_spoiler` (boolean field) — editing a plot point could not toggle the Spoiler flag
- [x] Fix: Added try/catch with inline error message display, `saving` state (button shows "Saving…" and disables), and boolean/checkbox field type support in edit mode
- [x] Backend `is_spoiler` COALESCE bug fixed (see above)
- [ ] **ACTION REQUIRED (Terran):** Copy updated files to Projects folder (see "Files to Copy" section below)
- [ ] Terran to test: edit a plot point title/description → Save button should show "Saving…" then close; if backend error occurs, red error message appears instead of silent failure

### Session 2 Context Restore (July 20, 2026)
- [x] Terran accidentally exited previous chat session — conversation history was lost
- [x] Bob re-read `PROGRESS_NOTES.md` and `README.md` to restore full context
- [x] Previous session's summary was provided via system context — all prior decisions carried forward
- [x] Confirmed: storyboard fix (Pollinations.ai) is in playground but NOT YET copied to Projects folder
- [x] Confirmed: `StoryBiblePanel.jsx` fix is in playground but NOT YET copied to Projects folder
- [x] Confirmed: `stories.js` `is_spoiler` COALESCE fix applied in playground this session

---

## ⚡ Files to Copy Right Now (July 20, 2026)

These files in the playground are ahead of your Projects folder:

| Playground file | Copy to |
|----------------|---------|
| `canonvault/backend/src/services/imagegen.js` | `C:/Users/tmich/Projects/canonvault/backend/src/services/imagegen.js` |
| `canonvault/backend/src/routes/stories.js` | `C:/Users/tmich/Projects/canonvault/backend/src/routes/stories.js` |
| `canonvault/frontend/src/components/StoryBiblePanel.jsx` | `C:/Users/tmich/Projects/canonvault/frontend/src/components/StoryBiblePanel.jsx` |

After copying:
1. Restart backend (`npm run dev` in `backend/`)
2. Restart frontend (`npm run dev` in `frontend/`)
3. Test storyboard: publish a story with "Regenerate storyboard images" checked → should work now (no more HF errors)
4. Test plot points: edit a plot point, check/uncheck Spoiler, click Save → should persist correctly

---

## Environment Variables Status

All variables live in `C:/Users/tmich/Projects/canonvault/backend/.env` (never in the playground, never committed to GitHub).

| Variable | Status | Notes |
|----------|--------|-------|
| `DATABASE_URL` | ✅ Set | Supabase PostgreSQL |
| `FIREBASE_PROJECT_ID` | ✅ Set | Firebase Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | ✅ Set | Firebase Admin SDK |
| `FIREBASE_PRIVATE_KEY` | ✅ Set | Firebase Admin SDK |
| `WATSONX_API_KEY` | ✅ Set | IBM Cloud IAM API key |
| `WATSONX_SPACE_ID` | ✅ Set | `dd993c0e-029a-4033-b513-3e0d8ccce9fa` |
| `WATSONX_URL` | ✅ Set | `https://us-south.ml.cloud.ibm.com` |
| `HUGGINGFACE_TOKEN` | ✅ Set | HF read token for image generation |
| `PORT` | ✅ Set | `3001` |
| `NODE_ENV` | ✅ Set | `development` (change to `production` on deploy) |
| `FRONTEND_URL` | ⏳ Pending | Set after frontend deployment |

---

## Key Technical Decisions & History

### IBM watsonx.ai — Deployment Space vs Studio Project
**Problem:** IBM Cloud Object Storage (required to create a watsonx.ai Studio Project) could not be provisioned on the student SkillsBuild account tier. The Standard plan returned an account upgrade error despite the feature code being applied. The Lite plan was deprecated and unavailable.

**Solution:** Used a **watsonx.ai Deployment Space** instead of a Studio Project. A Deployment Space provides identical access to Granite model inference via the same REST API endpoint — only the request body parameter changes (`space_id` instead of `project_id`). There is zero functional difference for CanonVault users.

**Code change:** [`backend/src/services/granite.js`](backend/src/services/granite.js)
- `WATSONX_PROJECT_ID` → `WATSONX_SPACE_ID`
- `project_id` → `space_id` in the API request body
- Model updated from `ibm/granite-13b-instruct-v2` → `ibm/granite-3-8b-instruct` (current recommended model)

**Additional fix required:** After creating the Deployment Space, the **watsonx.ai Runtime service** (`watsonx.ai Runtime-me`) had to be manually associated with the space via the Manage tab at `dataplatform.cloud.ibm.com`. Without this, all Granite API calls returned HTTP 403 Forbidden.

### IBM SkillsBuild Feature Code
- A 365-day feature code was applied to the IBM Cloud account
- Located under: Manage → Account → Account settings → Subscriptions and feature codes
- Despite the code being applied, Object Storage provisioning remained blocked — hence the Deployment Space workaround

---

## Architecture Reminder

```
canonvault/
├── frontend/          # React + Vite + IBM Carbon Design System (port 5173)
├── backend/           # Node.js + Express REST API (port 3001)
│   ├── src/
│   │   ├── routes/    # stories.js, auth.js, books.js, publish.js
│   │   ├── middleware/ # auth.js (Firebase token verification)
│   │   ├── services/  # granite.js (watsonx.ai), imagegen.js (Pollinations.ai)
│   │   └── db/        # PostgreSQL via Supabase + 16 migration files
│   └── server.js
├── .env.example       # Template — WATSONX_SPACE_ID (not PROJECT_ID)
├── PROGRESS_NOTES.md  # This file
└── README.md
```

---

## Local Development Commands

```powershell
# Backend (from C:/Users/tmich/Projects/canonvault)
cd backend
npm run dev        # Runs on http://localhost:3001

# Frontend (second terminal)
cd frontend
npm run dev        # Runs on http://localhost:5173
```

---

## README Update Notes (for final polish)
When updating the README for submission, document the following:
- The IBM Object Storage account tier blocker and how the Deployment Space solution was discovered
- How Bob (IBM's AI assistant) helped diagnose the 403 error, identify the missing Runtime service association, and pivot from Option A (Studio Project) to Option B (Deployment Space)
- Frame it as: a real-world example of using AI to navigate unexpected infrastructure challenges and find alternative solutions collaboratively

---

## Supabase Security Note
On 12 Jul 2026, Supabase flagged all 11 public tables as `rls_disabled_in_public` (Critical).
Root cause: migrations 013 and 014 contained the correct SQL but were never executed against the live database.
`run-migrations.js` had no tracking table, so there was no way to know which migrations had been applied.

**Fix:** Migration `015_fix_rls_live.sql` was created — idempotent, safe to run on any state.
`run-migrations.js` was also updated to use a `schema_migrations` tracking table going forward.

### ⚠️ ACTION REQUIRED — Apply 015 to the live database
1. Go to **Supabase Dashboard → SQL Editor** for project `akwggmqexywhcsbobjvm`
2. Open `canonvault/backend/src/db/migrations/015_fix_rls_live.sql`
3. Paste the full contents into the SQL Editor and click **Run**
4. Expected output: no errors, all statements succeed
5. Go to **Security Advisor** and confirm **0 errors** remain
