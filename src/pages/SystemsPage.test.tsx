import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { fetchSystems, refreshSystems } from "@/api/systems";
import { SystemsPage } from "@/pages/SystemsPage";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/systems", () => ({
  fetchSystems: vi.fn(),
  refreshSystems: vi.fn(),
}));

describe("SystemsPage", () => {
  beforeEach(() => {
    vi.mocked(refreshSystems).mockResolvedValue("ok");
  });

  it("renders a successful systems table", async () => {
    vi.mocked(fetchSystems).mockResolvedValue({
      items: [
        {
          id: "sparky",
          name: "Sparky",
          type: "agent",
          status: "healthy",
          capabilities: [],
          metadata: {},
          last_seen_at: null,
          created_at: "2026-05-10T08:00:00Z",
          updated_at: "2026-05-11T08:00:00Z",
        },
      ],
      pagination: { total: 1 },
    });

    renderWithProviders(<SystemsPage />, { route: "/systems" });

    expect(await screen.findByRole("link", { name: "Sparky" })).toHaveAttribute(
      "href",
      "/systems/sparky"
    );
    expect(screen.getByText("healthy")).toBeInTheDocument();
  });

  it("renders an explicit empty state", async () => {
    vi.mocked(fetchSystems).mockResolvedValue({ items: [], pagination: { total: 0 } });

    renderWithProviders(<SystemsPage />, { route: "/systems" });

    expect(await screen.findByText("No systems registered")).toBeInTheDocument();
  });

  it("maps unavailable systems API errors to stable UI text", async () => {
    vi.mocked(fetchSystems).mockRejectedValue(
      new ApiError("not found", 404, { error: { message: "not found" } })
    );

    renderWithProviders(<SystemsPage />, { route: "/systems" });

    expect(await screen.findByText("This API is not available yet.")).toBeInTheDocument();
  });
});
