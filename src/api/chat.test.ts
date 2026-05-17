import { afterEach, describe, expect, it, vi } from "vitest";
import { NetworkError } from "@/api/client";
import { fetchConversation, streamChatMessage } from "@/api/chat";

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
