import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { fetchModels } from "@/api/systems";
import { ModelsPage } from "@/pages/ModelsPage";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/systems", () => ({
  fetchModels: vi.fn(),
}));

describe("ModelsPage", () => {
  beforeEach(() => {
    vi.mocked(fetchModels).mockResolvedValue({ items: [], pagination: { total: 0 } });
  });

  it("renders a successful models table", async () => {
    vi.mocked(fetchModels).mockResolvedValue({
      items: [
        {
          id: "gpt-4o",
          system_id: "mimi",
          name: "GPT-4o",
          capability: "chat",
          quality_tier: "frontier",
          status: "healthy",
          residency_state: "hot",
          context_window: 128000,
          metadata: {},
          created_at: "2026-05-10T08:00:00Z",
          updated_at: "2026-05-11T08:00:00Z",
        },
      ],
      pagination: { total: 1 },
    });

    renderWithProviders(<ModelsPage />, { route: "/models" });

    expect(await screen.findByRole("link", { name: "GPT-4o" })).toHaveAttribute(
      "href",
      "/models/gpt-4o"
    );
    expect(screen.getByText("frontier")).toBeInTheDocument();
  });

  it("renders empty and unavailable states", async () => {
    const { unmount } = renderWithProviders(<ModelsPage />, { route: "/models" });

    expect(await screen.findByText("No models registered")).toBeInTheDocument();

    unmount();
    vi.mocked(fetchModels).mockRejectedValue(
      new ApiError("not found", 404, { error: { message: "not found" } })
    );

    renderWithProviders(<ModelsPage />, { route: "/models" });

    expect(await screen.findByText("This API is not available yet.")).toBeInTheDocument();
  });
});
