import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Job,
  type JobsResponse,
  type QueueSummary,
  cancelJob,
  fetchJobs,
  fetchQueueSummary,
} from "@/api/jobs";
import { JobsPage } from "@/pages/JobsPage";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/jobs", async () => {
  const actual = await vi.importActual<typeof import("@/api/jobs")>("@/api/jobs");
  return {
    ...actual,
    cancelJob: vi.fn(),
    fetchJobs: vi.fn(),
    fetchQueueSummary: vi.fn(),
  };
});

function job(status: string, id = `job-${status}`): Job {
  return {
    id,
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
  };
}

const queueSummary: QueueSummary = {
  queued: 1,
  running: 0,
  workers: 0,
};

function jobsResponse(items: Job[]): JobsResponse {
  return {
    items,
    pagination: { total: items.length },
  };
}

describe("JobsPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchQueueSummary).mockResolvedValue(queueSummary);
    vi.mocked(fetchJobs).mockResolvedValue(jobsResponse([job("queued"), job("completed")]));
  });

  it("confirms job cancellation from the jobs table and refreshes related queries", async () => {
    const user = userEvent.setup();
    vi.mocked(cancelJob).mockResolvedValue(job("cancelled", "job-queued"));
    const { queryClient } = renderWithProviders(<JobsPage />, { route: "/jobs" });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await screen.findByText("job-queued");
    await user.click(screen.getByRole("button", { name: /cancel job-queued/i }));

    expect(screen.getByRole("dialog", { name: /cancel job/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^cancel job$/i }));

    await waitFor(() => {
      expect(vi.mocked(cancelJob).mock.calls[0]?.[0]).toBe("job-queued");
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /cancel job/i })).not.toBeInTheDocument();
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["jobs"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["jobs-summary"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["job", "job-queued"] });
  });

  it("keeps the confirmation open when table cancellation fails", async () => {
    const user = userEvent.setup();
    vi.mocked(cancelJob).mockRejectedValue(new Error("cancel failed"));
    renderWithProviders(<JobsPage />, { route: "/jobs" });

    await screen.findByText("job-queued");
    await user.click(screen.getByRole("button", { name: /cancel job-queued/i }));
    await user.click(screen.getByRole("button", { name: /^cancel job$/i }));

    expect(await screen.findByText("Job could not be cancelled")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /cancel job/i })).toBeInTheDocument();
  });

  it("disables table cancellation for terminal jobs", async () => {
    renderWithProviders(<JobsPage />, { route: "/jobs" });

    await screen.findByText("job-completed");

    expect(screen.getByRole("button", { name: /cancel job-completed/i })).toBeDisabled();
  });

  it("polls jobs and summary while the visible queue has active work", async () => {
    vi.useFakeTimers();
    renderWithProviders(<JobsPage />, { route: "/jobs" });

    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
    });

    expect(screen.getByText("job-queued")).toBeInTheDocument();
    expect(vi.mocked(fetchJobs)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchQueueSummary)).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(vi.mocked(fetchJobs)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetchQueueSummary)).toHaveBeenCalledTimes(2);
  });

  it("does not poll jobs or summary when visible jobs and queue summary are terminal", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchJobs).mockResolvedValue(jobsResponse([job("completed")]));
    vi.mocked(fetchQueueSummary).mockResolvedValue({ queued: 0, running: 0, workers: 0 });

    renderWithProviders(<JobsPage />, { route: "/jobs" });

    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
    });

    expect(screen.getByText("job-completed")).toBeInTheDocument();
    expect(vi.mocked(fetchJobs)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchQueueSummary)).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    expect(vi.mocked(fetchJobs)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchQueueSummary)).toHaveBeenCalledTimes(1);
  });

  it("hides the queue summary tiles when the summary endpoint errors", async () => {
    vi.mocked(fetchQueueSummary).mockRejectedValue(new Error("failed to get job"));
    renderWithProviders(<JobsPage />, { route: "/jobs" });

    expect(await screen.findByText("job-queued")).toBeInTheDocument();
    await waitFor(() => {
      expect(vi.mocked(fetchQueueSummary)).toHaveBeenCalled();
    });

    expect(screen.queryByText("Queued")).not.toBeInTheDocument();
    expect(screen.queryByText("Running")).not.toBeInTheDocument();
    expect(screen.queryByText("Workers")).not.toBeInTheDocument();
    expect(screen.queryByText("Visible jobs")).not.toBeInTheDocument();
    expect(screen.queryByText("Queue summary unavailable")).not.toBeInTheDocument();
  });
});
