import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  type MonitoringOverview,
  fetchAlerts,
  fetchMonitoringEvents,
  fetchMonitoringOverview,
  fetchUsageSummary,
} from "@/api/monitoring";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDateTime, formatNumber } from "@/utils/format";

const levels = ["", "debug", "info", "warning", "error"];

function deriveOverallStatus(providers: MonitoringOverview["providers"]): string {
  if (!providers) return "unknown";
  const entries = Object.values(providers);
  if (entries.length === 0) return "unknown";
  const offline = entries.filter((entry) => entry.status === "offline").length;
  if (offline === entries.length) return "offline";
  if (offline > 0) return "degraded";
  return "healthy";
}

export function MonitoringPage() {
  const [level, setLevel] = useState("");
  const [source, setSource] = useState("");
  const overviewQuery = useQuery({
    queryKey: ["monitoring-overview"],
    queryFn: fetchMonitoringOverview,
    retry: false,
  });
  const eventsQuery = useQuery({
    queryKey: ["monitoring-events", level, source],
    queryFn: () =>
      fetchMonitoringEvents({
        limit: 50,
        level: level || undefined,
        source: source || undefined,
      }),
    retry: false,
  });
  const alertsQuery = useQuery({
    queryKey: ["monitoring-alerts"],
    queryFn: fetchAlerts,
    retry: false,
  });
  const usageQuery = useQuery({
    queryKey: ["usage-summary"],
    queryFn: fetchUsageSummary,
    retry: false,
  });

  const sources = useMemo(() => {
    const eventSources = new Set<string>();
    for (const event of eventsQuery.data?.items ?? []) {
      if (event.source) eventSources.add(event.source);
    }
    if (source) eventSources.add(source);
    return Array.from(eventSources).sort();
  }, [eventsQuery.data, source]);

  const overview = overviewQuery.data;
  const overallStatus = deriveOverallStatus(overview?.providers);
  const eventsTotal = overview?.events?.total;
  const errorEvents = overview?.events?.by_level?.error;
  const runningJobs = overview?.jobs?.by_status?.running;
  const queuedJobs = overview?.jobs?.by_status?.queued;

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Monitoring</h1>
        <p className="page-subtitle">Operational overview, events, alerts, and usage.</p>
      </header>

      <section className="stats-grid" aria-label="Monitoring overview">
        <Metric label="Status" value={overallStatus} />
        <Metric label="Events" value={formatNumber(eventsTotal)} />
        <Metric label="Errors" value={formatNumber(errorEvents)} />
        <Metric label="Running jobs" value={formatNumber(runningJobs)} />
        <Metric label="Queued jobs" value={formatNumber(queuedJobs)} />
      </section>
      {overviewQuery.isError ? (
        <section className="panel">
          <ErrorState error={overviewQuery.error} title="Overview unavailable" onRetry={() => void overviewQuery.refetch()} />
        </section>
      ) : null}

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Event log</h2>
              <p>Filter by event level and source.</p>
            </div>
            <div className="panel-filters">
              <label className="field compact-field">
                <span>Level</span>
                <select value={level} onChange={(event) => setLevel(event.target.value)}>
                  {levels.map((item) => (
                    <option key={item || "all"} value={item}>
                      {item || "all"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact-field">
                <span>Source</span>
                <select
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  disabled={sources.length === 0}
                >
                  <option value="">all</option>
                  {sources.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          {eventsQuery.isLoading ? <LoadingState label="Loading events" /> : null}
          {eventsQuery.isError ? (
            <ErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} />
          ) : null}
          {eventsQuery.isSuccess && eventsQuery.data.items.length === 0 ? (
            <EmptyState title="No monitoring events" />
          ) : null}
          {eventsQuery.data?.items.length ? (
            <DataTable
              caption="Monitoring events"
              items={eventsQuery.data.items}
              getKey={(event) => event.id}
              columns={[
                { key: "level", header: "Level", render: (event) => <StatusBadge status={event.level} /> },
                { key: "source", header: "Source", render: (event) => event.source },
                { key: "message", header: "Message", render: (event) => event.message },
                { key: "created", header: "Created", render: (event) => formatDateTime(event.created_at) },
              ]}
            />
          ) : null}
        </section>

        <section className="panel">
          <h2>Alerts</h2>
          {alertsQuery.isLoading ? <LoadingState label="Loading alerts" /> : null}
          {alertsQuery.isError ? (
            <ErrorState error={alertsQuery.error} onRetry={() => void alertsQuery.refetch()} />
          ) : null}
          {alertsQuery.isSuccess && alertsQuery.data.items.length === 0 ? (
            <EmptyState title="No active alerts" />
          ) : null}
          <div className="card-list">
            {alertsQuery.data?.items.map((alert) => (
              <article className="list-card vertical-card" key={alert.id}>
                <div className="card-title-row">
                  <h3>{alert.message}</h3>
                  <StatusBadge status={alert.severity} />
                </div>
                {alert.source ? <p className="text-muted">Source: {alert.source}</p> : null}
                <p className="text-muted">Since {formatDateTime(alert.since)}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>Usage</h2>
        {usageQuery.isLoading ? <LoadingState label="Loading usage" /> : null}
        {usageQuery.isError ? (
          <ErrorState error={usageQuery.error} onRetry={() => void usageQuery.refetch()} />
        ) : null}
        {usageQuery.data ? (
          <>
            <p className="section-summary">
              {formatNumber(usageQuery.data.requests)} requests, {formatNumber(usageQuery.data.tokens)} tokens.
            </p>
            {usageQuery.data.by_model.length === 0 ? <EmptyState title="No model usage" /> : null}
            {usageQuery.data.by_model.length ? (
              <DataTable
                caption="Model usage"
                items={usageQuery.data.by_model}
                getKey={(row) => row.model_id}
                columns={[
                  { key: "model", header: "Model", render: (row) => row.model_id },
                  { key: "requests", header: "Requests", render: (row) => formatNumber(row.requests) },
                  { key: "tokens", header: "Tokens", render: (row) => formatNumber(row.tokens) },
                ]}
              />
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="stat-card panel">
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className="stat-value stat-value-text">{value}</span>
      </div>
    </article>
  );
}
