import { z } from "zod";
import { fetchJson, postJson } from "@/api/client";
import {
  jsonArraySchema,
  jsonObjectSchema,
  paginationSchema,
  parseApiResponse,
} from "@/api/parse";

export const systemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  base_url: z.string().optional(),
  status: z.string(),
  capabilities: jsonArraySchema,
  metadata: jsonObjectSchema,
  last_seen_at: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const modelSchema = z.object({
  id: z.string(),
  system_id: z.string(),
  name: z.string(),
  capability: z.string(),
  quality_tier: z.string(),
  status: z.string(),
  residency_state: z.string(),
  context_window: z.number().int().positive().optional().nullable(),
  metadata: jsonObjectSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

const systemsResponseSchema = z.object({
  items: z.array(systemSchema),
  pagination: paginationSchema,
});

const modelsResponseSchema = z.object({
  items: z.array(modelSchema),
  pagination: paginationSchema,
});

const refreshResponseSchema = z.object({
  status: z.string(),
});

export type System = z.infer<typeof systemSchema>;
export type Model = z.infer<typeof modelSchema>;
export type SystemsResponse = z.infer<typeof systemsResponseSchema>;
export type ModelsResponse = z.infer<typeof modelsResponseSchema>;

export async function fetchSystems(): Promise<SystemsResponse> {
  const data = await fetchJson<unknown>("/api/v1/systems");
  return parseApiResponse(systemsResponseSchema, data, "systems");
}

export async function fetchSystem(id: string): Promise<System> {
  const data = await fetchJson<unknown>(`/api/v1/systems/${id}`);
  return parseApiResponse(systemSchema, data, "system");
}

export async function fetchModels(): Promise<ModelsResponse> {
  const data = await fetchJson<unknown>("/api/v1/models");
  return parseApiResponse(modelsResponseSchema, data, "models");
}

export async function fetchModel(id: string): Promise<Model> {
  const data = await fetchJson<unknown>(`/api/v1/models/${id}`);
  return parseApiResponse(modelSchema, data, "model");
}

export async function refreshSystems(): Promise<string> {
  const data = await postJson<unknown>("/api/v1/systems/refresh", {});
  return parseApiResponse(refreshResponseSchema, data, "systems refresh").status;
}
