import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { Bot, BriefcaseBusiness, Database, MessageSquare, RefreshCw } from "lucide-react";
import { fetchConversations } from "@/api/chat";
import { fetchDashboardSummary } from "@/api/dashboard";
import { fetchMonitoringEvents } from "@/api/monitoring";
import { fetchSystems } from "@/api/systems";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime, formatNumber } from "@/utils/format";

export function DashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchDashboardSummary,
    retry: false,
  });
  const systemsQuery = useQuery({
    queryKey: ["systems"],
    queryFn: fetchSystems,
    refetchInterval: 30_000,
  });
  const conversationsQuery = useQuery({
    queryKey: ["dashboard-conversations"],
    queryFn: fetchConversations,
    retry: false,
  });
  const eventsQuery = useQuery({
    queryKey: ["monitoring-events", 10],
    queryFn: () => fetchMonitoringEvents(10),
    retry: false,
  });

  const summary = summaryQuery.data;
  const systems = systemsQuery.data?.items ?? [];
  const onlineSystemCount = systems.filter((system) => system.status === "online").length;
  const jobCounts = summary?.jobs?.by_status;
  const conversationsTotal = conversationsQuery.data?.pagination?.total;

  return (
    <div className="page-container" id="dashboard-page">
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Platform health, model state, jobs, and recent activity.</p>
      </header>

      <section className="stats-grid" aria-label="Platform summary">
        <SummaryCard
          icon={<RefreshCw aria-hidden="true" size={22} />}
          label="Systems"
          value={
            summary?.systems?.total ??
            systemsQuery.data?.pagination.total ??
            systems.length
          }
          detail={`${formatNumber(summary?.systems?.online ?? onlineSystemCount)} online`}
        />
        <SummaryCard
          icon={<Bot aria-hidden="true" size={22} />}
          label="Models"
          value={summary?.models?.total}
          detail={`${formatNumber(summary?.models?.online)} online`}
        />
        <SummaryCard
          icon={<MessageSquare aria-hidden="true" size={22} />}
          label="Conversations"
          value={conversationsTotal}
          detail={`${formatNumber(conversationsTotal)} total`}
        />
        <SummaryCard
          icon={<BriefcaseBusiness aria-hidden="true" size={22} />}
          label="Jobs"
          value={jobCounts?.running}
          detail={`${formatNumber(jobCounts?.queued)} queued, ${formatNumber(jobCounts?.failed)} failed`}
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Systems</h2>
              <p>Current provider health from Maestro.</p>
            </div>
            <Link className="button button-secondary" to="/systems">
              View systems
            </Link>
          </div>
          {systemsQuery.isLoading ? <LoadingState label="Loading systems" /> : null}
          {systemsQuery.isError ? (
            <ErrorState error={systemsQuery.error} onRetry={() => void systemsQuery.refetch()} />
          ) : null}
          {systemsQuery.isSuccess && systems.length === 0 ? (
            <EmptyState title="No systems registered" />
          ) : null}
          {systems.length > 0 ? (
            <div className="card-list">
              {systems.map((system) => (
                <Link className="list-card" key={system.id} to={`/systems/${system.id}`}>
                  <div>
                    <h3>{system.name}</h3>
                    <p>{system.type}</p>
                  </div>
                  <StatusBadge status={system.status} />
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Recent events</h2>
              <p>Latest platform activity.</p>
            </div>
            <Link className="button button-secondary" to="/monitoring">
              Open monitoring
            </Link>
          </div>
          {eventsQuery.isLoading ? <LoadingState label="Loading events" /> : null}
          {eventsQuery.isError ? (
            <ErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} />
          ) : null}
          {eventsQuery.isSuccess && eventsQuery.data.items.length === 0 ? (
            <EmptyState title="No recent events" />
          ) : null}
          {eventsQuery.data?.items.length ? (
            <ol className="timeline">
              {eventsQuery.data.items.map((event) => (
                <li key={event.id}>
                  <StatusBadge status={event.level} />
                  <div>
                    <strong>{event.message}</strong>
                    <span>{event.source} · {formatDateTime(event.created_at)}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      </div>

      {summaryQuery.isError ? (
        <section className="panel">
          <ErrorState
            error={summaryQuery.error}
            title="Dashboard summary unavailable"
            onRetry={() => void summaryQuery.refetch()}
          />
        </section>
      ) : null}

      <section className="quick-actions" aria-label="Quick actions">
        <Link to="/chat" className="quick-action">
          <MessageSquare aria-hidden="true" size={20} />
          <span>New chat</span>
        </Link>
        <Link to="/knowledge" className="quick-action">
          <Database aria-hidden="true" size={20} />
          <span>Upload document</span>
        </Link>
        <Link to="/jobs" className="quick-action">
          <BriefcaseBusiness aria-hidden="true" size={20} />
          <span>Submit job</span>
        </Link>
      </section>
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  detail: string;
}

function SummaryCard({ icon, label, value, detail }: SummaryCardProps) {
  return (
    <article className="stat-card panel">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{formatNumber(value)}</span>
        <span className="stat-detail">{detail}</span>
      </div>
    </article>
  );
}
