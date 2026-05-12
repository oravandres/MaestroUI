import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { XCircle } from "lucide-react";
import {
  type Job,
  canCancelJob,
  cancelJob,
  fetchJobs,
  fetchQueueSummary,
} from "@/api/jobs";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { ProgressBar } from "@/components/common/ProgressBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime, formatNumber } from "@/utils/format";
import { useState } from "react";

const jobStatuses = ["", "queued", "running", "completed", "failed", "cancelled"];

export function JobsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [cancelTarget, setCancelTarget] = useState<Job | null>(null);
  const jobsQuery = useQuery({
    queryKey: ["jobs", status],
    queryFn: () => fetchJobs({ status: status || undefined }),
    retry: false,
  });
  const summaryQuery = useQuery({
    queryKey: ["jobs-summary"],
    queryFn: fetchQueueSummary,
    retry: false,
  });
  const cancelMutation = useMutation({
    mutationFn: cancelJob,
    onSuccess: async (_job, id) => {
      setCancelTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["jobs-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["job", id] }),
      ]);
    },
  });

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Jobs</h1>
        <p className="page-subtitle">Queued, running, completed, and failed Maestro work.</p>
      </header>

      <div className="stats-grid">
        <QueueCard label="Queued" value={summaryQuery.data?.queued} />
        <QueueCard label="Running" value={summaryQuery.data?.running} />
        <QueueCard label="Workers" value={summaryQuery.data?.workers} />
        <QueueCard label="Visible jobs" value={jobsQuery.data?.items.length} />
      </div>
      {summaryQuery.isError ? (
        <section className="panel">
          <ErrorState
            error={summaryQuery.error}
            title="Queue summary unavailable"
            onRetry={() => void summaryQuery.refetch()}
          />
        </section>
      ) : null}

      <section className="panel">
        <label className="field compact-field">
          <span>Status filter</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {jobStatuses.map((item) => (
              <option key={item || "all"} value={item}>
                {item || "all"}
              </option>
            ))}
          </select>
        </label>
      </section>

      {jobsQuery.isLoading ? <LoadingState label="Loading jobs" /> : null}
      {jobsQuery.isError ? (
        <ErrorState error={jobsQuery.error} onRetry={() => void jobsQuery.refetch()} />
      ) : null}
      {jobsQuery.isSuccess && jobsQuery.data.items.length === 0 ? (
        <EmptyState title="No jobs found" />
      ) : null}
      {jobsQuery.data?.items.length ? (
        <section className="panel">
          <DataTable
            caption="Jobs"
            items={jobsQuery.data.items}
            getKey={(job) => job.id}
            columns={[
              {
                key: "id",
                header: "Job",
                render: (job) => <Link to={`/jobs/${job.id}`}>{job.id}</Link>,
              },
              { key: "type", header: "Type", render: (job) => job.type },
              { key: "status", header: "Status", render: (job) => <StatusBadge status={job.status} /> },
              { key: "priority", header: "Priority", render: (job) => job.priority },
              {
                key: "progress",
                header: "Progress",
                render: (job) => <ProgressBar value={job.progress} />,
              },
              {
                key: "created",
                header: "Created",
                render: (job) => formatDateTime(job.created_at),
              },
              {
                key: "actions",
                header: "Actions",
                render: (job) => (
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Cancel ${job.id}`}
                    disabled={!canCancelJob(job.status) || cancelMutation.isPending}
                    onClick={() => {
                      cancelMutation.reset();
                      setCancelTarget(job);
                    }}
                  >
                    <XCircle aria-hidden="true" size={16} />
                  </button>
                ),
              },
            ]}
          />
        </section>
      ) : null}
      {cancelTarget ? (
        <ConfirmDialog
          title="Cancel job"
          confirmLabel="Cancel job"
          isBusy={cancelMutation.isPending}
          onCancel={() => {
            cancelMutation.reset();
            setCancelTarget(null);
          }}
          onConfirm={() => cancelMutation.mutate(cancelTarget.id)}
        >
          <p>
            Cancel <strong>{cancelTarget.id}</strong>? Maestro will stop running or queued work for
            this job when cancellation is accepted.
          </p>
          {cancelMutation.isError ? (
            <ErrorState error={cancelMutation.error} title="Job could not be cancelled" />
          ) : null}
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

function QueueCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <article className="stat-card panel">
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{formatNumber(value)}</span>
      </div>
    </article>
  );
}
