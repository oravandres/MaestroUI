import { afterEach, describe, expect, it, vi } from "vitest";
import { createConversation } from "@/api/chat";
import { submitCodeReview } from "@/api/coding";
import { fetchQueueSummary } from "@/api/jobs";
import {
  createSource,
  fetchDocument,
  fetchSource,
  updateSource,
  uploadDocument,
} from "@/api/knowledge";
import { fetchMediaAssets, generateMedia, uploadMedia } from "@/api/media";
import { fetchUsageSummary } from "@/api/monitoring";
import { createRagRun, fetchRagRun } from "@/api/rag";
import { saveSetting } from "@/api/settings";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function stubFetch(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse(body));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("API route contracts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the backend conversation route without the legacy chat prefix", async () => {
    // Server returns the flat Conversation row directly (no `conversation`
    // envelope) per Maestro/internal/chat/handlers.go createConversation.
    const fetchMock = stubFetch({
      id: "conversation-1",
      title: "Planning",
      mode: "balanced",
      created_at: "2026-05-11T08:00:00Z",
      updated_at: "2026-05-11T08:00:00Z",
    });

    const created = await createConversation({ title: "Planning", mode: "balanced" });

    expect(created).toEqual({
      id: "conversation-1",
      title: "Planning",
      mode: "balanced",
      created_at: "2026-05-11T08:00:00Z",
      updated_at: "2026-05-11T08:00:00Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/conversations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "Planning", mode: "balanced" }),
      })
    );
  });

  it("posts agentic RAG runs to the contract route", async () => {
    const fetchMock = stubFetch({
      run: {
        id: "rag-1",
        conversation_id: null,
        question: "What changed?",
        status: "queued",
        retrieval_rounds: [],
        evidence: [],
        answer: null,
        citations: [],
        confidence: null,
        error: null,
        started_at: "2026-05-11T08:00:00Z",
        completed_at: null,
      },
    });

    await createRagRun({ question: "What changed?" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/rag/agentic",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ question: "What changed?" }),
      })
    );
  });

  it("fetches RAG run detail with an encoded run id", async () => {
    const fetchMock = stubFetch({
      run: {
        id: "rag/with space",
        conversation_id: null,
        question: "What changed?",
        status: "completed",
        retrieval_rounds: [],
        evidence: [],
        answer: "A dashboard was added.",
        citations: [],
        confidence: "high",
        error: null,
        started_at: "2026-05-11T08:00:00Z",
        completed_at: "2026-05-11T08:01:00Z",
      },
    });

    await fetchRagRun("rag/with space");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/v1/rag/runs/rag%2Fwith%20space"
    );
  });

  it("posts coding review requests to the singular review route", async () => {
    const fetchMock = stubFetch({
      summary: "Review completed.",
      findings: [],
      architecture_notes: [],
      tests_to_add: [],
      final_recommendation: "approve",
    });

    const result = await submitCodeReview({
      repository: "oravandres/MaestroUI",
      diff: "diff --git a/file.ts b/file.ts",
      instructions: "Review correctness.",
    });

    expect(result.summary).toBe("Review completed.");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/coding/review",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          repository: "oravandres/MaestroUI",
          diff: "diff --git a/file.ts b/file.ts",
          instructions: "Review correctness.",
        }),
      })
    );
  });

  it.each([
    ["architecture", "/api/v1/coding/architecture"],
    ["refactor_plan", "/api/v1/coding/refactor-plan"],
    ["security_review", "/api/v1/coding/security-review"],
  ] as const)("routes coding %s requests to the matching backend endpoint", async (variant, path) => {
    const fetchMock = stubFetch({
      summary: "Review completed.",
      findings: [],
      architecture_notes: [],
      tests_to_add: [],
      final_recommendation: "approve",
    });

    await submitCodeReview({
      variant,
      repository: "oravandres/MaestroUI",
      diff: "diff --git a/file.ts b/file.ts",
      instructions: "Review correctness.",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      path,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          repository: "oravandres/MaestroUI",
          diff: "diff --git a/file.ts b/file.ts",
          instructions: "Review correctness.",
        }),
      })
    );
  });

  it.each([
    [
      "image",
      "/api/v1/media/image",
      "Draw a system map",
      { prompt: "Draw a system map", model_id: "model-1" },
    ],
    [
      "video",
      "/api/v1/media/video",
      "Animate a workflow",
      { prompt: "Animate a workflow", model_id: "model-1" },
    ],
    [
      "audio",
      "/api/v1/audio/tts",
      "Read this aloud",
      { text: "Read this aloud", model_id: "model-1" },
    ],
  ] as const)("routes %s generation to the matching media endpoint", async (type, path, prompt, body) => {
    const fetchMock = stubFetch({ job_id: "job-1", status: "queued" });

    await generateMedia({
      type,
      prompt,
      model_id: "model-1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      path,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(body),
      })
    );
  });

  // Regression: Maestro's submitResponse is `{job_id, external_job_id?,
  // job: {... status ...}}` (oravandres/Maestro internal/media/handlers.go).
  // Before the schema was loosened the Zod parse rejected this rich
  // envelope as "did not match the expected shape", surfacing
  // "Generation failed" in the UI even though the job was actually
  // queued. Pin both the rich and slim shapes so the parse stays
  // forgiving on either side of a Maestro upgrade.
  it("accepts Maestro's rich {job_id, external_job_id, job} submit envelope", async () => {
    stubFetch({
      job_id: "maestro-job-1",
      external_job_id: "sparky-job-1",
      job: {
        id: "maestro-job-1",
        type: "media.image",
        status: "queued",
        priority: "normal",
        progress: 0,
      },
    });
    const result = await generateMedia({
      type: "image",
      prompt: "diagram",
      model_id: "flux2-dev",
    });
    expect(result.job_id).toBe("maestro-job-1");
    expect(result.status).toBe("queued");
  });

  it("still accepts the slim {job_id, status} legacy submit envelope", async () => {
    stubFetch({ job_id: "legacy-1", status: "queued" });
    const result = await generateMedia({
      type: "image",
      prompt: "diagram",
      model_id: "flux2-dev",
    });
    expect(result.job_id).toBe("legacy-1");
    expect(result.status).toBe("queued");
  });

  it("routes audio uploads to ASR without a legacy media upload endpoint", async () => {
    const fetchMock = stubFetch({ job_id: "job-1", status: "queued" });
    const file = new File(["audio"], "sample.wav", { type: "audio/wav" });

    await uploadMedia({ type: "audio", file });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/audio/asr");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("file")).toBe(file);
  });

  it("routes knowledge document uploads to the upload endpoint", async () => {
    const fetchMock = stubFetch({
      document: {
        id: "document-1",
        source_id: "source-1",
        title: "Runbook",
        uri: null,
        content_type: "text/markdown",
        status: "pending",
        metadata: {},
        created_at: "2026-05-11T08:00:00Z",
        updated_at: "2026-05-11T08:00:00Z",
      },
    });
    const file = new File(["# Runbook"], "runbook.md", { type: "text/markdown" });

    await uploadDocument({ title: "Runbook", sourceId: "source-1", file });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/knowledge/documents/upload");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("title")).toBe("Runbook");
    expect((init.body as FormData).get("source_id")).toBe("source-1");
    expect((init.body as FormData).get("file")).toBe(file);
  });

  it("posts knowledge source creation to the sources route", async () => {
    const fetchMock = stubFetch({
      source: {
        id: "source-1",
        name: "Runbooks",
        type: "markdown",
        status: "created",
        description: null,
        metadata: {},
        created_at: "2026-05-11T08:00:00Z",
        updated_at: "2026-05-11T08:00:00Z",
      },
    });

    await createSource({ name: "Runbooks", type: "markdown" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/knowledge/sources",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Runbooks", type: "markdown", metadata: {} }),
      })
    );
  });

  it("patches knowledge source updates through the source detail route", async () => {
    const fetchMock = stubFetch({
      source: {
        id: "source-1",
        name: "Runbooks",
        type: "markdown",
        status: "created",
        description: "Ops notes",
        metadata: { team: "ops" },
        created_at: "2026-05-11T08:00:00Z",
        updated_at: "2026-05-11T08:00:00Z",
      },
    });

    await updateSource("source-1", {
      name: "Runbooks",
      type: "markdown",
      description: "Ops notes",
      metadata: { team: "ops" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/knowledge/sources/source-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          name: "Runbooks",
          type: "markdown",
          description: "Ops notes",
          metadata: { team: "ops" },
        }),
      })
    );
  });

  it("fetches knowledge source detail with an encoded source id", async () => {
    const fetchMock = stubFetch({
      source: {
        id: "source/with space",
        name: "Runbooks",
        type: "markdown",
        status: "created",
        description: null,
        metadata: {},
        created_at: "2026-05-11T08:00:00Z",
        updated_at: "2026-05-11T08:00:00Z",
      },
    });

    await fetchSource("source/with space");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/v1/knowledge/sources/source%2Fwith%20space"
    );
  });

  it("fetches knowledge document detail with an encoded document id", async () => {
    const fetchMock = stubFetch({
      document: {
        id: "document/with space",
        source_id: "source-1",
        title: "Runbook",
        uri: null,
        content_type: "text/markdown",
        status: "pending",
        metadata: {},
        created_at: "2026-05-11T08:00:00Z",
        updated_at: "2026-05-11T08:00:00Z",
      },
    });

    await fetchDocument("document/with space");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/v1/knowledge/documents/document%2Fwith%20space"
    );
  });

  it("encodes knowledge source ids before patching updates", async () => {
    const fetchMock = stubFetch({
      source: {
        id: "source/with space",
        name: "Runbooks",
        type: "markdown",
        status: "created",
        description: "Ops notes",
        metadata: {},
        created_at: "2026-05-11T08:00:00Z",
        updated_at: "2026-05-11T08:00:00Z",
      },
    });

    await updateSource("source/with space", {
      name: "Runbooks",
      type: "markdown",
      description: "Ops notes",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/knowledge/sources/source%2Fwith%20space",
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("patches settings through the aggregate settings route", async () => {
    const fetchMock = stubFetch({
      settings: { "ui.theme": "light" },
      updated_at: "2026-05-15T12:00:00Z",
    });

    await saveSetting("ui.theme", "light");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/settings",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ settings: { "ui.theme": "light" } }),
      })
    );
  });

  it("loads queue summary from /api/v1/queues + /api/v1/workers, never the broken /api/v1/jobs/summary", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string) => {
        if (url === "/api/v1/queues") {
          return Promise.resolve(
            jsonResponse({
              by_status: { queued: 2, running: 1, completed: 0, failed: 0, cancelled: 0 },
              by_priority: { high: 0, normal: 3, low: 0 },
              oldest_queued_age_seconds: 7,
            })
          );
        }
        if (url === "/api/v1/workers") {
          return Promise.resolve(
            jsonResponse({
              items: [
                {
                  id: "worker-1",
                  hostname: "maestro-1",
                  pid: 1,
                  started_at: "2026-05-16T17:00:00Z",
                  last_heartbeat_at: "2026-05-16T17:01:00Z",
                  metadata: {},
                },
              ],
              pagination: { total: 1 },
            })
          );
        }
        throw new Error(`unexpected fetch url: ${url}`);
      });
    vi.stubGlobal("fetch", fetchMock);

    const summary = await fetchQueueSummary();

    expect(summary).toEqual({ queued: 2, running: 1, workers: 1 });
    const requestedUrls = fetchMock.mock.calls.map(([url]) => url);
    expect(requestedUrls).toEqual(
      expect.arrayContaining(["/api/v1/queues", "/api/v1/workers"])
    );
    expect(requestedUrls).not.toContain("/api/v1/jobs/summary");
  });

  it("treats a 404 from /api/v1/media/assets as an empty gallery", async () => {
    const notFoundBody = JSON.stringify({
      error: { code: "not_found", message: "not found" },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(notFoundBody, {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchMediaAssets();

    expect(result).toEqual({ items: [], pagination: { total: 0 } });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/media/assets",
      expect.objectContaining({})
    );
  });

  it("propagates non-404 failures from /api/v1/media/assets without swallowing them", async () => {
    const errorBody = JSON.stringify({
      error: { code: "internal_error", message: "boom" },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(errorBody, {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchMediaAssets()).rejects.toThrow();
  });

  it("loads usage summary from /api/v1/monitoring/usage and parses the canonical shape", async () => {
    const fetchMock = stubFetch({
      requests: 7,
      tokens: 1234,
      cost_usd: null,
      by_model: [
        { model_id: "darkbase-fast", requests: 4, tokens: 800 },
        { model_id: "sparky-premium", requests: 3, tokens: 434 },
      ],
    });

    const summary = await fetchUsageSummary();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/monitoring/usage",
      expect.objectContaining({})
    );
    expect(summary.requests).toBe(7);
    expect(summary.tokens).toBe(1234);
    expect(summary.by_model).toHaveLength(2);
    expect(summary.by_model[0]).toEqual({
      model_id: "darkbase-fast",
      requests: 4,
      tokens: 800,
    });
  });

  it("treats a 404 from /api/v1/monitoring/usage as an empty summary so deploy ordering does not toast", async () => {
    const notFoundBody = JSON.stringify({
      error: { code: "not_found", message: "not found" },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(notFoundBody, {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const summary = await fetchUsageSummary();

    expect(summary).toEqual({
      requests: 0,
      tokens: 0,
      cost_usd: null,
      by_model: [],
    });
  });
});
