import { afterEach, describe, expect, it, vi } from "vitest";
import { createConversation } from "@/api/chat";
import { submitCodeReview } from "@/api/coding";
import {
  createSource,
  fetchDocument,
  fetchSource,
  updateSource,
  uploadDocument,
} from "@/api/knowledge";
import { generateMedia, uploadMedia } from "@/api/media";
import { createRagRun } from "@/api/rag";
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
    const fetchMock = stubFetch({
      conversation: {
        id: "conversation-1",
        title: "Planning",
        mode: "balanced",
        created_at: "2026-05-11T08:00:00Z",
        updated_at: "2026-05-11T08:00:00Z",
      },
    });

    await createConversation({ title: "Planning", mode: "balanced" });

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

  it("posts coding review requests to the singular review route", async () => {
    const fetchMock = stubFetch({
      id: "review-1",
      status: "completed",
      findings: [],
      architecture_suggestions: [],
      test_suggestions: [],
      final_recommendation: "approve",
      created_at: "2026-05-11T08:00:00Z",
    });

    await submitCodeReview({
      repository: "oravandres/MaestroUI",
      diff: "diff --git a/file.ts b/file.ts",
      goals: "Review correctness.",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/coding/review",
      expect.objectContaining({ method: "POST" })
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
      setting: { key: "ui.theme", value: "light" },
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
});
