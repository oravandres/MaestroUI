import { z } from "zod";
import { fetchJson } from "@/api/client";
import { jsonObjectSchema, paginationSchema, parseApiResponse } from "@/api/parse";

export const eventSchema = z.object({
  id: z.string(),
  source: z.string(),
  level: z.string(),
  event_type: z.string(),
  message: z.string(),
  metadata: jsonObjectSchema,
  created_at: z.string(),
});

const eventsResponseSchema = z.object({
  items: z.array(eventSchema),
  pagination: paginationSchema,
});

const monitoringOverviewSchema = z.object({
  status: z.string(),
  requests: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  latency_p95_ms: z.number().nonnegative().optional().nullable(),
  active_jobs: z.number().int().nonnegative(),
  updated_at: z.string().optional().nullable(),
});

const alertSchema = z.object({
  id: z.string(),
  level: z.string(),
  title: z.string(),
  message: z.string(),
  source: z.string().optional().nullable(),
  created_at: z.string(),
  resolved_at: z.string().optional().nullable(),
});

const usageSummarySchema = z.object({
  requests: z.number().int().nonnegative(),
  tokens: z.number().int().nonnegative(),
  cost_usd: z.number().nonnegative().optional().nullable(),
  by_model: z.array(
    z.object({
      model_id: z.string(),
      requests: z.number().int().nonnegative(),
      tokens: z.number().int().nonnegative(),
    })
  ),
});

const alertsResponseSchema = z.object({
  items: z.array(alertSchema),
  pagination: paginationSchema,
});

export type PlatformEvent = z.infer<typeof eventSchema>;
export type EventsResponse = z.infer<typeof eventsResponseSchema>;
export type MonitoringOverview = z.infer<typeof monitoringOverviewSchema>;
export type Alert = z.infer<typeof alertSchema>;
export type AlertsResponse = z.infer<typeof alertsResponseSchema>;
export type UsageSummary = z.infer<typeof usageSummarySchema>;

export interface FetchMonitoringEventsOptions {
  limit?: number;
  level?: string;
  source?: string;
}

export async function fetchMonitoringEvents(
  options: FetchMonitoringEventsOptions | number = {}
): Promise<EventsResponse> {
  const normalized = typeof options === "number" ? { limit: options } : options;
  const params = new URLSearchParams();
  params.set("limit", String(normalized.limit ?? 10));
  if (normalized.level) params.set("level", normalized.level);
  if (normalized.source) params.set("source", normalized.source);
  const data = await fetchJson<unknown>(`/api/v1/monitoring/events?${params.toString()}`);
  return parseApiResponse(eventsResponseSchema, data, "monitoring events");
}

export async function fetchMonitoringOverview(): Promise<MonitoringOverview> {
  const data = await fetchJson<unknown>("/api/v1/monitoring/overview");
  return parseApiResponse(monitoringOverviewSchema, data, "monitoring overview");
}

export async function fetchAlerts(): Promise<AlertsResponse> {
  const data = await fetchJson<unknown>("/api/v1/monitoring/alerts");
  return parseApiResponse(alertsResponseSchema, data, "monitoring alerts");
}

export async function fetchUsageSummary(): Promise<UsageSummary> {
  const data = await fetchJson<unknown>("/api/v1/monitoring/usage");
  return parseApiResponse(usageSummarySchema, data, "usage summary");
}
