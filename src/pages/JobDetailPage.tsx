import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { XCircle } from "lucide-react";
import { canCancelJob, cancelJob, fetchJob } from "@/api/jobs";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { JsonPreview } from "@/components/common/JsonPreview";
import { LoadingState } from "@/components/common/LoadingState";
import { ProgressBar } from "@/components/common/ProgressBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/utils/format";

export function JobDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const jobQuery = useQuery({
    queryKey: ["job", id],
    queryFn: () => fetchJob(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancelJob(id ?? ""),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["job", id] });
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
  const job = jobQuery.data?.job;
  const cancelEnabled = job ? canCancelJob(job.status) : false;

  return (
    <div className="page-container">
      <Link className="back-link" to="/jobs">
        Back to jobs
      </Link>
      <header className="page-header page-header-row">
        <div>
          <h1 className="page-title">{job?.id ?? "Job"}</h1>
          <p className="page-subtitle">{job?.type ?? ""}</p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          disabled={!cancelEnabled || cancelMutation.isPending}
          onClick={() => cancelMutation.mutate()}
        >
          <XCircle aria-hidden="true" size={16} />
          Cancel
        </button>
      </header>

      {jobQuery.isLoading ? <LoadingState label="Loading job" /> : null}
      {jobQuery.isError ? (
        <ErrorState error={jobQuery.error} onRetry={() => void jobQuery.refetch()} />
      ) : null}
      {cancelMutation.isError ? (
        <ErrorState error={cancelMutation.error} title="Job could not be cancelled" />
      ) : null}

      {job ? (
        <div className="detail-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Status</h2>
                <p>{formatDateTime(job.created_at)}</p>
              </div>
              <StatusBadge status={job.status} />
            </div>
            <ProgressBar value={job.progress} />
            <dl className="definition-list">
              <div>
                <dt>Priority</dt>
                <dd>{job.priority}</dd>
              </div>
              <div>
                <dt>Target system</dt>
                <dd>{job.target_system ?? "Not assigned"}</dd>
              </div>
              <div>
                <dt>Retries</dt>
                <dd>
                  {job.retries} / {job.max_retries}
                </dd>
              </div>
              <div>
                <dt>Run at</dt>
                <dd>{formatDateTime(job.run_at)}</dd>
              </div>
              <div>
                <dt>Started</dt>
                <dd>{formatDateTime(job.started_at)}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>{formatDateTime(job.completed_at)}</dd>
              </div>
            </dl>
          </section>
          <section className="panel">
            <h2>Payloads</h2>
            <details open>
              <summary>Input</summary>
              <JsonPreview value={job.input} label="Job input" />
            </details>
            <details>
              <summary>Output</summary>
              <JsonPreview value={job.output} label="Job output" />
            </details>
            {job.error ? <p className="error-text">{job.error}</p> : null}
          </section>
        </div>
      ) : null}

      {jobQuery.data?.events.length === 0 ? <EmptyState title="No job events" /> : null}
      {jobQuery.data?.events.length ? (
        <section className="panel">
          <h2>Event timeline</h2>
          <ol className="timeline">
            {jobQuery.data.events.map((event) => (
              <li key={event.id}>
                <StatusBadge status={event.level} />
                <div>
                  <strong>{event.message}</strong>
                  <span>{formatDateTime(event.created_at)}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
