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

> **Demo login:** any valid email + a 6+ character password. Auth is mocked client-side.

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

## 🔌 Wiring up a real backend

The UI talks to a mock service layer in `src/services/api.js`. Each method returns a promise with
simulated latency. To connect a real API, replace the bodies with `fetch`/`axios` calls — the
component contracts stay the same.

## 📄 License

MIT — sample/demo project.
