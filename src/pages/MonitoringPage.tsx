import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
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

export function MonitoringPage() {
  const [level, setLevel] = useState("");
  const overviewQuery = useQuery({
    queryKey: ["monitoring-overview"],
    queryFn: fetchMonitoringOverview,
    retry: false,
  });
  const eventsQuery = useQuery({
    queryKey: ["monitoring-events", level],
    queryFn: () => fetchMonitoringEvents({ limit: 50, level: level || undefined }),
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

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Monitoring</h1>
        <p className="page-subtitle">Operational overview, events, alerts, and usage.</p>
      </header>

      <section className="stats-grid" aria-label="Monitoring overview">
        <Metric label="Status" value={overviewQuery.data?.status ?? "unknown"} />
        <Metric label="Requests" value={formatNumber(overviewQuery.data?.requests)} />
        <Metric label="Errors" value={formatNumber(overviewQuery.data?.errors)} />
        <Metric label="Active jobs" value={formatNumber(overviewQuery.data?.active_jobs)} />
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
              <p>Filter by event level.</p>
            </div>
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
                  <h3>{alert.title}</h3>
                  <StatusBadge status={alert.level} />
                </div>
                <p>{alert.message}</p>
                <p className="text-muted">{formatDateTime(alert.created_at)}</p>
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
