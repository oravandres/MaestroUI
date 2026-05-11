import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ConversationsResponse,
  deleteConversation,
  fetchConversations,
} from "@/api/chat";
import { ChatPage } from "@/pages/ChatPage";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/chat", async () => {
  const actual = await vi.importActual<typeof import("@/api/chat")>("@/api/chat");
  return {
    ...actual,
    createConversation: vi.fn(),
    deleteConversation: vi.fn(),
    fetchConversations: vi.fn(),
  };
});

const conversations: ConversationsResponse = {
  items: [
    {
      id: "conversation-1",
      title: "Release planning",
      mode: "rag",
      created_at: "2026-05-11T08:00:00Z",
      updated_at: "2026-05-11T08:00:00Z",
    },
    {
      id: "conversation-2",
      title: "Ops review",
      mode: "fast",
      created_at: "2026-05-11T09:00:00Z",
      updated_at: "2026-05-11T09:00:00Z",
    },
  ],
  pagination: { total: 2 },
};

describe("ChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchConversations).mockResolvedValue(conversations);
  });

  it("offers all chat modes and filters conversations by title or mode", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatPage />, { route: "/chat" });

    const modeSelect = await screen.findByLabelText(/^mode$/i);
    const optionNames = within(modeSelect).getAllByRole("option").map((option) => option.textContent);
    expect(optionNames).toEqual([
      "balanced",
      "fast",
      "premium",
      "auto",
      "rag",
      "coding",
      "reasoning",
    ]);

    expect(await screen.findByText("Release planning")).toBeInTheDocument();
    expect(screen.getByText("Ops review")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/search conversations/i), "fast");

    expect(screen.queryByText("Release planning")).not.toBeInTheDocument();
    expect(screen.getByText("Ops review")).toBeInTheDocument();
  });

  it("confirms deletion and refreshes the conversation list after success", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteConversation).mockResolvedValue(undefined);
    renderWithProviders(<ChatPage />, { route: "/chat" });

    await screen.findByText("Release planning");
    await user.click(screen.getByRole("button", { name: /delete release planning/i }));

    expect(screen.getByRole("dialog", { name: /delete conversation/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(vi.mocked(deleteConversation).mock.calls[0]?.[0]).toBe("conversation-1");
    });
    await waitFor(() => {
      expect(fetchConversations).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByRole("dialog", { name: /delete conversation/i })).not.toBeInTheDocument();
  });

  it("keeps the confirmation open when conversation deletion fails", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteConversation).mockRejectedValue(new Error("delete failed"));
    renderWithProviders(<ChatPage />, { route: "/chat" });

    await screen.findByText("Release planning");
    await user.click(screen.getByRole("button", { name: /delete release planning/i }));
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(await screen.findByText("Conversation could not be deleted")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /delete conversation/i })).toBeInTheDocument();
  });
});
