# GTC 2026 Session Advisor

AI-powered assistant for NVIDIA GTC 2026 attendees. Browse 954 sessions across 6 days, explore after-parties, and get personalized recommendations from **nemo** — an agent built with [Mastra](https://mastra.ai).

![Built with Mastra](https://img.shields.io/badge/built%20with-Mastra-76b900)

## Features

- **Session Browser** — Search, filter by day/type, view detailed session info with speakers and schedules
- **After-Party Guide** — 35 GTC after-parties with descriptions, locations, RSVP links, and sponsor info
- **AI Chat (nemo)** — Conversational agent that recommends sessions based on your role, interests, and experience level
- **Itinerary Builder** — Save sessions and parties to a personal schedule with conflict detection
- **Observational Memory** — Agent learns your preferences over the conversation via Mastra's observational memory
- **Mobile Responsive** — Full mobile layout with tab navigation

## Architecture

```
├── src/mastra/          # Mastra backend (agent, tools, memory)
│   ├── agents/          # gtc-advisor agent definition
│   └── tools.ts         # Session search, filter, schedule, itinerary tools
├── web/                 # Vite + React frontend
│   ├── src/components/  # EventsPanel, SessionDetail, PartyDetail, Chat, etc.
│   └── public/          # Static assets (sessions.json, parties.json)
└── package.json         # Root package with dev/build scripts
```

**Backend:** Mastra agent with 10 tools (search, filter, recommend, schedule, itinerary CRUD) running on Hono server. Uses LibSQL for memory storage and OpenRouter for model access (Nemotron-3 Super 120B).

**Frontend:** React 19 + Vite + Tailwind CSS 4 + shadcn/ui. Chat powered by `@ai-sdk/react` `useChat` hook streaming from Mastra's chat route.

## Setup

### Prerequisites

- Node.js 20+
- npm

### Environment Variables

Create a `.env` file in the project root:

```env
OPENROUTER_API_KEY=sk-or-v1-...       # Required — OpenRouter API key for model access
GOOGLE_GENERATIVE_AI_API_KEY=...       # Required — Gemini API key for observational memory
```

### Install & Run

```bash
# Install dependencies (root + web)
npm install && npm install --prefix web

# Start dev servers (Mastra API :4111 + Vite :5173)
npm run dev
```

### Build for Production

```bash
# Build Mastra API
npm run build:api

# Build frontend
npm run build:web
```

## Deployment (Railway)

This project deploys as **two Railway services** from one repo:

### API Service
- **Root directory:** `/`
- **Build:** `npm install && npx mastra build`
- **Start:** `npx mastra start`
- **Env vars:** `OPENROUTER_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `PORT` (Railway sets automatically)

### Web Service
- **Root directory:** `/web`
- **Build:** `npm install && npm run build`
- **Start:** Static site — serve from `dist/`
- **Env var:** `VITE_API_URL` (set to API service URL, e.g. `https://api-xxx.up.railway.app`)

## Tech Stack

- [Mastra](https://mastra.ai) — Agent framework with memory, tools, and streaming
- [OpenRouter](https://openrouter.ai) — Model access (NVIDIA Nemotron-3 Super 120B)
- [Vite](https://vite.dev) + [React 19](https://react.dev) — Frontend
- [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) — Styling
- [AI SDK](https://ai-sdk.dev) — Chat streaming (`useChat` hook)
- [LibSQL](https://turso.tech/libsql) — Local memory storage

## Credits

- Session data from [NVIDIA GTC 2026](https://www.nvidia.com/gtc/)
- After-party listings from [conferenceparties.com](https://conferenceparties.com/nvidia26/)
