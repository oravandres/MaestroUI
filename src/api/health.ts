import { z } from "zod";
import { fetchJson } from "@/api/client";
import { parseApiResponse } from "@/api/parse";

const healthSchema = z.object({
  status: z.string(),
});

export type HealthResponse = z.infer<typeof healthSchema>;

export async function fetchHealth(): Promise<HealthResponse> {
  const data = await fetchJson<unknown>("/api/v1/health");
  return parseApiResponse(healthSchema, data, "health");
}
