# IntervAI — AI-Powered Interview Analysis Platform

A modern, responsive React frontend for an AI-based interview analysis platform. Upload interview
recordings, run them through an AI pipeline, and explore detailed communication insights —
speech-to-text, sentiment analysis, confidence estimation, and automated summary reports.

![Tech](https://img.shields.io/badge/React-18-61dafb) ![Vite](https://img.shields.io/badge/Vite-5-646cff) ![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8)

## ✨ Features

- **Landing page** — hero, features, "how it works", testimonials, CTA, footer
- **Authentication** — login, register (with password strength), forgot password, client-side validation
- **Dashboard** — stat cards, analytics charts, sentiment distribution, recent analyses table
- **Upload** — drag-and-drop, audio/video preview, simulated upload progress
- **Processing** — animated AI pipeline with live progress and per-step status
- **Analysis Results** — overview, searchable transcript, sentiment charts, confidence gauge,
  communication metrics, and an AI summary report with PDF download
- **Settings** — profile, change password, notification preferences, appearance/theme
- **Dark / Light mode** with persisted preference and system detection
- **Reusable UI kit** — buttons, cards, inputs, modal, toasts, badges, skeletons, switches
- Smooth animations with **Framer Motion** and charts with **Recharts**
- Fully responsive across desktop, tablet, and mobile

## 🧰 Tech Stack

| Concern        | Library                |
| -------------- | ---------------------- |
| Framework      | React 18 + Vite        |
| Styling        | Tailwind CSS 3         |
| Routing        | React Router 6         |
| Charts         | Recharts               |
| Animation      | Framer Motion          |
| Icons          | Lucide React           |

## 🚀 Getting Started

```bash
# install dependencies
npm install

# start the dev server (http://localhost:5173)
npm run dev

# production build
npm run build

# preview the production build
npm run preview
```

> **Demo login:** `aarav.mehta@example.com` / `password123` (seeded by the backend — see below).

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/            # Reusable primitives (Button, Card, Input, Modal, Toast, …)
│   ├── charts/        # Recharts wrappers (pie, timeline, gauge, trend, area)
│   ├── landing/       # Landing page sections (Navbar, Hero, Features, …)
│   ├── dashboard/     # StatCard, RecentAnalysesTable
│   └── results/       # TranscriptViewer, MetricTile
├── context/           # ThemeContext, AuthContext, ToastContext
├── layouts/           # DashboardLayout, AuthLayout, Sidebar, Topbar
├── pages/             # Landing, auth/*, Dashboard, Upload, Processing, Results, Settings
├── services/          # api.js (mock service layer) + mockData.js (dummy data)
├── utils/             # cn, validation, format helpers
├── App.jsx            # Route definitions + guards
├── main.jsx           # App entry + provider tree
└── index.css          # Tailwind + design tokens
```

## 🎨 Design System

Colors are exposed both as fixed brand tokens and as semantic, theme-aware surfaces driven by CSS
variables (see `src/index.css` and `tailwind.config.js`).

| Token     | Value     |
| --------- | --------- |
| Primary   | `#4F46E5` |
| Secondary | `#7C3AED` |
| Accent    | `#06B6D4` |
| Success   | `#10B981` |
| Warning   | `#F59E0B` |
| Danger    | `#EF4444` |

Semantic surfaces (`surface`, `surface-2`, `ink`, `line`, …) automatically adapt between light and
dark themes, so components are written once and theme correctly.

## 🖥️ Backend (multi-tenant)

The API in [`server/`](./server) is a multi-tenant SaaS backend: Postgres, org memberships + RBAC,
JWT access tokens plus an httpOnly refresh cookie, S3-compatible or local object storage, a
BullMQ worker (Redis) or in-process queue, usage quotas, retention sweeps, Stripe checkout, and
an AI adapter (`AI_PROVIDER=mock` or `live`).

### Local infrastructure

```bash
docker compose up -d postgres redis
# Postgres is published on host port 5434 (see docker-compose.yml) because 5432 is already in use.
cd server
copy .env.example .env   # Windows; use cp on macOS/Linux
npm install
npx prisma generate
npx prisma db push
npm test
npm start                # API on :4000 (also runs an in-process worker if REDIS_URL is unset)

# Optional dedicated worker when Redis is running:
npm run worker
```

Frontend (repo root): `npm install && npm run dev` — Vite proxies `/api` to port 4000.

**Demo login:** `aarav.mehta@example.com` / `password123` (seeded on first boot).

Set `AI_PROVIDER=live` plus `OPENAI_API_KEY` and/or `DEEPGRAM_API_KEY` for real STT + LLM reports.
Leave `S3_BUCKET` empty to store recordings on disk under `server/data/uploads`.

### Production deploy

- Run `Dockerfile` (API) and `Dockerfile.worker` (pipeline) against managed Postgres + Redis.
- Set `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `COOKIE_SECURE=true`,
  and CORS origin to the real frontend URL. Run `npx prisma db push` or `prisma migrate deploy`.
- Point the Vite build at the API with `VITE_API_URL=https://api.example.com/api`.
- Optional: `STRIPE_*`, `RESEND_API_KEY`, `S3_*`. Logs are JSON on stdout (`X-Request-Id` on every response).

### API overview

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `POST` | `/api/auth/register` | Create user + org → `{ user, token }` + refresh cookie |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/refresh` | Rotate refresh cookie → new access token |
| `POST` | `/api/auth/logout` | Clear refresh cookie |
| `POST` | `/api/auth/forgot-password` | Email a reset link (always OK) |
| `POST` | `/api/auth/reset-password` | Set password from token |
| `GET`  | `/api/users/me` | Profile + memberships |
| `PATCH`| `/api/users/me` | Update profile |
| `POST` | `/api/users/me/password` | Change password |
| `GET`  | `/api/orgs/me` | Workspace, members, usage |
| `POST` | `/api/orgs/me/invites` | Invite a teammate (admin) |
| `GET`  | `/api/dashboard/stats` | Org-scoped stat cards |
| `GET`  | `/api/dashboard/overview` | 12-month analytics series |
| `GET`  | `/api/dashboard/recent` | Recent analyses (`?limit=6`) |
| `GET`  | `/api/analyses` | List analyses (`?limit=20`) |
| `POST` | `/api/analyses` | Upload (`file` + `candidateConsent=true`) |
| `GET`  | `/api/analyses/:id` | Full analysis document |
| `GET`  | `/api/analyses/:id/status` | Pipeline progress |
| `POST` | `/api/analyses/:id/retry` | Re-queue a failed job |
| `GET`  | `/api/analyses/:id/report.pdf` | PDF report |
| `GET`  | `/api/billing/usage` | Quota snapshot |
| `POST` | `/api/billing/checkout` | Stripe Checkout session |
| `POST` | `/api/billing/webhook` | Stripe webhooks (raw body) |

Authenticated routes expect `Authorization: Bearer <access token>` and send cookies with
`credentials: include`. Recruiter/admin/owner may upload; viewers cannot. Uploads require
candidate consent, are quota- and concurrency-capped, and media is deleted after
`MEDIA_RETENTION_DAYS`.

### AI pipeline

`AI_PROVIDER=mock` uses the deterministic generator in `server/src/services/ai/engine.js`.
`live` transcribes with Deepgram or Whisper, derives sentiment/confidence/metrics from timestamps,
and asks an LLM for the summary JSON the Results UI already expects.

```
server/
├── prisma/                # Postgres schema
├── src/
│   ├── index.js           # API
│   ├── worker.js          # BullMQ worker
│   ├── db.js              # Prisma helpers + seed
│   ├── routes/            # auth, users, orgs, dashboard, analyses, billing
│   └── services/          # storage, queue, usage, retention, email, ai/
└── test/                  # result-contract tests
```

## 📄 License

MIT — sample/demo project.
