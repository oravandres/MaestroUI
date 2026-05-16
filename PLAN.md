# MaestroUI — Implementation Plan

> **Repository:** `github.com/oravandres/MaestroUI`
> **Role:** Frontend dashboard for the Maestro AI platform
> **Backend:** Maestro (Go orchestrator on MiMi K3s)
> **Compute:** Darkbase RTX 5090 (fast) + Sparky DGX Spark (premium)
> **Priority:** Main features first. Build a usable vertical slice before advanced polish.
> **Status:** Foundation, runtime proxy/BFF hardening, API contract alignment,
> Phase 4 chat UX, Phase 5 core Jobs & Queue UX, the safe Phase 6 Knowledge
> Management slice, the Phase 7 RAG Studio run detail (confidence, evidence,
> citations, retrieval rounds, and verification display), the Phase 8 Coding
> Review surface (structured findings, architecture notes, test suggestions,
> and routed review variants), the Phase 9 Media Studio slice (dedicated
> TTS/ASR forms with voice/style/language, inline job status polling, and
> asset gallery preview thumbnails), the Phase 10 Reasoning surface
> (structured Compare results with score matrix and weighted totals and
> structured Analyze results with key-point and risk cards), and the
> Phase 11 Settings & Monitoring slice (live JSON validation with audit
> confirmation for sensitive settings, monitoring source filter, and
> latency p95 tile), and the Polish & Performance batch (route-level
> lazy loading with Suspense fallback and vendor `manualChunks` shrinking
> the app shell from 491 kB to a 21 kB shell plus stable vendor chunks)
> are merged, along with the Reliability & UX batch (top-level
> `RouteErrorBoundary` that recovers from chunk-load failures and render
> errors, and sidebar hover/focus prefetch so cold-route navigation feels
> instant) and the API contract reconciliation batch (Dashboard summary,
> Settings, Monitoring overview, and Monitoring alerts schemas now match
> what Maestro actually ships, plus the Jobs queue summary degrades
> gracefully when the backend errors and the deploy refresh procedure is
> documented in the README). Next focus: pending — most concrete
> frontend work that doesn't depend on backend contract work is shipped,
> so the next batch will be chosen based on user priorities or new
> backend capabilities landing in Maestro.

---

## 0. Mission

MaestroUI is the single interface for the local AI platform.

It must provide a premium, responsive dashboard for:

- chatting with local AI models (fast and premium)
- managing and querying a private knowledge base with agentic RAG
- submitting and monitoring AI jobs (media, audio, coding)
- observing system health, model status, and platform activity
- configuring platform settings

MaestroUI talks only to the Maestro backend API. It never calls Sparky or Darkbase directly.

---

## 1. Repository Landscape

| Repo | Role for MaestroUI |
|------|-------------------|
| **MaestroUI** (this repo) | Frontend source code, Dockerfile, tests |
| **Maestro** | Backend API (Go orchestrator) |
| **Sparky** | Premium AI compute (DGX Spark) — called by Maestro, not MaestroUI |
| **MiMi** | Kubernetes manifests |

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript ~5.7 | Strict mode, type-safe API integration |
| Framework | React 19 | Component model, hooks |
| Bundler | Vite 6 | Fast HMR, optimized builds |
| Routing | react-router 7 | Nested layouts |
| Data fetching | TanStack Query 5 | Caching, deduplication, polling |
| Validation | Zod 3 | Runtime parsing of API responses |
| Testing | Vitest + RTL | Fast component tests |
| Styling | Vanilla CSS | Full control |
| Typography | Inter (Google Fonts) | Clean, modern |
| Icons | Lucide React | Consistent, lightweight |
| Runtime | nginx-unprivileged | Static SPA serving plus `/api/v1` BFF proxy |

---

## 3. Design System

- **Theme**: Dark mode with deep navy/charcoal surfaces
- **Accents**: Amber-to-rose gradient (`#f59e0b` → `#f43f5e`)
- **Effects**: Glassmorphism, backdrop blur
- **Animations**: Fade-in-up, gradient shifts, pulse indicators
- **Responsive**: Mobile-first
- **Status colors**: Green (healthy/hot), amber (degraded/loading), red (offline/failed), gray (unknown/cold)
- **Model state indicators**: Visual badges for hot/cold/loading/evicting states from Sparky

---

## 4. Project Structure

This is the current core structure plus planned feature extraction points.
Most feature workflows currently live in page components; split them into
feature components as those workflows deepen.

```
MaestroUI/
├── src/
│   ├── api/
│   │   ├── client.ts          # Fetch wrapper, BFF-aware base URL
│   │   ├── queryClient.ts     # TanStack Query config
│   │   ├── dashboard.ts       # Dashboard summary hooks
│   │   ├── health.ts          # Health check hooks
│   │   ├── systems.ts         # Systems API hooks
│   │   ├── chat.ts            # Chat/conversation API hooks and SSE client
│   │   ├── jobs.ts            # Jobs API hooks
│   │   ├── knowledge.ts       # Knowledge/document API hooks
│   │   ├── rag.ts             # RAG API hooks
│   │   ├── reasoning.ts       # Reasoning analyze/compare hooks
│   │   ├── coding.ts          # Coding review API hooks
│   │   ├── media.ts           # Media/audio API hooks
│   │   ├── monitoring.ts      # Dashboard/monitoring API hooks
│   │   ├── settings.ts        # Settings API hooks
│   │   ├── parse.ts           # Shared Zod parsing helpers
│   │   └── logger.ts          # API error logging helpers
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Layout.tsx
│   │   │   └── MobileNav.tsx
│   │   ├── common/
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── ModelStateBadge.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   ├── LoadingState.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── DataTable.tsx
│   │   ├── chat/
│   │   │   ├── ConversationList.tsx
│   │   │   ├── MessageThread.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── StreamingMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ModeSelector.tsx
│   │   │   └── SourceCitations.tsx
│   │   ├── rag/
│   │   │   ├── RagRunCard.tsx
│   │   │   ├── RetrievalRounds.tsx
│   │   │   ├── EvidencePanel.tsx
│   │   │   ├── CitationList.tsx
│   │   │   └── ConfidenceBadge.tsx
│   │   ├── jobs/
│   │   │   ├── JobCard.tsx
│   │   │   ├── JobTimeline.tsx
│   │   │   ├── QueueOverview.tsx
│   │   │   └── WorkerStatus.tsx
│   │   ├── knowledge/
│   │   │   ├── SourceCard.tsx
│   │   │   ├── DocumentList.tsx
│   │   │   ├── UploadDialog.tsx
│   │   │   └── IndexingProgress.tsx
│   │   ├── coding/
│   │   │   ├── ReviewForm.tsx
│   │   │   ├── FindingsList.tsx
│   │   │   └── FindingCard.tsx
│   │   ├── media/
│   │   │   ├── GenerationForm.tsx
│   │   │   ├── AssetGallery.tsx
│   │   │   └── AssetCard.tsx
│   │   └── systems/
│   │       ├── SystemCard.tsx
│   │       ├── ModelCard.tsx
│   │       └── HealthIndicator.tsx
│   ├── hooks/
│   │   ├── useStreaming.ts     # SSE hook for chat streaming
│   │   ├── usePolling.ts      # Job/system status polling
│   │   └── useDebounce.ts
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── ConversationPage.tsx
│   │   ├── RagStudioPage.tsx
│   │   ├── RagRunPage.tsx
│   │   ├── KnowledgePage.tsx
│   │   ├── JobsPage.tsx
│   │   ├── JobDetailPage.tsx
│   │   ├── CodingPage.tsx
│   │   ├── MediaPage.tsx
│   │   ├── SystemsPage.tsx
│   │   ├── ModelsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── MonitoringPage.tsx
│   ├── test/
│   │   └── setup.ts
│   ├── index.css              # Design system
│   ├── main.tsx               # Entry point
│   └── router.tsx             # Routes
├── deploy/nginx.conf.template
├── Dockerfile
├── package.json
└── vite.config.ts
```

---

## 5. Configuration

| Variable | Default (dev) | Description |
|----------|---------------|-------------|
| `VITE_MAESTRO_API_BASE_URL` | same origin | Optional public Maestro API base URL override. Leave unset for the proxy/BFF path. |
| `MAESTRO_API_PROXY_TARGET` | `http://localhost:8002` | Server-only target used by Vite dev proxy and production nginx BFF. |
| `MAESTRO_API_KEY` | none | Server-only bearer token injected by the proxy. Never expose as `VITE_*`. |

Browser code should prefer relative `/api/v1/*` requests so the dev server or
production BFF can inject credentials without exposing secrets in the bundle.

---

## 6. Pages

### 6.1 Dashboard (`/`)

Overview of the entire platform.

Data sources:

```http
GET /api/v1/dashboard/summary
GET /api/v1/systems
GET /api/v1/monitoring/events?limit=10
```

Content:

- System health cards (MiMi, Darkbase, Sparky) with status indicators
- Active model count and residency state summary
- Recent conversations count
- Active/queued/failed job counts
- Recent events timeline
- Quick-action buttons: New Chat, Upload Document, Submit Job

### 6.2 Chat (`/chat`, `/chat/{id}`)

Primary conversational interface.

Data sources:

```http
GET    /api/v1/conversations
POST   /api/v1/conversations
GET    /api/v1/conversations/{id}
PATCH  /api/v1/conversations/{id}
DELETE /api/v1/conversations/{id}
POST   /api/v1/conversations/{id}/messages (SSE when stream=true)
```

Content:

- Conversation list sidebar with search/filter
- Message thread with role-based styling (user, assistant, system)
- Mode selector: Fast, Premium, Auto, Agentic RAG, Coding, Reasoning
- Streaming message display (token-by-token rendering via SSE)
- Source citations inline when RAG mode returns sources
- Message metadata: model used, system, latency, token usage
- Auto-generated conversation titles

Streaming implementation:

- Use `EventSource` or `fetch` with `ReadableStream` for SSE
- Display tokens as they arrive in a `StreamingMessage` component
- Show typing indicator during stream
- On `done` event, persist final message with metadata

### 6.3 RAG Studio (`/rag`, `/rag/{id}`)

Inspect and monitor agentic RAG runs.

Data sources:

```http
GET  /api/v1/rag/runs
GET  /api/v1/rag/runs/{id}
POST /api/v1/rag/agentic
```

Content:

- RAG run list with status, confidence, question preview
- Run detail view:
  - Original question
  - Retrieval plan from Sparky
  - Retrieval rounds (queries, results, reranking)
  - Evidence panel with chunk text and source references
  - Synthesized answer with inline citations
  - Verification results: supported claims, unsupported claims, contradictions
  - Confidence badge (high/medium/low)
  - Timing breakdown per step

### 6.4 Knowledge (`/knowledge`)

Manage the private knowledge base that feeds RAG.

Data sources:

```http
GET   /api/v1/knowledge/sources
POST  /api/v1/knowledge/sources
GET   /api/v1/knowledge/sources/{id}
PATCH /api/v1/knowledge/sources/{id}
GET   /api/v1/knowledge/documents
POST  /api/v1/knowledge/documents
POST  /api/v1/knowledge/documents/upload
GET   /api/v1/knowledge/documents/{id}
POST  /api/v1/knowledge/documents/{id}/index
```

Content:

- Source list with type, status, document count
- Source detail with documents
- Document upload dialog (drag-and-drop, multipart)
- Supported formats: PDF, Markdown, plain text
- Indexing progress indicator per document
- Document chunk count and vector status

### 6.5 Jobs & Queue (`/jobs`, `/jobs/{id}`)

Monitor all background jobs across the platform.

Data sources:

```http
GET  /api/v1/jobs
POST /api/v1/jobs
GET  /api/v1/jobs/{id}
POST /api/v1/jobs/{id}/cancel
GET  /api/v1/jobs/{id}/events
GET  /api/v1/queues
GET  /api/v1/workers
```

Content:

- Job list with filters (status, type, system)
- Job types: media.image, media.video, audio.tts, audio.asr, rag.index, coding.review
- Job detail with timeline of events
- Progress bar for running jobs
- Cancel button for queued/running jobs
- Queue overview: total queued, running, completed, failed
- Worker status cards with heartbeat

### 6.6 Coding Review (`/coding`)

Submit code for AI-powered review.

Data sources:

```http
POST /api/v1/coding/review
POST /api/v1/coding/architecture
POST /api/v1/coding/refactor-plan
POST /api/v1/coding/security-review
```

Content:

- Submission form: task type, repository name, language, code/diff input, instructions
- Structured findings display:
  - Severity badges (critical, high, medium, low, nit)
  - File path and line number
  - Explanation and recommendation
- Architecture notes section
- Tests-to-add suggestions
- Final recommendation badge (approve, request_changes, needs_human_review)

### 6.7 Media Studio (`/media`)

Generate images, video, and audio.

Data sources:

```http
POST /api/v1/media/image
POST /api/v1/media/video
POST /api/v1/audio/tts
POST /api/v1/audio/asr
GET  /api/v1/media/assets
GET  /api/v1/media/assets/{id}
```

Content:

- Tab layout: Images, Videos, Audio
- Image generation form: prompt, negative prompt, model, dimensions, steps, seed
- Video generation form: prompt, model, duration, resolution, FPS
- TTS form: text, model, language, voice, style
- ASR form: audio file upload, model, language
- Asset gallery with thumbnails/previews
- Job status inline while generating
- Model availability indicators (hot/cold state from Sparky)

### 6.8 Systems & Models (`/systems`, `/models`)

Monitor infrastructure health and model status.

Data sources:

```http
GET  /api/v1/systems
GET  /api/v1/systems/{id}
GET  /api/v1/models
GET  /api/v1/models/{id}
POST /api/v1/systems/refresh
```

Content:

- System cards: MiMi, Darkbase, Sparky
  - Status indicator (healthy, degraded, offline)
  - Base URL, last seen timestamp
  - Capabilities list
- Model list with:
  - Name, capability, quality tier
  - System assignment
  - Residency state badge: 🟢 hot, ⚪ cold, 🟡 loading, 🔴 evicting
  - Context window size
- Refresh button to re-poll provider health

### 6.9 Reasoning (`/reasoning`)

Structured reasoning tools powered by Sparky.

Data sources:

```http
POST /api/v1/reasoning/analyze
POST /api/v1/reasoning/compare
```

Content:

- Tab layout: Analyze, Compare
- Analyze form: task description, context, criteria list, output style, max tokens
- Analyze results: summary, key points, risks, assumptions, recommendation, confidence
- Compare form: question, options list (id, name, description), criteria list (id, name, weight), constraints
- Compare results: score matrix, weighted totals, recommendation with reasoning and caveats

### 6.10 Settings (`/settings`)

Platform configuration.

Data sources:

```http
GET   /api/v1/settings
PATCH /api/v1/settings
```

Content:

- Settings grouped by category (general, providers, RAG, jobs, security)
- Masked secret display (never show full values)
- Edit form with validation
- Save confirmation
- Audit note on sensitive changes

### 6.11 Monitoring (`/monitoring`)

Platform observability.

Data sources:

```http
GET /api/v1/monitoring/overview
GET /api/v1/monitoring/events
GET /api/v1/monitoring/alerts
```

Content:

- System health overview
- Event log with level filtering (info, warn, error)
- Active alerts
- Request metrics summary
- Model usage breakdown

---

## 7. API Integration Patterns

### 7.1 Auth and API Routing

Maestro requires `Authorization: Bearer <MAESTRO_API_KEY>` on all `/api/v1/*` endpoints. A browser SPA cannot securely hold a static API key, so all API traffic flows through a reverse proxy that injects the header:

```text
Production (nginx BFF):
  Browser  ─── /api/v1/* ───►  nginx  ─── Authorization: Bearer <key> ───►  Maestro :8002
  Browser  ─── /* ──────────►  nginx  ─── static SPA files

Development (Vite proxy):
  Browser  ─── /api/v1/* ───►  Vite  ─── Authorization: Bearer <key> ───►  Maestro :8002
```

**Current state:**
1. **Development**: `/api/v1/*` goes through Vite's proxy by default.
   `VITE_MAESTRO_API_BASE_URL` is only an explicit escape hatch for direct API
   calls.
2. **Production**: nginx serves the SPA and proxies `/api/v1/*` to Maestro,
   injecting the bearer token from server-only runtime env. `index.html` stays
   uncached and hashed static assets stay immutable.
3. **CI**: the container smoke test exercises static serving and the `/api/v1`
   BFF proxy path, including path preservation and bearer-token injection.

The browser never sees or sends the raw API key.

### 7.2 Error Handling

Map Maestro error codes to stable UI outcomes:

```text
unauthorized        → redirect to config / show auth error
not_found           → show empty state
validation_error    → show inline field errors
provider_unavailable → show degraded banner, allow retry
provider_timeout    → show timeout message, allow retry
internal_error      → show generic error, log details
```

### 7.3 Streaming (SSE)

For chat with `stream: true`:

```typescript
// All requests go through the BFF proxy (nginx in prod, Vite in dev).
// The proxy injects the Authorization header; the browser never holds the key.
const response = await fetch(`${getApiBaseUrl()}/api/v1/conversations/${id}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'same-origin',
  body: JSON.stringify({ message, mode, stream: true }),
});

const reader = response.body.getReader();
// Process SSE events: 'token' for deltas, 'done' for final metadata
```

Cancel in-flight streams when the user navigates away or starts a new message.

### 7.4 Polling

For job status and system health, use TanStack Query's `refetchInterval`:

- Jobs in `running` state: poll every 2s
- System health on dashboard: poll every 30s
- Stop polling when component unmounts or status is terminal

### 7.5 Loading, Error, and Empty States

Every async view must explicitly model:

- **Loading**: skeleton/shimmer matching the expected content shape
- **Error**: error message with retry action
- **Empty**: friendly message with call-to-action (e.g., "No conversations yet — start chatting")

---

## 8. Implementation Order

Current merged baseline: the app shell, navigation, dashboard, systems/models,
chat, jobs, knowledge, RAG, coding, media, reasoning, settings, and monitoring
routes all have thin vertical UI slices. The Maestro backend currently exposes
health, systems, and models endpoints; the other page APIs must continue to
handle unavailable endpoints gracefully until those backend phases ship.

| Phase | Scope | Status |
|-------|-------|--------|
| ~~Phase 1~~ | Project skeleton: design system, layout shell, health check | ✅ Done |
| ~~Phase 2~~ | Navigation, layout, and Dashboard page | ✅ Done |
| ~~Phase 3~~ | Systems & Models pages | ✅ Done |
| ~~Phase 4~~ | Chat with streaming | ✅ Done |
| Phase 5 | Jobs & Queue | Core UX done; worker visibility deferred until backend contract exists |
| Phase 6 | Knowledge Management | Source/document management and detail views done; indexing deferred until backend contract exists |
| Phase 7 | RAG Studio | Structured run detail, confidence, citations, and verification display done; deeper variants follow backend evolution |
| Phase 8 | Coding Review | Structured findings, architecture notes, test suggestions, and routed review variants done |
| Phase 9 | Media Studio (images, video, audio) | Image/video generation, audio TTS, ASR upload, dedicated TTS/ASR forms with voice/style/language, inline job status polling, and asset gallery preview thumbnails done |
| Phase 10 | Reasoning tools (analyze, compare) | Structured Compare results (score matrix, weighted totals, recommendation) and structured Analyze results (key points and risks) done |
| Phase 11 | Settings & Monitoring | Live JSON validation with audit confirmation for sensitive settings, monitoring event log source filter, and the original latency p95 tile done — latency tile later removed when contract reconciliation showed Maestro does not ship the field |
| Polish & Performance | Bundle hygiene, code-split, and developer experience | Route-level lazy loading and vendor `manualChunks` done; the app shell is 21 kB and each lazy page chunk is fetched on first navigation only |
| Reliability & UX | Error recovery and perceived performance | Top-level `RouteErrorBoundary` and sidebar hover/focus prefetch done |
| API contract reconciliation | Match Maestro's actual shapes | Dashboard, Settings, Monitoring overview, Monitoring alerts schemas realigned with what Maestro ships; Jobs queue summary degrades gracefully on 5xx; deploy refresh documented in `README.md` |

### Phase 2 — Navigation, Layout, Dashboard

Tasks:

- [x] Sidebar navigation with icons and active state.
- [x] Header with platform name and connection status.
- [x] Mobile-responsive navigation.
- [x] Dashboard page with system health cards.
- [x] Dashboard summary stats (conversations, jobs, models).
- [x] Recent events timeline on dashboard.
- [x] Quick-action buttons.
- [x] Configure Vite dev proxy for `/api/v1/*` → `localhost:8002` with auth header injection.
- [x] Update `client.ts` to support relative paths when `VITE_MAESTRO_API_BASE_URL` is unset (for production nginx BFF).

Acceptance criteria:

- [x] All navigation links work.
- [ ] Dashboard shows real data from Maestro API.
- [x] Layout is responsive.

### Phase 3 — Systems & Models

Tasks:

- [x] Systems list page with health cards.
- [x] System detail view with capabilities.
- [x] Models list with residency state badges (hot/cold/loading/evicting).
- [x] Model detail view.
- [x] Refresh button to re-poll health.
- [x] Auto-polling system status.

Acceptance criteria:

- [x] MiMi, Darkbase, Sparky displayed with correct status.
- [x] Model residency state updates in real-time.
- [x] Offline provider shows degraded state.

### Phase 4 — Chat with Streaming

Tasks:

- [x] Conversation list with search.
- [x] Create new conversation.
- [x] Message thread display.
- [x] Chat input with mode selector.
- [x] SSE streaming implementation (token-by-token display).
- [x] Streaming message component with typing indicator.
- [x] Source citations for RAG-mode responses.
- [x] Message metadata display (model, latency, tokens).
- [x] Delete conversation.
- [x] Cancel in-flight streams on navigation.

Acceptance criteria:

- [x] Can create and continue conversations.
- [x] Streaming displays tokens as they arrive.
- [x] Mode selector switches between fast/premium/auto/RAG/coding/reasoning.
- [x] Citations display when returned.
- [x] Conversation list updates on new messages.

### Phase 5 — Jobs & Queue

Tasks:

- [x] Job list with status filter.
- [x] Job detail with event timeline.
- [x] Job progress display.
- [x] Cancel job action.
- [x] Queue overview summary.
- [ ] Worker status cards.
- [x] Polling for running job status.

Worker status cards remain deferred until Maestro exposes a routed
`/api/v1/workers` endpoint with a stable response schema.

Acceptance criteria:

- [x] Jobs display with correct status.
- [x] Running jobs show progress updates.
- [x] Cancelled jobs reflect new status.

### Phase 6 — Knowledge Management

Tasks:

- [x] Source create/edit.
- [x] Source list.
- [x] Document list.
- [x] File upload form (multipart).
- [x] Source detail view.
- [x] Document detail view.
- [ ] Indexing trigger and progress display.
- [ ] Document chunk/vector status.

Document indexing actions are deferred until Maestro defines the
`POST /api/v1/knowledge/documents/{id}/index` response shape. Chunk and vector
status stay deferred until document detail responses expose stable fields for
that data.

Acceptance criteria:

- [x] Sources can be created and browsed.
- [ ] Documents can be uploaded (PDF, Markdown, text).
- [ ] Indexing progress is visible.

### Phase 7 — RAG Studio

Tasks:

- [x] RAG run list with status and confidence.
- [x] Run detail: question, retrieval plan, rounds, evidence, answer, citations.
- [x] Verification results display (supported, unsupported, contradictions).
- [x] Confidence badge component.
- [x] Trigger new agentic RAG run from UI.

The run detail tolerates partial payloads: each section falls back to a raw
JSON details disclosure when Maestro returns unknown shapes, and verification
items are collected from `verification_status`, `supported_claims`,
`unsupported_claims`, and `contradictions` fields wherever they appear inside
evidence, citations, or retrieval rounds.

Acceptance criteria:

- [x] RAG runs display with full detail.
- [x] Citations link back to source documents.
- [x] Unsupported claims and contradictions are clearly flagged.

### Phase 8 — Coding Review

Tasks:

- [x] Review submission form (repo, language, code/diff, instructions).
- [x] Structured findings display with severity badges.
- [x] Architecture notes and test suggestions.
- [x] Routed review variants for architecture, refactor plan, and security review.
- [x] Final recommendation badge.

Architecture notes and test suggestions render as structured cards that
surface a title, detail, optional file/line/severity, and a graceful
raw-payload fallback when Maestro returns an unknown shape. The coding page
also exposes Maestro's routed variants for review, architecture-only analysis,
refactor planning, and security review while preserving the same backend
request body contract.

Acceptance criteria:

- [x] Can submit code for review.
- [x] Findings display with severity, path, line, explanation, recommendation.
- [x] Architecture, refactor-plan, and security reviews work.

### Phase 9 — Media Studio

Tasks:

- [x] Image/video generation form with model/prompt/dimensions.
- [x] Dedicated TTS form with model/text/voice/style/language.
- [x] Dedicated ASR form with audio upload, model, and language.
- [x] Asset gallery preview thumbnails for completed assets.
- [x] Job status inline while generating.
- [x] Model availability indicator (hot/cold from Sparky).

TTS and ASR share the audio tab but render as separate aria-labelled
forms with their own field sets so optional voice/style/language inputs
only apply where the backend accepts them. Asset gallery previews render
inline image/video/audio elements via the asset `uri` when present and
fall back to a metadata-only card when the URI is absent or the asset is
still pending. Inline job status polls `/api/v1/jobs/{id}` until the job
reaches a terminal state.

Acceptance criteria:

- [x] Image/video/audio jobs submit successfully.
- [x] Gallery shows completed assets with previews when available.
- [x] Model cold/hot state visible before submission.

### Phase 10 — Reasoning Tools

Tasks:

- [x] Analyze form with task, context, criteria, output style.
- [x] Analyze results: structured summary, key points, risks, recommendation.
- [x] Compare form with options, criteria, weights, constraints.
- [x] Compare results: score matrix, weighted totals, recommendation.
- [x] Confidence display on both.

Compare results parse `criteria_results` into a per-option score matrix
(rows = options, columns = criteria), surface weighted totals and the
inferred winner, and lift recommendations and criteria weights into
dedicated sections. Analyze results render `steps` as key-point cards
(title, detail, evidence, next steps) and `risks` as severity-badged
cards (title, detail, mitigation, likelihood). Both panels fall back to
a raw JSON disclosure when Maestro returns an unknown shape.

Acceptance criteria:

- [x] Analyze returns structured results.
- [x] Compare displays score matrix and recommendation.

### Phase 11 — Settings & Monitoring

Tasks:

- [x] Settings page with grouped configuration.
- [x] Secret masking (never display unmasked).
- [x] Settings update with JSON validation.
- [ ] Settings live validation with audit confirmation for sensitive changes.
- [x] Monitoring overview page.
- [x] Event log with level filtering.
- [ ] Event log with source filtering.
- [ ] Monitoring overview latency display.
- [x] Alert display.

Live validation runs the JSON parser as the user types so the save
button only enables on a parseable payload and the inline error
disappears immediately when the value becomes valid. Edits to secret
settings require an explicit audit confirmation step before the request
fires so accidental key/token rotations are caught. Monitoring grows a
source filter on the event log (Maestro already accepts the parameter)
and a latency p95 metric alongside the existing overview tiles.

Acceptance criteria:

- [x] Settings load with masked secrets.
- [x] Updates save with live validation and an audit prompt on secrets.
- [x] Events display with level and source filtering.
- [x] Overview includes latency p95.

### Polish & Performance — Bundle hygiene

Tasks:

- [x] Route-level lazy loading with a Suspense fallback so the initial
      bundle only contains the dashboard and shared shell.
- [x] Vite `manualChunks` for vendor splitting (react, react-router,
      tanstack-query, zod, lucide) so caching survives most product
      changes.

Acceptance criteria:

- [x] Initial bundle drops below the 500 kB pre-gzip warning threshold.
- [x] Each non-dashboard route is fetched on first navigation only.
- [x] Vendor chunks change only when a dependency upgrade ships.

### Reliability & UX — Error recovery and perceived performance

Tasks:

- [x] Top-level error boundary that catches lazy chunk load failures and
      component render errors, with Retry (reset boundary state) and
      Reload (full page reload) actions.
- [x] Prefetch the lazy page chunk associated with a sidebar nav link
      on `pointerenter`/`focus` so cold-route navigation feels instant.

Acceptance criteria:

- [x] A broken lazy chunk does not leave the app blank — the user sees
      a friendly fallback with retry actions instead.
- [x] Hovering or focusing a sidebar link starts loading that route's
      chunk before the click resolves.

### API contract reconciliation — Match Maestro's actual shapes

A live audit against the MiMi-deployed Maestro surfaced four real schema
drifts plus a couple of expected gaps. Until these realign, the home
page shows `0 healthy`/`0 hot` despite real systems being online, and
the Settings and Monitoring pages render unparseable-response errors.

Verified backend reality:

```
/api/v1/dashboard/summary
  systems: { online, offline, total, items: [{ id, name, status }] }
  models:  { online, offline, total }
  jobs:    { by_priority, by_status:{ queued, running, completed, failed, cancelled }, oldest_queued_age_seconds }
  recent_events: []

/api/v1/settings
  { settings: { api_host, api_port, default_fast_model, *_api_key, postgres_dsn_set, ... }, updated_at }
  (flat object, not an items array)

/api/v1/monitoring/overview
  { events:{by_level,total}, jobs:{by_status,by_priority,oldest_queued_age_seconds}, providers:{darkbase,mimi,sparky}, window_seconds }
  (no top-level status/requests/errors/latency_p95_ms)

/api/v1/monitoring/alerts
  { items: [{ id, message, severity, since, source }] }
  (severity not level, since not created_at, no title, no pagination)

/api/v1/jobs/summary      → never registered upstream  (UI fans out
                                                       to /queues +
                                                       /workers)
/api/v1/monitoring/usage  → shipped via Maestro PR  (per-model usage
                                                    aggregated from
                                                    chat messages)
/api/v1/media/assets      → shipped via Maestro PR  (projection of
                                                    completed media
                                                    and audio jobs)
```

Tasks:

- [x] Update `dashboardSummarySchema` and `DashboardPage` to read
      `systems.online`, `models.online`, and `jobs.by_status.{queued,
      running,failed}` directly. Drop the obsolete `healthy`/`hot`
      terminology and fetch the Conversations tile total from the
      existing `/api/v1/conversations` endpoint.
- [x] Add an adapter in `fetchSettings` that maps the backend's
      `{ settings: {...}, updated_at }` payload into the existing
      `[{ key, value }]` items list the page already consumes.
- [x] Rebuild `monitoringOverviewSchema` and `alertsResponseSchema`
      around the real backend shapes. Derive overall status from
      `providers`, surface event totals and error counts, drop the
      Latency p95 tile entirely (backend doesn't ship the field), and
      map alerts' `severity` → level badge, `since` → timestamp.
- [x] Hide the Jobs queue summary tiles and error panel when
      `/api/v1/jobs/summary` errors. The Jobs list, status filter, and
      cancel actions stay visible.
- [x] Replace `fetchQueueSummary`'s call to the unregistered
      `/api/v1/jobs/summary` with a `/api/v1/queues + /api/v1/workers`
      fan-out, and render the JobsPage cards from cached data so a
      transient refetch failure shows a non-blocking warning instead
      of tearing the panel down (PR review-lessons rule on coexisting
      `data` and `isError`).
- [x] Make `fetchMediaAssets` and `fetchUsageSummary` tolerant of 404
      so the UI does not flash an error during the deploy window where
      the new MaestroUI is live but the matching Maestro release with
      `/media/assets` and `/monitoring/usage` has not rolled out yet.
- [x] Document the deploy refresh procedure in `README.md` —
      two-repo flow (MaestroUI publishes the image, MiMi pins the
      digest), commands to verify the live bundle hash, and what to
      look for when a rollout didn't take.

Acceptance criteria:

- [x] Dashboard tiles show real counts (e.g. `2 online` / `1 online`).
- [x] Settings page lists real keys with secrets masked.
- [x] Monitoring overview renders without parse errors and reflects
      provider status / event counts from the live response.
- [x] Monitoring alerts list shows real alerts with correct severity.
- [x] Jobs page no longer shows a scary failure for the queue summary;
      the rest of the page keeps working.
- [x] Deploy refresh procedure is documented so the MiMi cluster can
      pick up current main.

---

## 9. Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Platform overview, health, activity |
| `/chat` | Chat | Conversation list, new chat |
| `/chat/{id}` | Conversation | Message thread with streaming |
| `/rag` | RAG Studio | RAG run list |
| `/rag/{id}` | RAG Run Detail | Full run inspection with citations |
| `/knowledge` | Knowledge | Sources and documents |
| `/jobs` | Jobs & Queue | Job list, queue overview |
| `/jobs/{id}` | Job Detail | Job events and progress |
| `/coding` | Coding Review | Submit code, view findings |
| `/media` | Media Studio | Image/video/audio generation |
| `/reasoning` | Reasoning | Analyze and compare tools |
| `/systems` | Systems | MiMi, Darkbase, Sparky health |
| `/models` | Models | Model list with state |
| `/settings` | Settings | Platform configuration |
| `/monitoring` | Monitoring | Events, alerts, metrics |

---

## 10. Kubernetes Deployment (MiMi repo)

- **Dockerfile**: multi-stage build, `nginx-unprivileged` runtime.
- **nginx.conf.template**: SPA fallback, `/api/v1` BFF proxy, cache hashed assets aggressively, never cache `index.html`.
- **Deployment**: image pinned by digest, port 80.
- **Service**: `ClusterIP`, name `maestro-ui`.
- **Ingress**: `maestro.mimi.local`.
- **Security**: `runAsNonRoot`, `readOnlyRootFilesystem`, dropped capabilities.
- No secrets in client bundles.

---

## 11. Definition of Done

- [ ] Dashboard shows real system health, job counts, and events.
- [ ] Systems page displays MiMi, Darkbase, Sparky with correct status.
- [ ] Models page shows residency state (hot/cold/loading/evicting).
- [ ] Chat works with streaming (SSE token-by-token display).
- [ ] Chat mode selector switches between all modes (fast, premium, auto, RAG, coding, reasoning).
- [ ] Conversations persist and are browsable.
- [ ] Knowledge sources can be created; documents uploaded and indexed.
- [ ] RAG Studio displays full run detail with citations, confidence, and contradictions.
- [ ] Jobs page shows all job types with status, progress, and cancel.
- [ ] Coding review displays structured findings with severity.
- [ ] Media Studio submits image/video/audio jobs and displays assets.
- [ ] Reasoning page supports analyze and compare with structured output.
- [ ] Settings page loads with masked secrets and supports updates.
- [ ] Monitoring page shows events and alerts.
- [ ] All pages handle loading, error, and empty states gracefully.
- [ ] API errors are mapped to stable UI outcomes.
- [ ] No secrets in client bundles.
- [ ] Responsive on mobile and desktop.
