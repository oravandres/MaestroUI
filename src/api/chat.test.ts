import { afterEach, describe, expect, it, vi } from "vitest";
import { NetworkError } from "@/api/client";
import { streamChatMessage } from "@/api/chat";

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
      { content: "hello", mode: "balanced" },
      { onToken: (token) => tokens.push(token) }
    );

    expect(tokens).toEqual(["Hel", "lo"]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/chat/conversations/conversation-1/stream"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("does not start a request when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal("fetch", vi.fn());

    await expect(
      streamChatMessage(
        "conversation-1",
        { content: "hello", mode: "balanced" },
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
        { content: "hello", mode: "balanced" },
        { onToken: vi.fn() }
      )
    ).rejects.toBeInstanceOf(NetworkError);
  });
});
