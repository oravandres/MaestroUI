import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { fetchRagRun } from "@/api/rag";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RagRunDetail } from "@/components/rag/RagRunDetail";

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

      {run ? <RagRunDetail run={run} /> : null}
    </div>
  );
}
