import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { fetchModel, fetchSystem } from "@/api/systems";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { ModelStateBadge } from "@/components/common/ModelStateBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime, formatNumber } from "@/utils/format";

export function ModelDetailPage() {
  const { id } = useParams();
  const modelId = id ?? "";
  const modelQuery = useQuery({
    queryKey: ["models", modelId],
    queryFn: () => fetchModel(modelId),
    enabled: modelId !== "",
  });
  const systemQuery = useQuery({
    queryKey: ["systems", modelQuery.data?.system_id],
    queryFn: () => fetchSystem(modelQuery.data?.system_id ?? ""),
    enabled: Boolean(modelQuery.data?.system_id),
  });

  return (
    <div className="page-container">
      <header className="page-header">
        <Link className="back-link" to="/models">Models</Link>
        <h1 className="page-title">{modelQuery.data?.name ?? "Model"}</h1>
        <p className="page-subtitle">Capability, provider assignment, and residency state.</p>
      </header>

      {modelQuery.isLoading ? <LoadingState label="Loading model" /> : null}
      {modelQuery.isError ? (
        <ErrorState error={modelQuery.error} onRetry={() => void modelQuery.refetch()} />
      ) : null}
      {modelQuery.data ? (
        <section className="detail-grid">
          <article className="panel">
            <h2>Model state</h2>
            <dl className="definition-list">
              <div>
                <dt>Status</dt>
                <dd><StatusBadge status={modelQuery.data.status} /></dd>
              </div>
              <div>
                <dt>Residency</dt>
                <dd><ModelStateBadge state={modelQuery.data.residency_state} /></dd>
              </div>
              <div>
                <dt>Capability</dt>
                <dd>{modelQuery.data.capability}</dd>
              </div>
              <div>
                <dt>Context window</dt>
                <dd>{modelQuery.data.context_window ? formatNumber(modelQuery.data.context_window) : "Unknown"}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatDateTime(modelQuery.data.updated_at)}</dd>
              </div>
            </dl>
          </article>
          <article className="panel">
            <h2>Provider</h2>
            {systemQuery.data ? (
              <Link className="list-card" to={`/systems/${systemQuery.data.id}`}>
                <div>
                  <h3>{systemQuery.data.name}</h3>
                  <p>{systemQuery.data.type}</p>
                </div>
                <StatusBadge status={systemQuery.data.status} />
              </Link>
            ) : systemQuery.isLoading ? (
              <LoadingState label="Loading provider" />
            ) : systemQuery.isError ? (
              <ErrorState error={systemQuery.error} />
            ) : (
              <p className="text-muted">{modelQuery.data.system_id}</p>
            )}
          </article>
        </section>
      ) : null}
    </div>
  );
}

