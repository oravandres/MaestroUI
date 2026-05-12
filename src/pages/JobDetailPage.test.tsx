import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { cancelJob, fetchJob } from "@/api/jobs";
import { JobDetailPage } from "@/pages/JobDetailPage";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/jobs", async () => {
  const actual = await vi.importActual<typeof import("@/api/jobs")>("@/api/jobs");
  return {
    ...actual,
    fetchJob: vi.fn(),
    cancelJob: vi.fn(),
  };
});

function jobDetail(status: string) {
  return {
    job: {
      id: `job-${status}`,
      type: "rag",
      status,
      priority: "normal",
      target_system: null,
      input: {},
      output: {},
      error: null,
      progress: status === "completed" ? 100 : 25,
      external_job_id: null,
      lease_id: null,
      lease_expires_at: null,
      run_at: "2026-05-11T08:00:00Z",
      idempotency_key: null,
      retries: 0,
      max_retries: 3,
      created_at: "2026-05-11T08:00:00Z",
      started_at: null,
      completed_at: null,
    },
    events: [],
  };
}

describe("JobDetailPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchJob).mockResolvedValue(jobDetail("queued"));
    vi.mocked(cancelJob).mockResolvedValue(jobDetail("cancelled").job);
  });

  it("enables cancellation only for cancellable statuses", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/jobs/:id" element={<JobDetailPage />} />
      </Routes>,
      { route: "/jobs/job-queued" }
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancel/i })).toBeEnabled();
    });
  });

  it("disables cancellation for completed jobs", async () => {
    vi.mocked(fetchJob).mockResolvedValue(jobDetail("completed"));

    renderWithProviders(
      <Routes>
        <Route path="/jobs/:id" element={<JobDetailPage />} />
      </Routes>,
      { route: "/jobs/job-completed" }
    );

    expect(await screen.findByRole("button", { name: /cancel/i })).toBeDisabled();
  });

  it("confirms cancellation and refreshes detail, list, and summary queries", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(
      <Routes>
        <Route path="/jobs/:id" element={<JobDetailPage />} />
      </Routes>,
      { route: "/jobs/job-queued" }
    );
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await screen.findByText("job-queued");
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(screen.getByRole("dialog", { name: /cancel job/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^cancel job$/i }));

    await waitFor(() => {
      expect(vi.mocked(cancelJob)).toHaveBeenCalledWith("job-queued");
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /cancel job/i })).not.toBeInTheDocument();
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["job", "job-queued"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["jobs"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["jobs-summary"] });
  });

  it("keeps the detail confirmation open when cancellation fails", async () => {
    const user = userEvent.setup();
    vi.mocked(cancelJob).mockRejectedValue(new Error("cancel failed"));

    renderWithProviders(
      <Routes>
        <Route path="/jobs/:id" element={<JobDetailPage />} />
      </Routes>,
      { route: "/jobs/job-queued" }
    );

    await screen.findByText("job-queued");
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    await user.click(screen.getByRole("button", { name: /^cancel job$/i }));

    expect(await screen.findByText("Job could not be cancelled")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /cancel job/i })).toBeInTheDocument();
  });

  it("polls active job details", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchJob).mockResolvedValue(jobDetail("running"));

    renderWithProviders(
      <Routes>
        <Route path="/jobs/:id" element={<JobDetailPage />} />
      </Routes>,
      { route: "/jobs/job-running" }
    );

    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
    });

    expect(screen.getByText("job-running")).toBeInTheDocument();
    expect(vi.mocked(fetchJob)).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(vi.mocked(fetchJob)).toHaveBeenCalledTimes(2);
  });

  it("stops polling terminal job details", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchJob).mockResolvedValue(jobDetail("completed"));

    renderWithProviders(
      <Routes>
        <Route path="/jobs/:id" element={<JobDetailPage />} />
      </Routes>,
      { route: "/jobs/job-completed" }
    );

    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
    });

    expect(screen.getByText("job-completed")).toBeInTheDocument();
    expect(vi.mocked(fetchJob)).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    expect(vi.mocked(fetchJob)).toHaveBeenCalledTimes(1);
  });
});
