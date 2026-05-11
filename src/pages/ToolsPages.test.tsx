import { act, screen, waitFor } from "@testing-library/react";
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
        {
          id: "mimi-video",
          system_id: "mimi",
          name: "MiMi Video",
          capability: "media.video",
          quality_tier: "standard",
          status: "online",
          residency_state: "warm",
          context_window: null,
          metadata: {},
          created_at: "2026-05-11T08:00:00Z",
          updated_at: "2026-05-11T08:00:00Z",
        },
        {
          id: "mimi-audio",
          system_id: "mimi",
          name: "MiMi Audio",
          capability: "audio.tts",
          quality_tier: "standard",
          status: "online",
          residency_state: "warm",
          context_window: null,
          metadata: {},
          created_at: "2026-05-11T08:00:00Z",
          updated_at: "2026-05-11T08:00:00Z",
        },
        {
          id: "mimi-asr",
          system_id: "mimi",
          name: "MiMi ASR",
          capability: "audio.asr",
          quality_tier: "standard",
          status: "online",
          residency_state: "warm",
          context_window: null,
          metadata: {},
          created_at: "2026-05-11T08:00:00Z",
          updated_at: "2026-05-11T08:00:00Z",
        },
      ],
      pagination: { total: 4 },
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

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(await screen.findByText("No media assets")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText("MiMi Image").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("MiMi Video")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/prompt/i), "Generate an architecture diagram");
    await user.click(screen.getByRole("button", { name: /generate/i }));

    expect(await screen.findByText("Generation failed")).toBeInTheDocument();
  });

  it("keeps ASR-only models out of the audio generation selector", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MediaPage />, { route: "/media" });

    await screen.findByText("No media assets");
    await user.click(screen.getByRole("button", { name: "audio" }));

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "MiMi Audio" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("option", { name: "MiMi ASR" })).not.toBeInTheDocument();
    expect(screen.getByText("MiMi ASR")).toBeInTheDocument();
  });

  it("keeps media generation and upload cleanup scoped to the submitted media type", async () => {
    const user = userEvent.setup();
    let resolveGeneration: (value: { job_id: string; status: string }) => void = () => {};
    let resolveUpload: (value: { job_id: string; status: string }) => void = () => {};
    vi.mocked(generateMedia).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );
    vi.mocked(uploadMedia).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        })
    );

    renderWithProviders(<MediaPage />, { route: "/media" });

    expect(await screen.findByText("No media assets")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/prompt/i), "image prompt");
    await user.click(screen.getByRole("button", { name: /generate/i }));

    await user.click(screen.getByRole("button", { name: "video" }));
    await waitFor(() => {
      expect(screen.getAllByText("MiMi Video").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("MiMi Image")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/prompt/i), "video prompt");

    await act(async () => {
      resolveGeneration({ job_id: "job-image", status: "queued" });
    });

    expect(screen.getByLabelText(/prompt/i)).toHaveValue("video prompt");

    await user.click(screen.getByRole("button", { name: "audio" }));
    await waitFor(() => {
      expect(screen.getAllByText("MiMi Audio").length).toBeGreaterThan(0);
    });
    const firstAudioInput = screen.getByLabelText(/file/i) as HTMLInputElement;
    await user.upload(firstAudioInput, new File(["first-audio"], "first.wav", { type: "audio/wav" }));
    await user.click(screen.getByRole("button", { name: /transcribe/i }));

    await user.click(screen.getByRole("button", { name: "image" }));
    await user.click(screen.getByRole("button", { name: "audio" }));
    const secondAudioInput = screen.getByLabelText(/file/i) as HTMLInputElement;
    await user.upload(secondAudioInput, new File(["second-audio"], "second.wav", { type: "audio/wav" }));

    await act(async () => {
      resolveUpload({ job_id: "job-audio-upload", status: "queued" });
    });

    expect(secondAudioInput.files?.[0]?.name).toBe("second.wav");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /transcribe/i })).toBeEnabled();
    });
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

    await user.click(screen.getByRole("button", { name: /api.token/i }));
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();

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
