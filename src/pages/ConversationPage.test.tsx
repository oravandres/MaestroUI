import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import {
  type ConversationDetail,
  fetchConversation,
  streamChatMessage,
} from "@/api/chat";
import { ConversationPage } from "@/pages/ConversationPage";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/chat", async () => {
  const actual = await vi.importActual<typeof import("@/api/chat")>("@/api/chat");
  return {
    ...actual,
    fetchConversation: vi.fn(),
    streamChatMessage: vi.fn(),
  };
});

const conversationDetail: ConversationDetail = {
  conversation: {
    id: "conversation-1",
    title: "Production chat",
    mode: "balanced",
    created_at: "2026-05-11T08:00:00Z",
    updated_at: "2026-05-11T08:00:00Z",
  },
  messages: [],
};

const conversationWithMetadata: ConversationDetail = {
  ...conversationDetail,
  messages: [
    {
      id: "message-1",
      conversation_id: "conversation-1",
      role: "assistant",
      content: "Use the rollback runbook.",
      model_id: "llama-3",
      system_id: "sparky",
      mode: "rag",
      sources: [
        {
          title: "Rollback runbook",
          uri: "https://docs.example/runbook",
          document_id: "doc-1",
          chunk_id: "chunk-7",
          score: 0.82,
          text: "Rollback steps for the production release.",
          page: 12,
          verifier: { claim_id: "claim-1" },
        },
        "legacy-source",
      ],
      usage: { total_tokens: 42 },
      metadata: { latency_ms: 250, trace: { id: "trace-1" } },
      created_at: "2026-05-11T08:01:00Z",
    },
  ],
};

describe("ConversationPage", () => {
  beforeEach(() => {
    vi.mocked(fetchConversation).mockResolvedValue(conversationDetail);
    vi.mocked(streamChatMessage).mockReset();
  });

  it("keeps the current send active when an older cancelled stream settles", async () => {
    const user = userEvent.setup();
    const streams: Array<{
      resolve: () => void;
      reject: (error: unknown) => void;
    }> = [];
    vi.mocked(streamChatMessage).mockImplementation(
      () =>
        new Promise<void>((resolve, reject) => {
          streams.push({ resolve, reject });
        })
    );

    renderWithProviders(
      <Routes>
        <Route path="/chat/:id" element={<ConversationPage />} />
      </Routes>,
      { route: "/chat/conversation-1" }
    );

    await screen.findByText("Production chat");

    const messageInput = screen.getByRole("textbox", { name: /message/i });

    await user.type(messageInput, "first message");
    await user.click(screen.getByRole("button", { name: /send/i }));
    expect(screen.getByRole("button", { name: /stop/i })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /stop/i }));
    await user.type(messageInput, "second message");
    await user.click(screen.getByRole("button", { name: /send/i }));
    expect(screen.getByRole("button", { name: /stop/i })).toBeEnabled();

    await act(async () => {
      streams[0].reject(new DOMException("The chat request was aborted.", "AbortError"));
    });

    expect(screen.getByRole("button", { name: /stop/i })).toBeEnabled();

    await act(async () => {
      streams[1].resolve();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /stop/i })).toBeDisabled();
    });
  });

  it("preserves an unsupported server mode until the user chooses a supported mode", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchConversation).mockResolvedValue({
      ...conversationDetail,
      conversation: {
        ...conversationDetail.conversation,
        title: "Experimental chat",
        mode: "experimental",
      },
    });

    renderWithProviders(
      <Routes>
        <Route path="/chat/:id" element={<ConversationPage />} />
      </Routes>,
      { route: "/chat/conversation-1" }
    );

    await screen.findByText("Experimental chat");

    const modeSelect = screen.getByRole("combobox", { name: /mode/i });
    expect(modeSelect).toHaveValue("experimental");
    expect(screen.getByRole("option", { name: "Unsupported: experimental" })).toBeDisabled();
    expect(screen.getByText(/Mode "experimental" is not supported/i)).toBeInTheDocument();

    const messageInput = screen.getByRole("textbox", { name: /message/i });
    await user.type(messageInput, "hello");
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();

    await user.selectOptions(modeSelect, "fast");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(vi.mocked(streamChatMessage).mock.calls[0]?.[1]).toEqual({
      content: "hello",
      mode: "fast",
    });
  });

  it("renders structured citations and useful message metadata", async () => {
    vi.mocked(fetchConversation).mockResolvedValue(conversationWithMetadata);

    renderWithProviders(
      <Routes>
        <Route path="/chat/:id" element={<ConversationPage />} />
      </Routes>,
      { route: "/chat/conversation-1" }
    );

    expect(await screen.findByText("Use the rollback runbook.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rollback runbook" })).toHaveAttribute(
      "href",
      "https://docs.example/runbook"
    );
    expect(screen.getByText("Document doc-1")).toBeInTheDocument();
    expect(screen.getByText("Chunk chunk-7")).toBeInTheDocument();
    expect(screen.getByText("Score 0.82")).toBeInTheDocument();
    expect(screen.getByText("Rollback steps for the production release.")).toBeInTheDocument();
    expect(screen.getByText("Additional source metadata")).toBeInTheDocument();
    expect(screen.getByText("Source 2 raw payload")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Additional source metadata"));

    expect(screen.getByLabelText("Source 1 additional metadata")).toHaveTextContent("claim-1");

    await userEvent.click(screen.getByText("Metadata"));

    expect(screen.getByText("total_tokens")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("latency_ms")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByLabelText("Complex message metadata")).toHaveTextContent("trace-1");
  });
});
