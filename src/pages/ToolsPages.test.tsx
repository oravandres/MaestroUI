import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { submitCodeReview } from "@/api/coding";
import { fetchMediaAssets, generateMedia, uploadMedia } from "@/api/media";
import {
  fetchAlerts,
  fetchMonitoringEvents,
  fetchMonitoringOverview,
  fetchUsageSummary,
} from "@/api/monitoring";
import { analyzeReasoning, compareReasoning } from "@/api/reasoning";
import { fetchSettings, saveSetting } from "@/api/settings";
import { fetchModels } from "@/api/systems";
import { CodingPage } from "@/pages/CodingPage";
import { MediaPage } from "@/pages/MediaPage";
import { MonitoringPage } from "@/pages/MonitoringPage";
import { ReasoningPage } from "@/pages/ReasoningPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/coding", () => ({
  submitCodeReview: vi.fn(),
}));

vi.mock("@/api/media", () => ({
  fetchMediaAssets: vi.fn(),
  generateMedia: vi.fn(),
  uploadMedia: vi.fn(),
}));

vi.mock("@/api/monitoring", () => ({
  fetchAlerts: vi.fn(),
  fetchMonitoringEvents: vi.fn(),
  fetchMonitoringOverview: vi.fn(),
  fetchUsageSummary: vi.fn(),
}));

vi.mock("@/api/reasoning", () => ({
  analyzeReasoning: vi.fn(),
  compareReasoning: vi.fn(),
}));

vi.mock("@/api/settings", async () => {
  const actual = await vi.importActual<typeof import("@/api/settings")>("@/api/settings");
  return {
    ...actual,
    fetchSettings: vi.fn(),
    saveSetting: vi.fn(),
  };
});

vi.mock("@/api/systems", () => ({
  fetchModels: vi.fn(),
}));

describe("PR3 tool pages", () => {
  beforeEach(() => {
    vi.mocked(submitCodeReview).mockRejectedValue(
      new ApiError("not found", 404, { error: { message: "not found" } })
    );
    vi.mocked(fetchMediaAssets).mockResolvedValue({ items: [], pagination: { total: 0 } });
    vi.mocked(generateMedia).mockRejectedValue(
      new ApiError("not found", 404, { error: { message: "not found" } })
    );
    vi.mocked(uploadMedia).mockRejectedValue(new Error("not called"));
    vi.mocked(fetchModels).mockResolvedValue({
      items: [
        {
          id: "mimi-image",
          system_id: "mimi",
          name: "MiMi Image",
          capability: "media.image",
          quality_tier: "standard",
          status: "online",
          residency_state: "warm",
          context_window: null,
          metadata: {},
          created_at: "2026-05-11T08:00:00Z",
          updated_at: "2026-05-11T08:00:00Z",
        },
      ],
      pagination: { total: 1 },
    });
    vi.mocked(analyzeReasoning).mockRejectedValue(
      new ApiError("not found", 404, { error: { message: "not found" } })
    );
    vi.mocked(compareReasoning).mockRejectedValue(new Error("not called"));
    vi.mocked(fetchSettings).mockResolvedValue({
      items: [
        { key: "api.token", value: "secret-token" },
        { key: "ui.theme", value: "dark" },
      ],
    });
    vi.mocked(saveSetting).mockResolvedValue({ key: "ui.theme", value: "light" });
    vi.mocked(fetchMonitoringOverview).mockResolvedValue({
      status: "healthy",
      requests: 12,
      errors: 0,
      latency_p95_ms: 120,
      active_jobs: 1,
      updated_at: "2026-05-11T08:00:00Z",
    });
    vi.mocked(fetchMonitoringEvents).mockResolvedValue({ items: [], pagination: { total: 0 } });
    vi.mocked(fetchAlerts).mockResolvedValue({ items: [], pagination: { total: 0 } });
    vi.mocked(fetchUsageSummary).mockResolvedValue({
      requests: 12,
      tokens: 345,
      cost_usd: null,
      by_model: [],
    });
  });

  it("validates coding input and shows submit failure state", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CodingPage />, { route: "/coding" });

    expect(screen.getByRole("button", { name: /review/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/diff or patch/i), "diff --git a/file.ts b/file.ts");
    await user.click(screen.getByRole("button", { name: /review/i }));

    expect(await screen.findByText("Review failed")).toBeInTheDocument();
    expect(screen.getByText("This API is not available yet.")).toBeInTheDocument();
  });

  it("shows media model availability and generation failure state", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MediaPage />, { route: "/media" });

    expect(await screen.findByText("No media assets")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText("MiMi Image").length).toBeGreaterThan(0);
    });

    await user.type(screen.getByLabelText(/prompt/i), "Generate an architecture diagram");
    await user.click(screen.getByRole("button", { name: /generate/i }));

    expect(await screen.findByText("Generation failed")).toBeInTheDocument();
  });

  it("validates reasoning forms and shows analysis failure state", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReasoningPage />, { route: "/reasoning" });

    expect(screen.getByRole("button", { name: /analyze/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/^prompt$/i), "Assess the release risk.");
    await user.click(screen.getByRole("button", { name: /analyze/i }));

    expect(await screen.findByText("Analysis failed")).toBeInTheDocument();
  });

  it("masks settings secrets and validates edited JSON", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: "/settings" });

    expect(await screen.findByText("********")).toBeInTheDocument();
    expect(screen.queryByText("secret-token")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ui.theme/i }));
    await user.clear(screen.getByLabelText(/json value/i));
    await user.type(screen.getByLabelText(/json value/i), "not-json");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Value must be valid JSON.")).toBeInTheDocument();
  });

  it("filters monitoring events and renders empty states", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MonitoringPage />, { route: "/monitoring" });

    expect(await screen.findByText("No monitoring events")).toBeInTheDocument();
    expect(await screen.findByText("No active alerts")).toBeInTheDocument();
    expect(await screen.findByText("No model usage")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/level/i), "error");

    await waitFor(() => {
      expect(fetchMonitoringEvents).toHaveBeenCalledWith({
        limit: 50,
        level: "error",
      });
    });
  });
});
