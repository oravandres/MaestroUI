import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { fetchConversations } from "@/api/chat";
import { fetchDashboardSummary } from "@/api/dashboard";
import { fetchMonitoringEvents } from "@/api/monitoring";
import { fetchSystems } from "@/api/systems";
import { DashboardPage } from "@/pages/DashboardPage";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/chat", () => ({
  fetchConversations: vi.fn(),
}));

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
  systems: { total: 3, online: 2, offline: 1 },
  models: { total: 5, online: 1, offline: 4 },
  jobs: {
    by_status: { queued: 4, running: 5, failed: 0, completed: 7, cancelled: 0 },
    by_priority: { high: 1, normal: 4, low: 0 },
    oldest_queued_age_seconds: 12,
  },
  recent_events: [],
};

const systemsResponse = {
  items: [
    {
      id: "mimi",
      name: "MiMi",
      type: "model-provider",
      status: "online",
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
    vi.mocked(fetchConversations).mockResolvedValue({
      items: [],
      pagination: { total: 3 },
    });
    vi.mocked(fetchMonitoringEvents).mockResolvedValue({
      items: [],
      pagination: { total: 0 },
    });
  });

  it("renders dashboard summary tiles using the backend's online/by_status shape", async () => {
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole("link", { name: /mimi/i })).toHaveAttribute(
      "href",
      "/systems/mimi"
    );
    expect(await screen.findByText("No recent events")).toBeInTheDocument();

    const summaryRegion = screen.getByLabelText("Platform summary");

    const systemsCard = within(summaryRegion).getByText("Systems").closest("article");
    expect(within(systemsCard!).getByText("3")).toBeInTheDocument();
    expect(within(systemsCard!).getByText("2 online")).toBeInTheDocument();

    const modelsCard = within(summaryRegion).getByText("Models").closest("article");
    expect(within(modelsCard!).getByText("5")).toBeInTheDocument();
    expect(within(modelsCard!).getByText("1 online")).toBeInTheDocument();

    const conversationsCard = within(summaryRegion).getByText("Conversations").closest("article");
    expect(within(conversationsCard!).getAllByText("3").length).toBeGreaterThan(0);

    const jobsCard = within(summaryRegion).getByText("Jobs").closest("article");
    expect(within(jobsCard!).getByText("5")).toBeInTheDocument();
    expect(within(jobsCard!).getByText("4 queued, 0 failed")).toBeInTheDocument();
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
