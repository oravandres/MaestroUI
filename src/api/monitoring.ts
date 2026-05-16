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

const countSchema = z.number().int().nonnegative().optional();

const monitoringEventsSummarySchema = z.object({
  total: countSchema,
  by_level: z.record(countSchema).optional(),
});

const monitoringJobsSummarySchema = z.object({
  by_status: z
    .object({
      queued: countSchema,
      running: countSchema,
      completed: countSchema,
      failed: countSchema,
      cancelled: countSchema,
    })
    .optional(),
  by_priority: z.record(countSchema).optional(),
  oldest_queued_age_seconds: z.number().nonnegative().optional(),
});

const monitoringProviderSchema = z.object({
  status: z.string(),
  last_seen_at: z.string().optional().nullable(),
});

const monitoringOverviewSchema = z.object({
  events: monitoringEventsSummarySchema.optional(),
  jobs: monitoringJobsSummarySchema.optional(),
  providers: z.record(monitoringProviderSchema).optional(),
  window_seconds: z.number().nonnegative().optional(),
});

const alertSchema = z.object({
  id: z.string(),
  message: z.string(),
  severity: z.string(),
  since: z.string(),
  source: z.string().optional().nullable(),
});

const alertsResponseSchema = z.object({
  items: z.array(alertSchema),
});

export type PlatformEvent = z.infer<typeof eventSchema>;
export type EventsResponse = z.infer<typeof eventsResponseSchema>;
export type MonitoringOverview = z.infer<typeof monitoringOverviewSchema>;
export type Alert = z.infer<typeof alertSchema>;
export type AlertsResponse = z.infer<typeof alertsResponseSchema>;

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

// NOTE: a `fetchUsageSummary()` helper used to live here and called
// `/api/v1/monitoring/usage`, but Maestro never registered that route — the
// production deployment 404s and bubbles up as a "usage summary response did
// not match the expected shape" banner. The helper and its accompanying
// `<section>` in MonitoringPage have been removed pending a real backend
// endpoint. Re-add both together when Maestro ships `/monitoring/usage`.
