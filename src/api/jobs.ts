import { z } from "zod";
import { fetchJson, postJson } from "@/api/client";
import { jsonObjectSchema, paginationSchema, parseApiResponse } from "@/api/parse";

export const jobSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  priority: z.string(),
  target_system: z.string().optional().nullable(),
  input: z.unknown(),
  output: z.unknown(),
  error: z.string().optional().nullable(),
  progress: z.number().int().min(0).max(100),
  external_job_id: z.string().optional().nullable(),
  lease_id: z.string().optional().nullable(),
  lease_expires_at: z.string().optional().nullable(),
  run_at: z.string(),
  idempotency_key: z.string().optional().nullable(),
  retries: z.number().int().nonnegative(),
  max_retries: z.number().int().nonnegative(),
  created_at: z.string(),
  started_at: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
});

export const jobEventSchema = z.object({
  id: z.string(),
  job_id: z.string(),
  level: z.string(),
  message: z.string(),
  metadata: jsonObjectSchema,
  created_at: z.string(),
});

const jobsResponseSchema = z.object({
  items: z.array(jobSchema),
  pagination: paginationSchema,
});

const jobDetailSchema = z.object({
  job: jobSchema,
  events: z.array(jobEventSchema),
});

// Maestro returns /api/v1/queues with aggregated counters keyed by status
// and priority. We surface a flat `{ queued, running, workers }` shape to
// the UI so the JobsPage cards stay readable; the merge happens in
// fetchQueueSummary below.
const queuesResponseSchema = z.object({
  by_status: z.record(z.number().int().nonnegative()),
  by_priority: z.record(z.number().int().nonnegative()),
  oldest_queued_age_seconds: z.number().int().nonnegative(),
});

const workerInfoSchema = z.object({
  id: z.string(),
  hostname: z.string(),
  pid: z.number().int().nonnegative(),
  started_at: z.string(),
  last_heartbeat_at: z.string(),
  metadata: jsonObjectSchema,
});

const workersResponseSchema = z.object({
  items: z.array(workerInfoSchema),
  pagination: paginationSchema,
});

const queueSummarySchema = z.object({
  queued: z.number().int().nonnegative(),
  running: z.number().int().nonnegative(),
  workers: z.number().int().nonnegative(),
});

export type Job = z.infer<typeof jobSchema>;
export type JobEvent = z.infer<typeof jobEventSchema>;
export type JobsResponse = z.infer<typeof jobsResponseSchema>;
export type JobDetail = z.infer<typeof jobDetailSchema>;
export type WorkerInfo = z.infer<typeof workerInfoSchema>;
export type WorkersResponse = z.infer<typeof workersResponseSchema>;
export type QueueSummary = z.infer<typeof queueSummarySchema>;

export interface FetchJobsOptions {
  status?: string;
}

export function canCancelJob(status: string): boolean {
  return status === "queued" || status === "running";
}

export function isActiveJobStatus(status: string): boolean {
  return status === "queued" || status === "running";
}

export async function fetchJobs(options: FetchJobsOptions = {}): Promise<JobsResponse> {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const data = await fetchJson<unknown>(`/api/v1/jobs${suffix}`);
  return parseApiResponse(jobsResponseSchema, data, "jobs");
}

export async function fetchJob(id: string): Promise<JobDetail> {
  const data = await fetchJson<unknown>(`/api/v1/jobs/${id}`);
  return parseApiResponse(jobDetailSchema, data, "job");
}

export async function fetchQueueSummary(): Promise<QueueSummary> {
  // Maestro never shipped /api/v1/jobs/summary — the chi router parses
  // `summary` as a job ID and 500s. The intended data lives in two
  // separate endpoints, so we fan out and merge into the {queued,
  // running, workers} shape the JobsPage cards already expect. Both
  // requests share the page render budget; failures bubble up as a
  // single rejection so the UI's error path keeps working.
  const [queuesData, workersData] = await Promise.all([
    fetchJson<unknown>("/api/v1/queues"),
    fetchJson<unknown>("/api/v1/workers"),
  ]);
  const queues = parseApiResponse(queuesResponseSchema, queuesData, "queues summary");
  const workers = parseApiResponse(workersResponseSchema, workersData, "workers");
  const queued = queues.by_status.queued ?? 0;
  const running = queues.by_status.running ?? 0;
  return parseApiResponse(
    queueSummarySchema,
    { queued, running, workers: workers.items.length },
    "queue summary"
  );
}

export async function cancelJob(id: string): Promise<Job> {
  const data = await postJson<unknown>(`/api/v1/jobs/${id}/cancel`, {});
  return parseApiResponse(z.object({ job: jobSchema }), data, "cancel job").job;
}
