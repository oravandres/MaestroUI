import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { fetchModels } from "@/api/systems";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { ModelStateBadge } from "@/components/common/ModelStateBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatNumber } from "@/utils/format";

export function ModelsPage() {
  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: fetchModels,
    refetchInterval: 30_000,
  });

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Models</h1>
        <p className="page-subtitle">Approved models, capabilities, residency, and health.</p>
      </header>

      {modelsQuery.isLoading ? <LoadingState label="Loading models" /> : null}
      {modelsQuery.isError ? (
        <ErrorState error={modelsQuery.error} onRetry={() => void modelsQuery.refetch()} />
      ) : null}
      {modelsQuery.isSuccess && modelsQuery.data.items.length === 0 ? (
        <EmptyState title="No models registered" />
      ) : null}
      {modelsQuery.data?.items.length ? (
        <section className="panel">
          <p className="section-summary">{formatNumber(modelsQuery.data.pagination.total)} models registered.</p>
          <DataTable
            caption="Registered models"
            items={modelsQuery.data.items}
            getKey={(model) => model.id}
            columns={[
              {
                key: "name",
                header: "Model",
                render: (model) => <Link to={`/models/${model.id}`}>{model.name}</Link>,
              },
              { key: "capability", header: "Capability", render: (model) => model.capability },
              { key: "quality", header: "Tier", render: (model) => model.quality_tier },
              { key: "status", header: "Status", render: (model) => <StatusBadge status={model.status} /> },
              { key: "state", header: "Residency", render: (model) => <ModelStateBadge state={model.residency_state} /> },
            ]}
          />
        </section>
      ) : null}
    </div>
  );
}

