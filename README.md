# CanonVault

> A centralized creative writing management platform with AI-powered story bible, continuity checking, and public publishing.

Built for the **IBM Global AI Builders Challenge — July 2025: Reimagine Creative Industries with AI**.

---

## Selected Challenge Theme

**Reimagine Creative Industries with AI**

CanonVault targets the creative writing industry — specifically the fragmented, error-prone process writers face when managing long-form fiction. By embedding IBM Granite AI directly into the writing workflow, CanonVault reimagines what a modern writing tool looks like when AI is a first-class collaborator rather than a bolt-on feature.

---

## Problem Statement

Creative writers — novelists, short story authors, and worldbuilders — have no single place to manage the full lifecycle of their work. They juggle notes apps, word processors, spreadsheets, and sticky notes just to keep track of their own characters, settings, and plot lines. The result is a fragmented, error-prone process where:

- **Details get lost** — character names, eye colours, and established world rules contradict themselves across chapters
- **Continuity errors slip through** — plot holes and inconsistencies go unnoticed until readers catch them
- **Collaboration is manual** — sharing a draft means emailing files back and forth with no version awareness
- **Publishing is disconnected** — getting work in front of readers requires navigating entirely separate platforms
- **AI tools are generic** — existing AI assistants cannot be pointed directly at a writer's own story and asked meaningful, story-specific questions

---

## Solution

CanonVault is a centralized creative writing management platform that brings every stage of the writing process — drafting, organising, AI processing, continuity checking, collaborating, and publishing — into one place.

- 📖 **Story Bible Editor** — a structured, searchable record of every character (appearance, traits, role, arc notes), setting (time period, description), and plot point (with spoiler flagging), all in a panel alongside the manuscript
- 🤖 **IBM Granite AI Processing** — one click formats raw writing into proper novel structure, fixes grammar and dialogue, and simultaneously auto-extracts characters, settings, and plot points to populate the Story Bible
- 🔍 **AI Continuity Checker** — Granite cross-references the manuscript against the Story Bible and surfaces specific contradictions, plot holes, and inconsistencies with concrete suggestions for how to fix each one
- 🌐 **Public Publishing Page** — every story gets a clean public-facing book profile with cover art, genre, synopsis, and an AI-generated storyboard of key scenes
- 👥 **Collaboration** — invite co-writers and editors by email with role-based access (viewer or editor)
- 🖼 **Storyboard Generation** — AI generates scene illustrations from plot points, giving readers a visual preview of the story's most important moments

---

## AI Approach & Architecture

### IBM Granite 3 8B Instruct — Three AI Features

All AI features are powered by **IBM watsonx.ai — Granite 3 8B Instruct**, accessed via the watsonx.ai REST API from the Node.js backend.

**1. Text Formatting (`POST /api/stories/:id/process-text`)**
The manuscript is split into 1,200-word chunks. Each chunk is sent to Granite with a prompt instructing it to fix grammar, reformat dialogue with correct punctuation, and improve paragraph flow — without altering any plot details or character names. Chunks are processed sequentially and rejoined.

**2. Story Bible Extraction (runs alongside formatting)**
A 1,200-word sample is drawn from three points in the manuscript (beginning, middle, and end) to give Granite broad coverage of the story. Granite returns a structured JSON object containing arrays of characters, settings, and plot points. The backend parses the JSON and upserts each entry into the database — existing manually-entered entries are never overwritten by empty AI results.

**3. Continuity Analysis (`POST /api/stories/:id/check-continuity`)**
The Story Bible is serialised into a compact text summary and sent to Granite alongside a 2,000-word story excerpt. Granite returns a JSON array of flags — each with a `type` (continuity, plot_hole, show_dont_tell, suggestion), a `description`, and a concrete `suggestion` for the author to act on.

### Authentication Flow
Every API request is authenticated via Firebase Admin SDK — the frontend sends a Firebase ID token, the backend verifies it server-side, and resolves it to an internal user ID before any database query runs.

### Image Generation
Storyboard images are generated via **Pollinations.ai** (free, no API key required) using HTTPS GET requests. Image generation is fire-and-forget — it runs after the publish response is returned so the user never waits. Images are stored as base64 data URIs in the database.

### Architecture Overview

```
Browser (React + Vite + Carbon)
        │
        │  Firebase ID token on every request
        ▼
Node.js + Express (IBM Cloud Code Engine)
        │
        ├── Firebase Admin SDK  →  token verification
        ├── watsonx.ai REST API →  Granite 3 8B Instruct (text AI)
        ├── Pollinations.ai     →  storyboard image generation
        └── Supabase PostgreSQL →  all persistent data (RLS enabled)
```

---

## How IBM Bob Was Used

> IBM Bob (IBM's AI coding assistant) was the **primary development partner** for this project from day one.

Every sub-task, every file, and every bug fix in this project was planned, written, or diagnosed with IBM Bob. Specifically:

- **Project architecture** — Bob designed the full stack (React frontend, Node.js backend, Supabase DB, Firebase Auth, watsonx.ai) and scaffolded every file from scratch
- **All 9 sub-tasks** — Bob wrote the implementation for each sub-task end-to-end (see Development Journey below)
- **IBM infrastructure navigation** — When IBM Cloud Object Storage could not be provisioned on the SkillsBuild tier, Bob diagnosed the 403 errors, identified the missing Runtime service association, and discovered the Deployment Space workaround
- **Bug diagnosis** — Every runtime error (white screen crashes, CORS issues, Hugging Face DNS blocks, JSON truncation, COALESCE boolean bugs, Carbon Modal race conditions) was diagnosed and fixed by Bob
- **UI design** — The full navy brand theme, animated feature carousel, sidebar tab system, AI processing popup, and all hover interactions were designed and implemented by Bob
- **Token management** — Bob identified the cause of mid-JSON truncation (output token limit), redesigned the extraction sampling strategy, and added partial-recovery fallback logic
- **This README** — written by Bob based on the full development history

Bob was not used as a search engine or autocomplete — it was used as a true engineering partner, making architectural decisions, writing production code, and adapting to real constraints as they emerged.

---

## Development Journey — 9 Sub-Tasks

The project was planned and executed across 9 structured sub-tasks:

| # | Sub-Task | Key Technologies |
|---|----------|-----------------|
| 1 | **Project Scaffolding & Repository Setup** — Initialised React + Vite frontend and Node.js + Express backend, set up GitHub repo and environment templates | React, Node.js, GitHub |
| 2 | **Database Schema Design & Setup** — Designed full PostgreSQL schema across 16 migrations with Row Level Security on all 11 tables | PostgreSQL, Supabase, RLS |
| 3 | **Authentication & Onboarding** — Firebase Authentication for sign-up/login and a multi-step onboarding survey | Firebase Auth, Carbon UI |
| 4 | **Story Bible Editor (Core Dashboard)** — Split-panel writing workstation with auto-save, file upload (.txt/.docx), and full Story Bible sidebar | React, Carbon UI, Supabase |
| 5 | **IBM Granite AI Integration** — watsonx.ai Granite 3 8B for text formatting and Story Bible auto-extraction | IBM watsonx.ai, Granite |
| 6 | **AI Continuity Checker** — Granite cross-references manuscript against Story Bible and returns structured flags with actionable fixes | IBM Granite, Node.js |
| 7 | **Publishing Page & Storyboard Generation** — Public book profile page and async AI storyboard image generation | Pollinations.ai, Supabase |
| 8 | **Collaboration Feature** — Role-based invite system (viewer/editor) with email-based access control | Supabase, Express |
| 9 | **IBM Cloud Deployment & Final Polish** — Backend deployed to IBM Cloud Code Engine, full UI polish, Supabase RLS hardening | IBM Code Engine, CSS |

---

## IBM Tools Used

| Tool | Purpose |
|------|---------|
| **IBM watsonx.ai — Granite 3 8B Instruct** | Text formatting, grammar correction, story bible auto-extraction, continuity analysis |
| **IBM Cloud Code Engine** | Backend hosting and deployment |
| **IBM Carbon Design System** | UI component library (buttons, modals, tabs, forms, notifications) |
| **IBM Bob** | Primary development partner — architecture, implementation, debugging, and deployment |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + IBM Carbon Design System |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Authentication | Firebase Auth |
| AI (Text) | IBM watsonx.ai — Granite 3 8B Instruct |
| AI (Images) | Pollinations.ai (free, no API key required) |
| Hosting | IBM Cloud Code Engine |

---

## Project Structure

```
canonvault/
├── frontend/          # React app (Vite + Carbon Design System)
│   ├── src/
│   │   ├── components/   # StoryBiblePanel, ContinuityPanel, PublishModal, CollaboratorsPanel
│   │   ├── pages/        # Browse, Dashboard, StoryEditor, BookProfile, Login, Register, Onboarding
│   │   ├── services/     # api.js, auth.js
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── backend/           # Node.js + Express REST API
│   ├── src/
│   │   ├── routes/       # stories.js, auth.js, books.js, publish.js
│   │   ├── middleware/   # auth.js (Firebase token verification)
│   │   ├── services/     # granite.js (watsonx.ai), imagegen.js (Pollinations.ai)
│   │   └── db/           # PostgreSQL via Supabase + 16 migration files
│   ├── server.js
│   └── package.json
├── .env.example       # Environment variable template
└── README.md
```

---

## Getting Started (Local Development)

### Prerequisites
- Node.js v18+
- npm v9+
- A PostgreSQL database (Supabase free tier recommended)
- Firebase project (for authentication)
- IBM watsonx.ai API key and Deployment Space ID

### 1. Clone the repository
```bash
git clone https://github.com/Terran-M-R/CanonVault.git
cd CanonVault
```

### 2. Set up environment variables
```bash
cp .env.example backend/.env
```
Fill in all values in `backend/.env` — see `.env.example` for descriptions.

### 3. Install and run the backend
```bash
cd backend
npm install
npm run dev
```

### 4. Install and run the frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3001`.

### Local Development Workflow
All development was done locally before pushing to GitHub:
1. Run both servers locally (`npm run dev` in `backend/` and `frontend/`)
2. Test features at `http://localhost:5173`
3. Verify backend logs at `http://localhost:3001`
4. Once confirmed working: `git add .` → `git commit -m "..."` → `git push origin main`
5. Backend changes are then redeployed to IBM Cloud Code Engine

---

## IBM watsonx.ai — Token Quota & Demo Constraints

> **Important note for judges**

IBM watsonx.ai Deployment Spaces on the free tier are allocated **300,000 tokens per month** per account. This is a hard account-level limit shared across all spaces — creating additional spaces does not provide additional quota.

For the purposes of this hackathon demo, CanonVault was built and tested entirely within this free-tier constraint. Several real-world accommodations were made to stay within the limit:

- **Story Bible extraction** samples ~1,200 words spread across the manuscript (beginning, middle, and end) rather than processing the full text. This keeps each AI call within the model's context window while still giving meaningful cross-chapter coverage.
- **Demo content** was pre-populated in the Story Bible to show a fully filled-out example, with AI auto-extraction demonstrated on a focused excerpt. The UI also fully supports manual entry for any characters, settings, or plot points the AI does not capture.
- **Testing was carefully rationed** to preserve enough tokens for a clean live demo of all AI features (text formatting, bible extraction, and continuity checking).

In a production deployment, this constraint disappears entirely. IBM watsonx.ai's paid tiers provide usage-based billing with no monthly cap. A subscription model could be layered on top of CanonVault to pass through AI costs at scale — for example, metering tokens per user per month and upselling heavier AI usage to premium tiers.

The 300,000 token limit is not a reflection of CanonVault's capabilities — it is simply the boundary of what the free SkillsBuild account tier makes available for a hackathon project.

---

## IBM watsonx.ai — Deployment Space vs Studio Project

During development, IBM Cloud Object Storage (required to create a watsonx.ai Studio Project) could not be provisioned on the student SkillsBuild account tier. As a workaround, a **watsonx.ai Deployment Space** was used instead — it provides identical access to Granite model inference via the same REST API, with only a minor parameter change (`space_id` instead of `project_id`). There is zero functional difference for CanonVault users.

This solution was discovered collaboratively with IBM Bob, which helped diagnose the 403 errors, identify the missing Runtime service association, and pivot from Studio Project to Deployment Space — a real-world example of using AI to navigate unexpected infrastructure challenges.

---

## Hackathon Notes

- AI token usage is metered per request — token consumption scales with manuscript length
- A future subscription model is planned to manage AI costs at scale
- Image generation uses Pollinations.ai (free, no API key, no rate limits for this use case)
- Storyboard images are generated asynchronously after publishing so the user never waits

---

## Adding Screenshots to This README

To add screenshots (recommended for judges):

1. Create a folder in the repo: `docs/screenshots/`
2. Add your image files there (e.g. `dashboard.png`, `story-bible.png`)
3. Reference them in the README like this:

```markdown
![Dashboard](docs/screenshots/dashboard.png)
![Story Bible](docs/screenshots/story-bible.png)
```

GitHub renders these automatically. For best results use PNG files at around 1200px wide.

---

*IBM Global AI Builders Challenge July 2025 — Built by Terran Roberson (Terran-M-R)*
