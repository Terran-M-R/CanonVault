# CanonVault

> A centralized creative writing management platform with AI-powered story bible, continuity checking, and public publishing.

Built for the **IBM Hackathon July 2025 — Reimagine Creative Industries with AI**.

---

## What is CanonVault?

CanonVault helps writers manage their creative work in one place. It combines:

- 📖 **Story Bible** — track characters, settings, and plot points
- 🤖 **AI Text Processing** — IBM Granite formats your writing into proper novel structure, fixes grammar, and formats dialogue
- 🔍 **Continuity Checker** — AI scans your manuscript against your story bible to catch plot holes and inconsistencies
- 🌐 **Public Publishing Page** — share your work with the world with a generated storyboard and book profile
- 👥 **Collaboration** — invite editors and co-writers via email

---

## IBM Tools Used

| Tool | Purpose |
|------|---------|
| **IBM watsonx.ai (Granite)** | Text formatting, grammar correction, story bible auto-extraction, continuity analysis |
| **IBM Cloud Code Engine** | Backend hosting and deployment |

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
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── backend/           # Node.js + Express REST API
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── db/
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

This solution was discovered collaboratively with IBM's AI assistant (Bob), which helped diagnose the 403 errors, identify the missing Runtime service association, and pivot from Studio Project to Deployment Space — a real-world example of using AI to navigate unexpected infrastructure challenges.

---

## Hackathon Notes

- AI token usage is metered per request — token consumption scales with manuscript length
- A future subscription model is planned to manage AI costs at scale
- Image generation uses Pollinations.ai (free, no API key, no rate limits for this use case)
- Storyboard images are generated asynchronously after publishing so the user never waits

---

*IBM Hackathon July 2025 submission by Terran-M-R*
