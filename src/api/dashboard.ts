import { z } from "zod";
import { fetchJson } from "@/api/client";
import { parseApiResponse } from "@/api/parse";

const countSchema = z.number().int().nonnegative().optional();

const systemSummaryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
});

const systemSummarySchema = z.object({
  total: countSchema,
  online: countSchema,
  offline: countSchema,
  items: z.array(systemSummaryItemSchema).optional(),
});

const modelSummarySchema = z.object({
  total: countSchema,
  online: countSchema,
  offline: countSchema,
});

const jobsByStatusSchema = z.object({
  queued: countSchema,
  running: countSchema,
  completed: countSchema,
  failed: countSchema,
  cancelled: countSchema,
});

const jobsByPrioritySchema = z.object({
  high: countSchema,
  normal: countSchema,
  low: countSchema,
});

const jobSummarySchema = z.object({
  by_status: jobsByStatusSchema.optional(),
  by_priority: jobsByPrioritySchema.optional(),
  oldest_queued_age_seconds: z.number().nonnegative().optional(),
});

const dashboardSummarySchema = z
  .object({
    systems: systemSummarySchema.optional(),
    models: modelSummarySchema.optional(),
    jobs: jobSummarySchema.optional(),
    recent_events: z.array(z.unknown()).optional(),
  })
  .transform((value) => ({
    systems: value.systems ?? {},
    models: value.models ?? {},
    jobs: value.jobs ?? {},
    recent_events: value.recent_events ?? [],
  }));

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const data = await fetchJson<unknown>("/api/v1/dashboard/summary");
  return parseApiResponse(dashboardSummarySchema, data, "dashboard summary");
}
