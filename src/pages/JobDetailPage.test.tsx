import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { fetchJob } from "@/api/jobs";
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
  beforeEach(() => {
    vi.mocked(fetchJob).mockResolvedValue(jobDetail("queued"));
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
});
