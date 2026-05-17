import { afterEach, describe, expect, it, vi } from "vitest";
import { NetworkError } from "@/api/client";
import { StreamEventError, fetchConversation, streamChatMessage } from "@/api/chat";

function sseResponse(chunks: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("streamChatMessage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("emits streamed data tokens", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"token":"Hel"}\n\n'));
        controller.enqueue(encoder.encode('data: {"delta":"lo"}\n\n'));
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(body, { status: 200 }))
    );
    const tokens: string[] = [];

    await streamChatMessage(
      "conversation-1",
      { message: "hello", mode: "balanced" },
      { onToken: (token) => tokens.push(token) }
    );

    expect(tokens).toEqual(["Hel", "lo"]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/conversations/conversation-1/messages"),
      expect.objectContaining({
        method: "POST",
        // Server's decodeJSON rejects unknown fields, so the body must use
        // `message` (not `content`) per
        // Maestro/internal/chat/handlers.go sendMessageRequest.
        body: JSON.stringify({ message: "hello", mode: "balanced", stream: true }),
      })
    );
  });

  it("does not start a request when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal("fetch", vi.fn());

    await expect(
      streamChatMessage(
        "conversation-1",
        { message: "hello", mode: "balanced" },
        { signal: controller.signal, onToken: vi.fn() }
      )
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps fetch failures to the shared network error type", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(
      streamChatMessage(
        "conversation-1",
        { message: "hello", mode: "balanced" },
        { onToken: vi.fn() }
      )
    ).rejects.toBeInstanceOf(NetworkError);
  });

  // The disappearing-text-becomes-`event: token`-text bug fix. Maestro
  // emits standard SSE frames (sseWriter.event() at
  // Maestro/internal/chat/streaming.go:255) — each token is delivered as
  //   event: token
  //   data: {"delta": "Hello"}
  //   <blank line>
  // The previous line-by-line parser fell into its `catch` branch on
  // the `event: token` field line and emitted "event: token" as if it
  // were a token, producing the visible
  // "event: tokenOkayevent: token theevent: token user..." mess. This
  // test pins the named-event path so the regression cannot return.
  it("parses standard SSE event frames and only emits token deltas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          'event: token\ndata: {"delta":"Okay"}\n\n',
          'event: token\ndata: {"delta":" the"}\n\n',
          'event: token\ndata: {"delta":" universe"}\n\n',
          'event: done\ndata: {"message_id":"m1","model":"nemotron-3-super-120b-a12b-nvfp4",' +
            '"system":"sparky","mode":"premium","usage":{},"latency_ms":1234}\n\n',
        ])
      )
    );
    const tokens: string[] = [];

    await streamChatMessage(
      "conversation-1",
      { message: "hello", mode: "premium" },
      { onToken: (t) => tokens.push(t) }
    );

    expect(tokens).toEqual(["Okay", " the", " universe"]);
    // Combined output is what ConversationPage actually renders. The
    // bug surfaced as "event: tokenOkayevent: token the..." landing
    // here; assert the joined text is just the deltas, nothing else.
    expect(tokens.join("")).toBe("Okay the universe");
  });

  // Real network streams arrive as arbitrary byte chunks, not pre-split
  // SSE frames. The parser must hold partial frames in the rolling
  // buffer and only flush on the blank line. Without this guarantee
  // mid-frame chunk boundaries would split `event: token` from its
  // `data:` line and the old broken parser would have emitted them as
  // two separate "tokens" — exactly the visible bug.
  it("buffers frames across arbitrary chunk boundaries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          "event: tok",
          'en\ndata: {"de',
          'lta":"Hel"}\n\nevent: token\ndata: {"delta":"lo"}\n\n',
          "event: done\ndata: {}\n\n",
        ])
      )
    );
    const tokens: string[] = [];
    await streamChatMessage(
      "conversation-1",
      { message: "hi", mode: "fast" },
      { onToken: (t) => tokens.push(t) }
    );
    expect(tokens).toEqual(["Hel", "lo"]);
  });

  // SSE keep-alive comments and unknown fields (id:, retry:) must be
  // silently dropped, not forwarded as tokens. CRLF line endings (some
  // proxies, e.g. nginx, may rewrite the upstream LFs) must also work.
  it("ignores keep-alive comments, unknown fields, and CRLF line endings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          ": keep-alive\r\n\r\n",
          'id: 42\r\nevent: token\r\ndata: {"delta":"Ok"}\r\n\r\n',
          "retry: 2000\r\n\r\n",
          "event: done\r\ndata: {}\r\n\r\n",
        ])
      )
    );
    const tokens: string[] = [];
    await streamChatMessage(
      "conversation-1",
      { message: "hi", mode: "fast" },
      { onToken: (t) => tokens.push(t) }
    );
    expect(tokens).toEqual(["Ok"]);
  });

  // Maestro emits `event: error` via the SSE side-channel when the
  // upstream stream fails mid-flight (Maestro/internal/chat/handlers.go:641).
  // The parser must throw a typed StreamEventError so
  // ConversationPage's catch block can show the failure banner instead
  // of silently swallowing it (the old behaviour) or emitting the
  // error payload as if it were assistant text.
  it("throws StreamEventError when Maestro emits event: error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          'event: token\ndata: {"delta":"start"}\n\n',
          'event: error\ndata: {"code":"provider_unavailable",' +
            '"message":"upstream stream failed"}\n\n',
        ])
      )
    );
    const tokens: string[] = [];

    await expect(
      streamChatMessage(
        "conversation-1",
        { message: "hi", mode: "premium" },
        { onToken: (t) => tokens.push(t) }
      )
    ).rejects.toMatchObject({
      name: "StreamEventError",
      code: "provider_unavailable",
      message: "upstream stream failed",
    });
    // Tokens that arrived BEFORE the error must still be in the
    // buffer; the page can decide whether to keep or discard the
    // partial assistant message in its catch handler.
    expect(tokens).toEqual(["start"]);
  });

  // Backwards-compat with legacy `data:` only streams (no `event:`
  // line, OpenAI-style). The old test was already pinning this, but
  // re-assert it here so the new parser doesn't quietly regress the
  // shape that the contract tests use.
  it("still accepts legacy unnamed data: frames", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse(['data: {"token":"Hel"}\n\n', 'data: {"delta":"lo"}\n\ndata: [DONE]\n\n'])
      )
    );
    const tokens: string[] = [];
    await streamChatMessage(
      "conversation-1",
      { message: "hi", mode: "fast" },
      { onToken: (t) => tokens.push(t) }
    );
    expect(tokens).toEqual(["Hel", "lo"]);
  });

  // Type export check — using `StreamEventError` in the type position
  // would fail at compile time if the symbol was missing. Keeping a
  // runtime use here pins the public surface for ConversationPage to
  // import.
  it("StreamEventError is a public, typed export", () => {
    const err = new StreamEventError("x", "y", { z: 1 });
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("x");
    expect(err.payload).toEqual({ z: 1 });
  });
});

describe("fetchConversation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Guards the fan-out: detail + messages must both be requested, and the
  // returned view-model must combine them. The disappearing-thread bug
  // would come back if either fetch were dropped or sequenced behind the
  // other.
  it("requests detail and messages in parallel and combines them into the view-model", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/v1/conversations/conversation-1") {
        return Promise.resolve(
          jsonResponse({
            id: "conversation-1",
            title: "Production chat",
            mode: "fast",
            created_at: "2026-05-17T16:42:33Z",
            updated_at: "2026-05-17T16:42:40Z",
          })
        );
      }
      if (url === "/api/v1/conversations/conversation-1/messages") {
        return Promise.resolve(
          jsonResponse({
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
                created_at: "2026-05-17T16:42:34Z",
              },
            ],
          })
        );
      }
      throw new Error(`unexpected fetch url: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const detail = await fetchConversation("conversation-1");

    expect(detail.conversation.id).toBe("conversation-1");
    expect(detail.messages).toHaveLength(1);
    expect(detail.messages[0]).toMatchObject({ role: "user", content: "What is life?" });

    const calledUrls = fetchMock.mock.calls.map(([url]) => url);
    expect(calledUrls).toEqual(
      expect.arrayContaining([
        "/api/v1/conversations/conversation-1",
        "/api/v1/conversations/conversation-1/messages",
      ])
    );
  });

  // A non-existent conversation should reject the combined promise (not
  // silently render a blank thread) so ConversationPage shows the
  // ErrorState onRetry control rather than EmptyState.
  it("rejects when the messages endpoint 404s on a stale id", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/v1/conversations/missing") {
        return Promise.resolve(
          jsonResponse(
            { id: "missing", title: "x", mode: "fast", created_at: "x", updated_at: "x" }
          )
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({ error: { code: "not_found", message: "conversation not found" } }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchConversation("missing")).rejects.toThrow();
  });
});
