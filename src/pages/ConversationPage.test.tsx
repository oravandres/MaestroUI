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
});
