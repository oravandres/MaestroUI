import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { fetchDashboardSummary } from "@/api/dashboard";
import { fetchMonitoringEvents } from "@/api/monitoring";
import { fetchSystems } from "@/api/systems";
import { DashboardPage } from "@/pages/DashboardPage";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/dashboard", () => ({
  fetchDashboardSummary: vi.fn(),
}));

vi.mock("@/api/monitoring", () => ({
  fetchMonitoringEvents: vi.fn(),
}));

vi.mock("@/api/systems", () => ({
  fetchSystems: vi.fn(),
}));

const summary = {
  systems: { total: 1, healthy: 1 },
  models: { total: 2, hot: 1 },
  conversations: { total: 3, recent: 1 },
  jobs: { queued: 4, active: 5, failed: 0 },
};

const systemsResponse = {
  items: [
    {
      id: "mimi",
      name: "MiMi",
      type: "model-provider",
      status: "healthy",
      capabilities: [],
      metadata: {},
      last_seen_at: "2026-05-11T08:00:00Z",
      created_at: "2026-05-10T08:00:00Z",
      updated_at: "2026-05-11T08:00:00Z",
    },
  ],
  pagination: { total: 1 },
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.mocked(fetchDashboardSummary).mockResolvedValue(summary);
    vi.mocked(fetchSystems).mockResolvedValue(systemsResponse);
    vi.mocked(fetchMonitoringEvents).mockResolvedValue({
      items: [],
      pagination: { total: 0 },
    });
  });

  it("renders dashboard summary, systems, and empty events from APIs", async () => {
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole("link", { name: /mimi/i })).toHaveAttribute(
      "href",
      "/systems/mimi"
    );
    expect(await screen.findByText("No recent events")).toBeInTheDocument();

    const summaryRegion = screen.getByLabelText("Platform summary");
    expect(within(summaryRegion).getByText("Conversations")).toBeInTheDocument();
    expect(within(summaryRegion).getByText("3")).toBeInTheDocument();
  });

  it("keeps planned dashboard endpoints retryable when unavailable", async () => {
    vi.mocked(fetchDashboardSummary).mockRejectedValue(
      new ApiError("not found", 404, { error: { message: "not found" } })
    );

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("Dashboard summary unavailable")).toBeInTheDocument();
    expect(screen.getByText("This API is not available yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
