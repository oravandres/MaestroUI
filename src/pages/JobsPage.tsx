import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { fetchJobs, fetchQueueSummary } from "@/api/jobs";
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
  const [status, setStatus] = useState("");
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
            ]}
          />
        </section>
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
