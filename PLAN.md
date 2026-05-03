# MaestroUI — Implementation Plan

> **Repository:** `github.com/oravandres/MaestroUI`
> **Role:** Frontend dashboard for the Maestro AI platform
> **Backend:** Maestro (Go orchestrator on MiMi K3s)
> **Compute:** Darkbase RTX 5090 (fast) + Sparky DGX Spark (premium)
> **Priority:** Main features first. Build a usable vertical slice before advanced polish.
> **Status:** Phase 1 done. Ready for Phase 2+.

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
| Runtime | nginx-unprivileged | Static SPA serving |

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

```
MaestroUI/
├── src/
│   ├── api/
│   │   ├── client.ts          # Fetch wrapper with auth, request IDs
│   │   ├── query-client.ts    # TanStack Query config
│   │   ├── health.ts          # Health check hooks
│   │   ├── systems.ts         # Systems API hooks
│   │   ├── models.ts          # Models API hooks
│   │   ├── conversations.ts   # Chat/conversation API hooks
│   │   ├── streaming.ts       # SSE streaming client for chat
│   │   ├── jobs.ts            # Jobs API hooks
│   │   ├── knowledge.ts       # Knowledge/document API hooks
│   │   ├── rag.ts             # RAG API hooks
│   │   ├── reasoning.ts       # Reasoning analyze/compare hooks
│   │   ├── coding.ts          # Coding review API hooks
│   │   ├── media.ts           # Media/audio API hooks
│   │   ├── monitoring.ts      # Dashboard/monitoring API hooks
│   │   ├── settings.ts        # Settings API hooks
│   │   └── types.ts           # Shared API types
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

### 7.1 Auth

API Key Authentication is used between MaestroUI and Maestro. Since a browser SPA cannot securely hold a static API key, one of the following must be implemented:
1. **Backend-for-Frontend (BFF)**: Nginx or a lightweight proxy handles injecting the `Authorization: Bearer <MAESTRO_API_KEY>` header to backend calls.
2. **Session Cookies**: The API supports HTTP-only, secure cookies for session authentication instead of raw API keys in the browser.

For local development, the key can be proxied through Vite's dev server.

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
const response = await fetch(`${baseUrl}/api/v1/conversations/${id}/messages`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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

| Phase | Scope | Status |
|-------|-------|--------|
| ~~Phase 1~~ | Project skeleton: design system, layout shell, health check | ✅ Done |
| Phase 2 | Navigation, layout, and Dashboard page | Planned |
| Phase 3 | Systems & Models pages | Planned |
| Phase 4 | Chat with streaming | Planned |
| Phase 5 | Jobs & Queue | Planned |
| Phase 6 | Knowledge Management | Planned |
| Phase 7 | RAG Studio | Planned |
| Phase 8 | Coding Review | Planned |
| Phase 9 | Media Studio (images, video, audio) | Planned |
| Phase 10 | Reasoning tools (analyze, compare) | Planned |
| Phase 11 | Settings & Monitoring | Planned |

### Phase 2 — Navigation, Layout, Dashboard

Tasks:

- [ ] Sidebar navigation with icons and active state.
- [ ] Header with platform name and connection status.
- [ ] Mobile-responsive navigation.
- [ ] Dashboard page with system health cards.
- [ ] Dashboard summary stats (conversations, jobs, models).
- [ ] Recent events timeline on dashboard.
- [ ] Quick-action buttons.

Acceptance criteria:

- [ ] All navigation links work.
- [ ] Dashboard shows real data from Maestro API.
- [ ] Layout is responsive.

### Phase 3 — Systems & Models

Tasks:

- [ ] Systems list page with health cards.
- [ ] System detail view with capabilities.
- [ ] Models list with residency state badges (hot/cold/loading/evicting).
- [ ] Model detail view.
- [ ] Refresh button to re-poll health.
- [ ] Auto-polling system status.

Acceptance criteria:

- [ ] MiMi, Darkbase, Sparky displayed with correct status.
- [ ] Model residency state updates in real-time.
- [ ] Offline provider shows degraded state.

### Phase 4 — Chat with Streaming

Tasks:

- [ ] Conversation list with search.
- [ ] Create new conversation.
- [ ] Message thread display.
- [ ] Chat input with mode selector.
- [ ] SSE streaming implementation (token-by-token display).
- [ ] Streaming message component with typing indicator.
- [ ] Source citations for RAG-mode responses.
- [ ] Message metadata display (model, latency, tokens).
- [ ] Delete conversation.
- [ ] Cancel in-flight streams on navigation.

Acceptance criteria:

- [ ] Can create and continue conversations.
- [ ] Streaming displays tokens as they arrive.
- [ ] Mode selector switches between fast/premium/auto/RAG/coding/reasoning.
- [ ] Citations display when returned.
- [ ] Conversation list updates on new messages.

### Phase 5 — Jobs & Queue

Tasks:

- [ ] Job list with status/type filters.
- [ ] Job detail with event timeline.
- [ ] Job progress display.
- [ ] Cancel job action.
- [ ] Queue overview summary.
- [ ] Worker status cards.
- [ ] Polling for running job status.

Acceptance criteria:

- [ ] Jobs display with correct status.
- [ ] Running jobs show progress updates.
- [ ] Cancelled jobs reflect new status.

### Phase 6 — Knowledge Management

Tasks:

- [ ] Source list with create/edit.
- [ ] Document list per source.
- [ ] File upload dialog (drag-and-drop, multipart).
- [ ] Indexing trigger and progress display.
- [ ] Document chunk/vector status.

Acceptance criteria:

- [ ] Sources can be created and browsed.
- [ ] Documents can be uploaded (PDF, Markdown, text).
- [ ] Indexing progress is visible.

### Phase 7 — RAG Studio

Tasks:

- [ ] RAG run list with status and confidence.
- [ ] Run detail: question, retrieval plan, rounds, evidence, answer, citations.
- [ ] Verification results display (supported, unsupported, contradictions).
- [ ] Confidence badge component.
- [ ] Trigger new agentic RAG run from UI.

Acceptance criteria:

- [ ] RAG runs display with full detail.
- [ ] Citations link back to source documents.
- [ ] Unsupported claims and contradictions are clearly flagged.

### Phase 8 — Coding Review

Tasks:

- [ ] Review submission form (task type, repo, language, code/diff, instructions).
- [ ] Structured findings display with severity badges.
- [ ] Architecture notes and test suggestions.
- [ ] Final recommendation badge.

Acceptance criteria:

- [ ] Can submit code for review.
- [ ] Findings display with severity, path, line, explanation, recommendation.
- [ ] Architecture and security reviews work.

### Phase 9 — Media Studio

Tasks:

- [ ] Image generation form with model/prompt/dimensions.
- [ ] Video generation form with model/prompt/duration.
- [ ] TTS form with model/text/voice/style.
- [ ] ASR form with audio upload.
- [ ] Asset gallery with thumbnails.
- [ ] Job status inline while generating.
- [ ] Model availability indicator (hot/cold from Sparky).

Acceptance criteria:

- [ ] Image/video/audio jobs submit successfully.
- [ ] Gallery shows completed assets.
- [ ] Model cold/hot state visible before submission.

### Phase 10 — Reasoning Tools

Tasks:

- [ ] Analyze form with task, context, criteria, output style.
- [ ] Analyze results: summary, key points, risks, recommendation.
- [ ] Compare form with options, criteria, weights, constraints.
- [ ] Compare results: score matrix, totals, recommendation.
- [ ] Confidence display on both.

Acceptance criteria:

- [ ] Analyze returns structured results.
- [ ] Compare displays score matrix and recommendation.

### Phase 11 — Settings & Monitoring

Tasks:

- [ ] Settings page with grouped configuration.
- [ ] Secret masking (never display unmasked).
- [ ] Settings update with validation.
- [ ] Monitoring overview page.
- [ ] Event log with level filtering.
- [ ] Alert display.

Acceptance criteria:

- [ ] Settings load with masked secrets.
- [ ] Updates save and reflect.
- [ ] Events display with filtering.

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
- **nginx.conf**: SPA fallback, gzip, cache hashed assets aggressively, never cache `index.html`.
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
