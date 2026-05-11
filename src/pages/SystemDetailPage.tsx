import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { fetchModels, fetchSystem } from "@/api/systems";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { ModelStateBadge } from "@/components/common/ModelStateBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime, formatNumber } from "@/utils/format";

export function SystemDetailPage() {
  const { id } = useParams();
  const systemId = id ?? "";
  const systemQuery = useQuery({
    queryKey: ["systems", systemId],
    queryFn: () => fetchSystem(systemId),
    enabled: systemId !== "",
  });
  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: fetchModels,
  });
  const models = (modelsQuery.data?.items ?? []).filter(
    (model) => model.system_id === systemId
  );

  return (
    <div className="page-container">
      <header className="page-header">
        <Link className="back-link" to="/systems">Systems</Link>
        <h1 className="page-title">{systemQuery.data?.name ?? "System"}</h1>
        <p className="page-subtitle">Provider detail and attached models.</p>
      </header>

      {systemQuery.isLoading ? <LoadingState label="Loading system" /> : null}
      {systemQuery.isError ? (
        <ErrorState error={systemQuery.error} onRetry={() => void systemQuery.refetch()} />
      ) : null}
      {systemQuery.data ? (
        <section className="detail-grid">
          <article className="panel">
            <h2>Health</h2>
            <dl className="definition-list">
              <div>
                <dt>Status</dt>
                <dd><StatusBadge status={systemQuery.data.status} /></dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{systemQuery.data.type}</dd>
              </div>
              <div>
                <dt>Base URL</dt>
                <dd>{systemQuery.data.base_url || "Not exposed"}</dd>
              </div>
              <div>
                <dt>Last seen</dt>
                <dd>{formatDateTime(systemQuery.data.last_seen_at)}</dd>
              </div>
            </dl>
          </article>
          <article className="panel">
            <h2>Capabilities</h2>
            {systemQuery.data.capabilities.length ? (
              <div className="tag-list">
                {systemQuery.data.capabilities.map((capability, index) => (
                  <span className="tag" key={`${String(capability)}-${index}`}>
                    {String(capability)}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyState title="No capabilities reported" />
            )}
          </article>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Models</h2>
            <p>{formatNumber(models.length)} attached to this system.</p>
          </div>
        </div>
        {modelsQuery.isLoading ? <LoadingState label="Loading models" /> : null}
        {modelsQuery.isError ? (
          <ErrorState error={modelsQuery.error} onRetry={() => void modelsQuery.refetch()} />
        ) : null}
        {modelsQuery.isSuccess && models.length === 0 ? (
          <EmptyState title="No models attached" />
        ) : null}
        {models.length ? (
          <DataTable
            caption="Attached models"
            items={models}
            getKey={(model) => model.id}
            columns={[
              {
                key: "name",
                header: "Model",
                render: (model) => <Link to={`/models/${model.id}`}>{model.name}</Link>,
              },
              { key: "capability", header: "Capability", render: (model) => model.capability },
              { key: "state", header: "Residency", render: (model) => <ModelStateBadge state={model.residency_state} /> },
            ]}
          />
        ) : null}
      </section>
    </div>
  );
}

