import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { RefreshCw } from "lucide-react";
import { fetchSystems, refreshSystems } from "@/api/systems";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime } from "@/utils/format";

export function SystemsPage() {
  const queryClient = useQueryClient();
  const systemsQuery = useQuery({
    queryKey: ["systems"],
    queryFn: fetchSystems,
    refetchInterval: 30_000,
  });
  const refreshMutation = useMutation({
    mutationFn: refreshSystems,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["systems"] });
      await queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });

  return (
    <div className="page-container">
      <header className="page-header page-header-row">
        <div>
          <h1 className="page-title">Systems</h1>
          <p className="page-subtitle">MiMi, Darkbase, Sparky, and other registered providers.</p>
        </div>
        <button
          className="button button-primary"
          type="button"
          disabled={refreshMutation.isPending}
          onClick={() => refreshMutation.mutate()}
        >
          <RefreshCw aria-hidden="true" size={16} />
          Refresh
        </button>
      </header>

      {refreshMutation.isError ? (
        <ErrorState error={refreshMutation.error} title="Refresh failed" />
      ) : null}
      {systemsQuery.isLoading ? <LoadingState label="Loading systems" /> : null}
      {systemsQuery.isError ? (
        <ErrorState error={systemsQuery.error} onRetry={() => void systemsQuery.refetch()} />
      ) : null}
      {systemsQuery.isSuccess && systemsQuery.data.items.length === 0 ? (
        <EmptyState title="No systems registered" />
      ) : null}
      {systemsQuery.data?.items.length ? (
        <section className="panel">
          <DataTable
            caption="Registered systems"
            items={systemsQuery.data.items}
            getKey={(system) => system.id}
            columns={[
              {
                key: "name",
                header: "System",
                render: (system) => <Link to={`/systems/${system.id}`}>{system.name}</Link>,
              },
              { key: "type", header: "Type", render: (system) => system.type },
              {
                key: "status",
                header: "Status",
                render: (system) => <StatusBadge status={system.status} />,
              },
              {
                key: "lastSeen",
                header: "Last seen",
                render: (system) => formatDateTime(system.last_seen_at),
              },
            ]}
          />
        </section>
      ) : null}
    </div>
  );
}

