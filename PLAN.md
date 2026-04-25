# MaestroUI — Implementation Plan

## Overview

MaestroUI is the React/TypeScript dashboard for the Maestro AI workflow
orchestrator. It provides a visual interface for composing, scheduling, and
monitoring automated workflows across the MiMi cluster.

---

## 1. Repository Landscape

| Repo | Role for MaestroUI |
|------|-------------------|
| **MaestroUI** (this repo) | Frontend source code, Dockerfile, tests |
| **Maestro** | Backend API (Go orchestrator) |
| **MiMi** | Kubernetes manifests |

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript ~5.7 | Strict mode, type-safe API integration |
| Framework | React 19 | Component model, hooks |
| Bundler | Vite 6 | Fast HMR, optimized builds |
| Routing | react-router 7 | Nested layouts |
| Data fetching | TanStack Query 5 | Caching, deduplication |
| Validation | Zod 3 | Runtime parsing |
| Testing | Vitest + RTL | Fast component tests |
| Styling | Vanilla CSS | Full control |
| Typography | Inter (Google Fonts) | Clean, modern |
| Runtime | nginx-unprivileged | Static SPA serving |

---

## 3. Design System

- **Theme**: Dark mode with deep navy/charcoal surfaces
- **Accents**: Amber-to-rose gradient (`#f59e0b` → `#f43f5e`)
- **Effects**: Glassmorphism, backdrop blur
- **Animations**: Fade-in-up, gradient shifts, pulse indicators
- **Responsive**: Mobile-first

---

## 4. Project Structure

```
MaestroUI/
├── src/
│   ├── api/           API client, logger, query client, health
│   ├── components/    Layout, reusable UI
│   ├── pages/         Dashboard, Workflows, Runs, Services
│   ├── test/          Test setup
│   ├── index.css      Design system
│   ├── main.tsx       Entry point
│   └── router.tsx     Routes
├── deploy/nginx.conf
├── Dockerfile
├── package.json
└── vite.config.ts
```

---

## 5. Configuration

| Variable | Default (dev) | Description |
|----------|---------------|-------------|
| `VITE_MAESTRO_API_BASE_URL` | `http://localhost:8002` | Maestro API base URL |

---

## 6. Implementation Order

| Phase | Scope | Status |
|-------|-------|--------|
| ~~Phase 1~~ | Project skeleton: design system, layout, health check | ✅ Done |
| Phase 2 | Workflow list and detail pages | Planned |
| Phase 3 | Workflow composer (visual step editor) | Planned |
| Phase 4 | Run monitoring with live status updates | Planned |
| Phase 5 | Schedule management UI | Planned |
| Phase 6 | Service health dashboard | Planned |

---

## 7. Pages (Planned)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Overview, active runs, service health |
| `/workflows` | Workflows | List, create, edit workflows |
| `/workflows/{id}` | Workflow Detail | Steps, schedule, run history |
| `/runs` | Runs | Recent runs with status |
| `/runs/{id}` | Run Detail | Step-by-step execution log |
| `/services` | Services | Upstream service health and config |
