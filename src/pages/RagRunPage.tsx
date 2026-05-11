import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { fetchRagRun } from "@/api/rag";
import { ErrorState } from "@/components/common/ErrorState";
import { JsonPreview } from "@/components/common/JsonPreview";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/utils/format";

export function RagRunPage() {
  const { id } = useParams();
  const runQuery = useQuery({
    queryKey: ["rag-run", id],
    queryFn: () => fetchRagRun(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });
  const run = runQuery.data;

  return (
    <div className="page-container">
      <Link className="back-link" to="/rag">
        Back to RAG Studio
      </Link>
      <header className="page-header page-header-row">
        <div>
          <h1 className="page-title">RAG run</h1>
          <p className="page-subtitle">{run?.question ?? ""}</p>
        </div>
        {run ? <StatusBadge status={run.status} /> : null}
      </header>

      {runQuery.isLoading ? <LoadingState label="Loading RAG run" /> : null}
      {runQuery.isError ? (
        <ErrorState error={runQuery.error} onRetry={() => void runQuery.refetch()} />
      ) : null}

      {run ? (
        <div className="detail-grid">
          <section className="panel">
            <h2>Answer</h2>
            {run.answer ? <p>{run.answer}</p> : <p className="text-muted">Pending answer</p>}
            <dl className="definition-list">
              <div>
                <dt>Confidence</dt>
                <dd>{run.confidence ?? "pending"}</dd>
              </div>
              <div>
                <dt>Started</dt>
                <dd>{formatDateTime(run.started_at)}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>{formatDateTime(run.completed_at)}</dd>
              </div>
              <div>
                <dt>Conversation</dt>
                <dd>{run.conversation_id ?? "Not linked"}</dd>
              </div>
            </dl>
            {run.error ? <p className="error-text">{run.error}</p> : null}
          </section>
          <section className="panel">
            <h2>Evidence</h2>
            <JsonPreview value={run.evidence} label="RAG evidence" />
          </section>
          <section className="panel">
            <h2>Citations</h2>
            <JsonPreview value={run.citations} label="RAG citations" />
          </section>
          <section className="panel">
            <h2>Retrieval rounds</h2>
            <JsonPreview value={run.retrieval_rounds} label="RAG retrieval rounds" />
          </section>
        </div>
      ) : null}
    </div>
  );
}
