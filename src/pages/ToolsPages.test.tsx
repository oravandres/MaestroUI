import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { submitCodeReview } from "@/api/coding";
import { fetchJob } from "@/api/jobs";
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
  codingReviewVariants: ["review", "architecture", "refactor_plan", "security_review"],
  submitCodeReview: vi.fn(),
}));

vi.mock("@/api/jobs", async () => {
  const actual = await vi.importActual<typeof import("@/api/jobs")>("@/api/jobs");
  return {
    ...actual,
    fetchJob: vi.fn(),
  };
});

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
    vi.clearAllMocks();
    vi.mocked(submitCodeReview).mockRejectedValue(
      new ApiError("not found", 404, { error: { message: "not found" } })
    );
    vi.mocked(fetchMediaAssets).mockResolvedValue({ items: [], pagination: { total: 0 } });
    vi.mocked(generateMedia).mockRejectedValue(
      new ApiError("not found", 404, { error: { message: "not found" } })
    );
    vi.mocked(uploadMedia).mockRejectedValue(new Error("not called"));
    vi.mocked(fetchJob).mockRejectedValue(
      new ApiError("not found", 404, { error: { message: "not found" } })
    );
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
      latency_p95_ms: 145,
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

    expect(screen.getByRole("button", { name: /run review/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/diff or patch/i), "diff --git a/file.ts b/file.ts");
    await user.click(screen.getByRole("button", { name: /run review/i }));

    expect(vi.mocked(submitCodeReview).mock.calls[0]?.[0]).toEqual({
      diff: "diff --git a/file.ts b/file.ts",
      instructions: "Correctness, maintainability, accessibility, and tests.",
      repository: undefined,
      variant: "review",
    });
    expect(await screen.findByText("Review failed")).toBeInTheDocument();
    expect(screen.getByText("This API is not available yet.")).toBeInTheDocument();
  });

  it.each([
    [
      "Architecture",
      "Analyze architecture",
      "architecture",
      "Architecture boundaries, coupling, data flow, scalability, and operational risk.",
    ],
    [
      "Refactor plan",
      "Plan refactor",
      "refactor_plan",
      "Small safe refactor steps, compatibility risks, test strategy, and rollout order.",
    ],
    [
      "Security",
      "Review security",
      "security_review",
      "Authentication, authorization, input validation, secrets handling, XSS, and data exposure.",
    ],
  ] as const)(
    "submits the %s coding variant",
    async (variantLabel, submitLabel, variant, expectedInstructions) => {
      const user = userEvent.setup();
      vi.mocked(submitCodeReview).mockResolvedValue({
        summary: "Review completed.",
        findings: [],
        architecture_notes: [],
        tests_to_add: [],
        final_recommendation: "approve",
      });

      renderWithProviders(<CodingPage />, { route: "/coding" });
      await user.click(screen.getByRole("button", { name: variantLabel }));
      await user.type(screen.getByLabelText(/diff or patch/i), "diff --git a/file.ts b/file.ts");
      await user.click(screen.getByRole("button", { name: submitLabel }));

      expect(screen.getByRole("button", { name: variantLabel })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(vi.mocked(submitCodeReview).mock.calls[0]?.[0]).toEqual({
        diff: "diff --git a/file.ts b/file.ts",
        instructions: expectedInstructions,
        repository: undefined,
        variant,
      });
      expect(await screen.findByText("approve")).toBeInTheDocument();
    }
  );

  it("renders structured coding review architecture and test suggestions", async () => {
    const user = userEvent.setup();
    vi.mocked(submitCodeReview).mockResolvedValue({
      summary: "Review found contract drift.",
      findings: [
        {
          severity: "high",
          title: "Request payload does not match Maestro",
          explanation: "The UI must send instructions, not goals.",
          path: "src/api/coding.ts",
          line: 34,
          recommendation: "Rename the field before calling postJson.",
        },
      ],
      architecture_notes: [
        {
          title: "Extract review service",
          detail: "Move review submission into a dedicated module.",
          path: "src/api/coding.ts",
          line: 40,
          severity: "critical",
          recommendation: "Add a service wrapper around postJson.",
          next_steps: [
            "Move the postJson call behind a service interface.",
            "Add a unit test covering the new service.",
          ],
          owner: "platform",
        },
        "Document the API contract in the README.",
        { nested: { still: ["unknown"] } },
      ],
      tests_to_add: [
        {
          name: "Covers structured findings rendering",
          description: "Adds an RTL test that asserts the findings list renders severity badges.",
          next_steps: "Run the new test in CI to confirm the suite passes.",
        },
      ],
      final_recommendation: "request_changes",
    });

    renderWithProviders(<CodingPage />, { route: "/coding" });
    await user.type(screen.getByLabelText(/diff or patch/i), "diff --git a/file.ts b/file.ts");
    await user.click(screen.getByRole("button", { name: /run review/i }));

    expect(await screen.findByText("request_changes")).toBeInTheDocument();
    expect(screen.getByText("Review found contract drift.")).toBeInTheDocument();
    expect(screen.getByText("Request payload does not match Maestro")).toBeInTheDocument();
    expect(screen.getByText("The UI must send instructions, not goals.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Architecture notes" })
    ).toBeInTheDocument();
    expect(screen.getByText("Extract review service")).toBeInTheDocument();
    expect(screen.getByText("src/api/coding.ts:40")).toBeInTheDocument();
    expect(screen.getByText("Add a service wrapper around postJson.")).toBeInTheDocument();
    expect(screen.getByText("Document the API contract in the README.")).toBeInTheDocument();
    expect(screen.getByText("Architecture note 3 raw payload")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Test suggestions" })
    ).toBeInTheDocument();
    expect(screen.getByText("Covers structured findings rendering")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Adds an RTL test that asserts the findings list renders severity badges."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText("Move the postJson call behind a service interface.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Add a unit test covering the new service.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Run the new test in CI to confirm the suite passes.")
    ).toBeInTheDocument();

    const criticalBadge = screen.getByText("critical").closest(".status-badge");
    expect(criticalBadge).not.toBeNull();
    expect(criticalBadge).toHaveClass("status-badge-error");
  });

  it("renders empty coding suggestion states when the review returns no extras", async () => {
    const user = userEvent.setup();
    vi.mocked(submitCodeReview).mockResolvedValue({
      summary: "No issues found.",
      findings: [],
      architecture_notes: [],
      tests_to_add: [],
      final_recommendation: "approve",
    });

    renderWithProviders(<CodingPage />, { route: "/coding" });
    await user.type(screen.getByLabelText(/diff or patch/i), "diff --git a/file.ts b/file.ts");
    await user.click(screen.getByRole("button", { name: /run review/i }));

    expect(await screen.findByText("approve")).toBeInTheDocument();
    expect(screen.getByText("No issues found.")).toBeInTheDocument();
    expect(screen.getByText("No architecture notes returned")).toBeInTheDocument();
    expect(screen.getByText("No test suggestions returned")).toBeInTheDocument();
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

  it("renders inline previews for completed media assets", async () => {
    vi.mocked(fetchMediaAssets).mockResolvedValue({
      items: [
        {
          id: "asset-image",
          type: "image",
          status: "completed",
          title: "Architecture diagram",
          uri: "https://media.local/diagram.png",
          job_id: "job-image",
          model_id: "mimi-image",
          metadata: {},
          created_at: "2026-05-11T08:00:00Z",
        },
        {
          id: "asset-pending",
          type: "image",
          status: "queued",
          title: "Pending render",
          uri: null,
          job_id: "job-image-2",
          model_id: null,
          metadata: {},
          created_at: "2026-05-11T08:01:00Z",
        },
      ],
      pagination: { total: 2 },
    });

    renderWithProviders(<MediaPage />, { route: "/media" });

    const preview = (await screen.findByAltText("Architecture diagram")) as HTMLImageElement;
    expect(preview.tagName).toBe("IMG");
    expect(preview.getAttribute("src")).toBe("https://media.local/diagram.png");
    expect(preview).toHaveClass("asset-preview-image");

    expect(screen.queryByAltText("Pending render")).not.toBeInTheDocument();
    expect(screen.getByText("Pending render")).toBeInTheDocument();
  });

  it("renders inline previews for completed video and audio assets", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchMediaAssets).mockImplementation(async (type?: string) => {
      if (type === "video") {
        return {
          items: [
            {
              id: "asset-video",
              type: "video",
              status: "completed",
              title: "Studio clip",
              uri: "https://media.local/clip.mp4",
              job_id: "job-video",
              model_id: "mimi-video",
              metadata: {},
              created_at: "2026-05-11T08:00:00Z",
            },
          ],
          pagination: { total: 1 },
        };
      }
      if (type === "audio") {
        return {
          items: [
            {
              id: "asset-audio",
              type: "audio",
              status: "completed",
              title: "Voice over",
              uri: "https://media.local/voice.wav",
              job_id: "job-audio",
              model_id: "mimi-audio",
              metadata: {},
              created_at: "2026-05-11T08:00:00Z",
            },
          ],
          pagination: { total: 1 },
        };
      }
      return { items: [], pagination: { total: 0 } };
    });

    renderWithProviders(<MediaPage />, { route: "/media" });
    await screen.findByText("No media assets");

    await user.click(screen.getByRole("button", { name: "video" }));

    const video = await screen.findByLabelText("Studio clip");
    expect(video.tagName).toBe("VIDEO");
    expect(video).toHaveAttribute("src", "https://media.local/clip.mp4");
    expect(video).toHaveClass("asset-preview-video");

    await user.click(screen.getByRole("button", { name: "audio" }));

    const audio = await screen.findByLabelText("Voice over");
    expect(audio.tagName).toBe("AUDIO");
    expect(audio).toHaveAttribute("src", "https://media.local/voice.wav");
    expect(audio).toHaveClass("asset-preview-audio");
  });

  it("scopes audio.tts and audio.asr models to their dedicated forms", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MediaPage />, { route: "/media" });

    await screen.findByText("No media assets");
    await user.click(screen.getByRole("button", { name: "audio" }));

    const ttsForm = await screen.findByRole("form", { name: "Generate audio" });
    const asrForm = await screen.findByRole("form", { name: "Transcribe audio" });

    await waitFor(() => {
      expect(within(ttsForm).getByRole("option", { name: "MiMi Audio" })).toBeInTheDocument();
    });
    expect(within(ttsForm).queryByRole("option", { name: "MiMi ASR" })).not.toBeInTheDocument();
    expect(within(asrForm).getByRole("option", { name: "MiMi ASR" })).toBeInTheDocument();
    expect(within(asrForm).queryByRole("option", { name: "MiMi Audio" })).not.toBeInTheDocument();
  });

  it("submits TTS with voice, style, and language fields", async () => {
    const user = userEvent.setup();
    vi.mocked(generateMedia).mockResolvedValue({ job_id: "job-tts", status: "queued" });
    renderWithProviders(<MediaPage />, { route: "/media" });

    await screen.findByText("No media assets");
    await user.click(screen.getByRole("button", { name: "audio" }));

    const ttsForm = await screen.findByRole("form", { name: "Generate audio" });
    await user.selectOptions(within(ttsForm).getByLabelText("Model"), "mimi-audio");
    await user.type(within(ttsForm).getByLabelText("Text"), "Welcome to Maestro.");
    await user.type(within(ttsForm).getByLabelText("Voice"), "narrator");
    await user.type(within(ttsForm).getByLabelText("Style"), "calm");
    await user.type(within(ttsForm).getByLabelText("Language"), "en");
    await user.click(within(ttsForm).getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(vi.mocked(generateMedia).mock.calls[0]?.[0]).toEqual({
        type: "audio",
        prompt: "Welcome to Maestro.",
        model_id: "mimi-audio",
        voice: "narrator",
        style: "calm",
        language: "en",
      });
    });
    expect(await screen.findByText(/job-tts/)).toBeInTheDocument();
  });

  it("submits ASR with model and language fields", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadMedia).mockResolvedValue({ job_id: "job-asr", status: "queued" });
    renderWithProviders(<MediaPage />, { route: "/media" });

    await screen.findByText("No media assets");
    await user.click(screen.getByRole("button", { name: "audio" }));

    const asrForm = await screen.findByRole("form", { name: "Transcribe audio" });
    await user.selectOptions(within(asrForm).getByLabelText("Model"), "mimi-asr");
    await user.type(within(asrForm).getByLabelText("Language"), "et");
    const audioFile = new File(["sample"], "clip.wav", { type: "audio/wav" });
    await user.upload(within(asrForm).getByLabelText("File") as HTMLInputElement, audioFile);
    await user.click(within(asrForm).getByRole("button", { name: /transcribe/i }));

    await waitFor(() => {
      expect(vi.mocked(uploadMedia).mock.calls[0]?.[0]).toEqual({
        type: "audio",
        file: audioFile,
        model_id: "mimi-asr",
        language: "et",
      });
    });
    expect(await screen.findByText(/job-asr/)).toBeInTheDocument();
  });

  it("renders inline job status with polled progress", async () => {
    const user = userEvent.setup();
    vi.mocked(generateMedia).mockResolvedValue({ job_id: "job-image", status: "queued" });
    vi.mocked(fetchJob).mockResolvedValue({
      job: {
        id: "job-image",
        type: "media.image",
        status: "running",
        priority: "normal",
        target_system: "mimi",
        input: {},
        output: {},
        error: null,
        progress: 42,
        external_job_id: null,
        lease_id: null,
        lease_expires_at: null,
        run_at: "2026-05-11T08:00:00Z",
        idempotency_key: null,
        retries: 0,
        max_retries: 3,
        created_at: "2026-05-11T08:00:00Z",
        started_at: "2026-05-11T08:00:01Z",
        completed_at: null,
      },
      events: [],
    });

    renderWithProviders(<MediaPage />, { route: "/media" });
    await screen.findByText("No media assets");
    await user.type(screen.getByLabelText(/prompt/i), "image prompt");
    await user.click(screen.getByRole("button", { name: /generate/i }));

    expect(await screen.findByText(/running \(42%\)/)).toBeInTheDocument();
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

  it("renders analyze results with structured key points and risks", async () => {
    const user = userEvent.setup();
    vi.mocked(analyzeReasoning).mockResolvedValue({
      id: "an-1",
      status: "completed",
      conclusion: "Release is high risk but tractable.",
      confidence: "medium",
      steps: [
        {
          title: "Inspect migration order",
          description: "Confirm migrations run before traffic shifts.",
          next_steps: ["Coordinate with DBAs."],
        },
        "Validate rollback plan with QA.",
        { strange: { nested: true } },
      ],
      risks: [
        {
          title: "Schema drift",
          detail: "Migration may leave nullable columns behind.",
          severity: "high",
          mitigation: "Add a follow-up migration to enforce NOT NULL.",
          likelihood: "likely",
        },
        "Operational toil if alerts fire after rollout.",
        { weird_shape: 1 },
      ],
      created_at: "2026-05-15T10:00:00Z",
    });

    renderWithProviders(<ReasoningPage />, { route: "/reasoning" });
    await user.type(screen.getByLabelText(/^prompt$/i), "Assess the release risk.");
    await user.click(screen.getByRole("button", { name: /analyze/i }));

    expect(
      await screen.findByText("Release is high risk but tractable.")
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Key points" })).toBeInTheDocument();
    expect(screen.getByText("Inspect migration order")).toBeInTheDocument();
    expect(
      screen.getByText("Confirm migrations run before traffic shifts.")
    ).toBeInTheDocument();
    expect(screen.getByText("Coordinate with DBAs.")).toBeInTheDocument();
    expect(screen.getByText("Validate rollback plan with QA.")).toBeInTheDocument();
    expect(screen.getByText("Key point 3 raw payload")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Risks" })).toBeInTheDocument();
    expect(screen.getByText("Schema drift")).toBeInTheDocument();
    expect(screen.getByText("Likelihood: likely")).toBeInTheDocument();
    expect(
      screen.getByText("Add a follow-up migration to enforce NOT NULL.")
    ).toBeInTheDocument();
    expect(screen.getByText("Operational toil if alerts fire after rollout.")).toBeInTheDocument();
    expect(screen.getByText("Risk 3 raw payload")).toBeInTheDocument();

    const highBadge = screen.getByText("high").closest(".status-badge");
    expect(highBadge).not.toBeNull();
    expect(highBadge).toHaveClass("status-badge-error");
  });

  it("shows analyze empty state when no key points or risks are returned", async () => {
    const user = userEvent.setup();
    vi.mocked(analyzeReasoning).mockResolvedValue({
      id: "an-2",
      status: "completed",
      conclusion: "Nothing to report.",
      confidence: "low",
      steps: [],
      risks: [],
      created_at: "2026-05-15T10:00:00Z",
    });

    renderWithProviders(<ReasoningPage />, { route: "/reasoning" });
    await user.type(screen.getByLabelText(/^prompt$/i), "Look for issues.");
    await user.click(screen.getByRole("button", { name: /analyze/i }));

    expect(await screen.findByText("Nothing to report.")).toBeInTheDocument();
    expect(screen.getByText("No key points returned")).toBeInTheDocument();
    expect(screen.getByText("No risks returned")).toBeInTheDocument();
  });

  it("renders compare results with a score matrix and recommendation", async () => {
    const user = userEvent.setup();
    vi.mocked(compareReasoning).mockResolvedValue({
      id: "cmp-1",
      status: "completed",
      winner: "Option A",
      confidence: "high",
      summary: "Option A offers better total value.",
      criteria_results: [
        {
          option: "Option A",
          score: 8,
          weighted_total: 7.4,
          breakdown: [
            { criterion: "Cost", score: 7 },
            { criterion: "Speed", score: 9 },
          ],
        },
        {
          option: "Option B",
          score: 6,
          weighted_total: 6.1,
          breakdown: [
            { criterion: "Cost", score: 8 },
            { criterion: "Speed", score: 5 },
          ],
        },
        { criterion: "Cost", weight: 0.4, detail: "Operating cost per month" },
        {
          recommendation: "Pick Option A and renegotiate Option B's pricing.",
          caveats: ["Assumes pricing stays stable for 12 months."],
        },
        { freeform: "no schema match" },
      ],
      created_at: "2026-05-15T10:00:00Z",
    });

    renderWithProviders(<ReasoningPage />, { route: "/reasoning" });
    await user.type(screen.getByLabelText(/option a/i), "Option A");
    await user.type(screen.getByLabelText(/option b/i), "Option B");
    await user.type(screen.getByLabelText(/criteria/i), "Cost, Speed");
    await user.click(screen.getByRole("button", { name: /^compare$/i }));

    expect(await screen.findByText("Option A offers better total value.")).toBeInTheDocument();

    const matrix = await screen.findByRole("table");
    expect(matrix.querySelectorAll("thead th")).toHaveLength(5);
    const rows = matrix.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(2);
    const firstRow = rows[0] as HTMLTableRowElement;
    expect(firstRow.textContent).toContain("Option A");
    expect(firstRow.textContent).toContain("★");
    expect(firstRow.textContent).toContain("7.40");

    expect(screen.getByText(/Operating cost per month/)).toBeInTheDocument();
    expect(
      screen.getByText("Pick Option A and renegotiate Option B's pricing.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Assumes pricing stays stable for 12 months.")
    ).toBeInTheDocument();
    expect(screen.getByText("Comparison detail 5 raw payload")).toBeInTheDocument();
  });

  it("falls back to a raw disclosure when compare returns unknown shape", async () => {
    const user = userEvent.setup();
    vi.mocked(compareReasoning).mockResolvedValue({
      id: "cmp-2",
      status: "completed",
      winner: null,
      confidence: "medium",
      summary: "Comparison details unavailable.",
      criteria_results: ["raw note", { strange: { shape: true } }],
      created_at: "2026-05-15T10:00:00Z",
    });

    renderWithProviders(<ReasoningPage />, { route: "/reasoning" });
    await user.type(screen.getByLabelText(/option a/i), "X");
    await user.type(screen.getByLabelText(/option b/i), "Y");
    await user.type(screen.getByLabelText(/criteria/i), "Speed");
    await user.click(screen.getByRole("button", { name: /^compare$/i }));

    expect(await screen.findByText("Comparison details unavailable.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("Comparison detail 1 raw payload")).toBeInTheDocument();
    expect(screen.getByText("Comparison detail 2 raw payload")).toBeInTheDocument();
  });

  it("masks settings secrets and validates edited JSON live", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { route: "/settings" });

    expect(await screen.findByText("********")).toBeInTheDocument();
    expect(screen.queryByText("secret-token")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /api.token/i }));
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /ui.theme/i }));
    await user.clear(screen.getByLabelText(/json value/i));
    await user.type(screen.getByLabelText(/json value/i), "not-json");

    expect(await screen.findByText("Value must be valid JSON.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();

    await user.clear(screen.getByLabelText(/json value/i));
    await user.type(screen.getByLabelText(/json value/i), '"light"');

    expect(
      await screen.findByText("JSON parses cleanly — ready to save.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeEnabled();
  });

  it("requires audit confirmation before saving a secret setting", async () => {
    const user = userEvent.setup();
    vi.mocked(saveSetting).mockResolvedValue({ key: "api.token", value: "rotated-token" });
    renderWithProviders(<SettingsPage />, { route: "/settings" });

    await screen.findByText("********");
    await user.click(screen.getByRole("button", { name: /api.token/i }));
    await user.type(screen.getByLabelText(/json value/i), '"rotated-token"');

    expect(
      await screen.findByText("JSON parses cleanly — ready to save.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();

    const auditCheckbox = screen.getByRole("checkbox", {
      name: /sensitive setting will be recorded in the audit log/i,
    });
    await user.click(auditCheckbox);

    expect(screen.getByRole("button", { name: /save/i })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(vi.mocked(saveSetting).mock.calls[0]?.[0]).toBe("api.token");
      expect(vi.mocked(saveSetting).mock.calls[0]?.[1]).toBe("rotated-token");
    });
    expect(await screen.findByText("Setting saved.")).toBeInTheDocument();
  });

  it("filters monitoring events by level and renders empty states", async () => {
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
        source: undefined,
      });
    });
  });

  it("renders latency p95 and filters events by source", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchMonitoringEvents).mockResolvedValue({
      items: [
        {
          id: "evt-1",
          source: "maestro",
          level: "info",
          event_type: "request",
          message: "Request accepted",
          metadata: {},
          created_at: "2026-05-15T10:00:00Z",
        },
        {
          id: "evt-2",
          source: "sparky",
          level: "warning",
          event_type: "warning",
          message: "Sparky cold start",
          metadata: {},
          created_at: "2026-05-15T10:01:00Z",
        },
      ],
      pagination: { total: 2 },
    });

    renderWithProviders(<MonitoringPage />, { route: "/monitoring" });

    expect(await screen.findByText("145 ms")).toBeInTheDocument();
    expect(screen.getByText("Latency p95")).toBeInTheDocument();

    const sourceSelect = await screen.findByLabelText(/source/i);
    await waitFor(() => expect(sourceSelect).not.toBeDisabled());
    await user.selectOptions(sourceSelect, "sparky");

    await waitFor(() => {
      expect(fetchMonitoringEvents).toHaveBeenLastCalledWith({
        limit: 50,
        level: undefined,
        source: "sparky",
      });
    });
  });
});
