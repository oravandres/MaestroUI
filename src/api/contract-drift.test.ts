/**
 * Contract drift smoke test.
 *
 * Each fixture below is a verbatim sample of what the deployed Maestro
 * backend currently returns, captured with `curl -ks
 * https://maestro-ui.mimi.local/api/v1/...`. The tests stub `fetch` with
 * that fixture and run the matching MaestroUI helper end-to-end so that
 * any schema change that drifts away from the live response shape fails
 * locally before reaching the deployment, and any backend change that
 * drops a field surfaces as a parser error instead of a silent UI blank.
 *
 * Fixtures should be refreshed (with `curl -ks ... | jq` and
 * pasted back) when the backend intentionally changes a payload. The
 * captures intentionally include a few non-empty rows so we exercise
 * record-keyed maps (`by_level`, `by_status`, `by_priority`, `providers`)
 * rather than only zero-state envelopes.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealth } from "@/api/health";
import { fetchQueueSummary } from "@/api/jobs";
import { fetchMediaAssets } from "@/api/media";
import {
  fetchAlerts,
  fetchMonitoringEvents,
  fetchMonitoringOverview,
  fetchUsageSummary,
} from "@/api/monitoring";
import { fetchDashboardSummary } from "@/api/dashboard";
import {
  createConversation,
  fetchConversation,
  fetchConversations,
  fetchMessages,
} from "@/api/chat";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const liveFixtures = {
  "/api/v1/health": { status: "healthy" },
  "/api/v1/queues": {
    by_status: { cancelled: 0, completed: 0, failed: 0, queued: 0, running: 0 },
    by_priority: { high: 0, low: 0, normal: 0 },
    oldest_queued_age_seconds: 0,
  },
  "/api/v1/workers": {
    items: [
      {
        id: "d019742d-6213-4a1a-8d08-85c4c3e883e1",
        hostname: "maestro-7677f99d9d-k7p4f",
        pid: 1,
        started_at: "2026-05-16T17:05:04.487171Z",
        last_heartbeat_at: "2026-05-16T18:46:19.498336Z",
        metadata: {},
      },
    ],
    pagination: { total: 1 },
  },
  "/api/v1/dashboard/summary": {
    jobs: {
      by_status: { cancelled: 0, completed: 0, failed: 0, queued: 0, running: 0 },
      by_priority: { high: 0, low: 0, normal: 0 },
      oldest_queued_age_seconds: 0,
    },
    models: { total: 5, online: 2, offline: 3 },
    recent_events: [],
    systems: {
      total: 3,
      online: 3,
      offline: 0,
      items: [
        { id: "darkbase", name: "Darkbase RTX 5090", status: "online" },
        { id: "mimi", name: "MiMi Cluster", status: "online" },
        { id: "sparky", name: "Sparky DGX", status: "online" },
      ],
    },
  },
  "/api/v1/monitoring/overview": {
    events: { by_level: { error: 0, info: 0, warn: 0 }, total: 0 },
    jobs: {
      by_status: { cancelled: 0, completed: 0, failed: 0, queued: 0, running: 0 },
      by_priority: { high: 0, low: 0, normal: 0 },
      oldest_queued_age_seconds: 0,
    },
    providers: {
      darkbase: { status: "online", last_seen_at: "2026-05-16T18:46:04.491382Z" },
      mimi: { status: "online", last_seen_at: "2026-05-16T18:46:04.562282Z" },
      sparky: { status: "online", last_seen_at: "2026-05-16T18:46:04.542921Z" },
    },
    window_seconds: 3600,
  },
  "/api/v1/monitoring/alerts": {
    items: [
      {
        id: "alert-model-qwen3-embedding-8b-offline",
        severity: "warn",
        source: "models",
        message: "Model qwen3-embedding-8b is offline",
        since: "2026-05-16T18:46:04.500376Z",
      },
    ],
  },
  "/api/v1/monitoring/events?limit=10": {
    items: [],
    pagination: { limit: 10, offset: 0, total: 0 },
  },
  // Maestro PR adds /monitoring/usage; a populated response is expected
  // post-deploy. The shape is validated against MaestroUI's
  // usageSummarySchema.
  "/api/v1/monitoring/usage": {
    requests: 7,
    tokens: 1234,
    cost_usd: null,
    by_model: [
      { model_id: "darkbase-fast", requests: 4, tokens: 800 },
      { model_id: "sparky-premium", requests: 3, tokens: 434 },
    ],
  },
  // Chat endpoints. Server returns FLAT shapes — `POST /conversations` is
  // not enveloped under `conversation`, `GET /conversations/{id}` does NOT
  // include a `messages` array (the messages list endpoint is a 405 today
  // — ConversationPage shows an empty thread on fresh load and renders
  // the live streaming buffer for the current turn). Mirrors what
  // `curl -ks https://maestro-ui.mimi.local/api/v1/conversations` returns
  // against MiMi commit a8e84b9f.
  "/api/v1/conversations": {
    items: [
      {
        id: "conversation-1",
        title: "Production chat",
        mode: "fast",
        created_at: "2026-05-17T16:42:33.389333Z",
        updated_at: "2026-05-17T16:46:06.926009Z",
      },
    ],
    pagination: { limit: 20, offset: 0, total: 1 },
  },
  "/api/v1/conversations/conversation-1": {
    id: "conversation-1",
    title: "Production chat",
    mode: "fast",
    created_at: "2026-05-17T16:42:33.389333Z",
    updated_at: "2026-05-17T16:46:06.926009Z",
  },
  // Maestro PR #34 adds the list-messages endpoint. Shape mirrors
  // listConversations: `{items: [...]}` ordered by created_at ASC. No
  // pagination wrapper today — small thread, bounded — but the parser
  // accepts an additive `pagination` block if one shows up later.
  "/api/v1/conversations/conversation-1/messages": {
    items: [
      {
        id: "msg-user-1",
        conversation_id: "conversation-1",
        role: "user",
        content: "What is life?",
        model_id: null,
        system_id: null,
        mode: null,
        sources: [],
        usage: {},
        metadata: {},
        created_at: "2026-05-17T16:42:34.000000Z",
      },
      {
        id: "msg-assistant-1",
        conversation_id: "conversation-1",
        role: "assistant",
        content: "Life is beautiful.",
        model_id: "qwen3.6:35b-a3b",
        system_id: "darkbase",
        mode: "fast",
        sources: [],
        usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
        metadata: { latency_ms: 350 },
        created_at: "2026-05-17T16:42:40.000000Z",
      },
    ],
  },
  // Maestro PR adds /media/assets; a populated response is expected
  // post-deploy. Listed shape mirrors mediaAssetSchema.
  "/api/v1/media/assets": {
    items: [
      {
        id: "job-image-1",
        type: "image",
        status: "completed",
        title: "Architecture diagram",
        uri: "https://media.local/diagram.png",
        job_id: "job-image-1",
        model_id: "flux2",
        metadata: {},
        created_at: "2026-05-16T18:00:00Z",
      },
    ],
    pagination: { limit: 50, offset: 0, total: 1 },
  },
} as const;

function stubFromFixtures() {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    const fixture = (liveFixtures as Record<string, unknown>)[url];
    if (fixture === undefined) {
      throw new Error(`no live fixture recorded for ${url}`);
    }
    return Promise.resolve(jsonResponse(fixture));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("contract drift against live Maestro fixtures", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses /api/v1/health", async () => {
    stubFromFixtures();
    await expect(fetchHealth()).resolves.toEqual({ status: "healthy" });
  });

  it("parses /api/v1/queues + /api/v1/workers and merges them into the queue summary shape", async () => {
    stubFromFixtures();
    const summary = await fetchQueueSummary();
    expect(summary).toEqual({ queued: 0, running: 0, workers: 1 });
  });

  it("parses /api/v1/dashboard/summary", async () => {
    stubFromFixtures();
    const summary = await fetchDashboardSummary();
    expect(summary.systems.online).toBe(3);
    expect(summary.models.total).toBe(5);
    expect(summary.jobs.by_status?.running).toBe(0);
  });

  it("parses /api/v1/monitoring/overview", async () => {
    stubFromFixtures();
    const overview = await fetchMonitoringOverview();
    expect(overview.events?.total).toBe(0);
    expect(Object.keys(overview.providers ?? {})).toEqual(
      expect.arrayContaining(["darkbase", "mimi", "sparky"])
    );
  });

  it("parses /api/v1/monitoring/alerts", async () => {
    stubFromFixtures();
    const alerts = await fetchAlerts();
    expect(alerts.items[0].severity).toBe("warn");
    expect(alerts.items[0].source).toBe("models");
  });

  it("parses /api/v1/monitoring/events", async () => {
    stubFromFixtures();
    const events = await fetchMonitoringEvents({ limit: 10 });
    expect(events.items).toEqual([]);
    expect(events.pagination.total).toBe(0);
  });

  it("parses /api/v1/monitoring/usage from the fixture-shipped payload", async () => {
    stubFromFixtures();
    const usage = await fetchUsageSummary();
    expect(usage.requests).toBe(7);
    expect(usage.by_model).toHaveLength(2);
  });

  it("parses /api/v1/media/assets from the fixture-shipped payload", async () => {
    stubFromFixtures();
    const assets = await fetchMediaAssets();
    expect(assets.items[0].title).toBe("Architecture diagram");
    expect(assets.pagination.total).toBe(1);
  });

  it("parses the flat /api/v1/conversations list shape", async () => {
    stubFromFixtures();
    const list = await fetchConversations();
    expect(list.items).toHaveLength(1);
    expect(list.items[0].id).toBe("conversation-1");
    expect(list.items[0].mode).toBe("fast");
    expect(list.pagination.total).toBe(1);
  });

  it("parses the flat /api/v1/conversations/{id} detail shape and combines it with the parallel messages fetch", async () => {
    stubFromFixtures();
    const detail = await fetchConversation("conversation-1");
    expect(detail.conversation.id).toBe("conversation-1");
    expect(detail.conversation.title).toBe("Production chat");
    expect(detail.messages).toHaveLength(2);
    expect(detail.messages[0]).toMatchObject({ role: "user", content: "What is life?" });
    expect(detail.messages[1]).toMatchObject({
      role: "assistant",
      content: "Life is beautiful.",
      system_id: "darkbase",
    });
  });

  it("parses the /api/v1/conversations/{id}/messages list shape on its own", async () => {
    stubFromFixtures();
    const messages = await fetchMessages("conversation-1");
    expect(messages).toHaveLength(2);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("parses a flat POST /api/v1/conversations response (no `conversation` envelope)", async () => {
    // POST returns the same flat shape as GET, so reuse the GET fixture.
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(liveFixtures["/api/v1/conversations/conversation-1"]));
    vi.stubGlobal("fetch", fetchMock);
    const created = await createConversation({ title: "Production chat", mode: "fast" });
    expect(created.id).toBe("conversation-1");
    expect(created.mode).toBe("fast");
  });
});
