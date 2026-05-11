import { z } from "zod";
import { fetchJson } from "@/api/client";
import { parseApiResponse } from "@/api/parse";

const countSchema = z.number().int().nonnegative().optional();
const systemSummarySchema = z.object({
  total: countSchema,
  healthy: countSchema,
  degraded: countSchema,
  offline: countSchema,
});
const modelSummarySchema = z.object({
  total: countSchema,
  hot: countSchema,
  cold: countSchema,
  loading: countSchema,
  evicting: countSchema,
});
const conversationSummarySchema = z.object({
  total: countSchema,
  recent: countSchema,
});
const jobSummarySchema = z.object({
  active: countSchema,
  queued: countSchema,
  failed: countSchema,
});

const dashboardSummarySchema = z
  .object({
    systems: systemSummarySchema.optional(),
    models: modelSummarySchema.optional(),
    conversations: conversationSummarySchema.optional(),
    jobs: jobSummarySchema.optional(),
  })
  .transform((value) => ({
    systems: value.systems ?? {},
    models: value.models ?? {},
    conversations: value.conversations ?? {},
    jobs: value.jobs ?? {},
  }));

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const data = await fetchJson<unknown>("/api/v1/dashboard/summary");
  return parseApiResponse(dashboardSummarySchema, data, "dashboard summary");
}
