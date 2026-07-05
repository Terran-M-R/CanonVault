# CanonVault

> A centralized creative writing management platform with AI-powered story bible, continuity checking, and public publishing.

Built for the **IBM Hackathon July 2026 — Reimagine Creative Industries with AI**.

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
| AI (Text) | IBM watsonx.ai — Granite models |
| AI (Images) | Hugging Face Inference API |
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
- IBM watsonx.ai API key
- Hugging Face API token

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

## Hackathon Notes

- AI token usage is scoped per request — for demo purposes, usage is unrestricted
- A future subscription model is planned to manage AI costs at scale
- Image generation uses Hugging Face free tier — may have rate limits during peak hours

---

*IBM Hackathon July 2026 submission by Terran-M-R*
