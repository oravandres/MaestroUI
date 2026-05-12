import { z } from "zod";
import { fetchJson, postJson } from "@/api/client";
import { jsonArraySchema, paginationSchema, parseApiResponse } from "@/api/parse";

export const ragRunSchema = z.object({
  id: z.string(),
  conversation_id: z.string().optional().nullable(),
  question: z.string(),
  status: z.string(),
  retrieval_rounds: jsonArraySchema,
  evidence: jsonArraySchema,
  answer: z.string().optional().nullable(),
  citations: jsonArraySchema,
  confidence: z.string().optional().nullable(),
  error: z.string().optional().nullable(),
  started_at: z.string(),
  completed_at: z.string().optional().nullable(),
});

const ragRunsResponseSchema = z.object({
  items: z.array(ragRunSchema),
  pagination: paginationSchema,
});

const ragRunResponseSchema = z.object({
  run: ragRunSchema,
});

export type RagRun = z.infer<typeof ragRunSchema>;
export type RagRunsResponse = z.infer<typeof ragRunsResponseSchema>;

export interface CreateRagRunInput {
  question: string;
  conversation_id?: string;
}

export async function fetchRagRuns(): Promise<RagRunsResponse> {
  const data = await fetchJson<unknown>("/api/v1/rag/runs");
  return parseApiResponse(ragRunsResponseSchema, data, "rag runs");
}

export async function fetchRagRun(id: string): Promise<RagRun> {
  const data = await fetchJson<unknown>(
    `/api/v1/rag/runs/${encodeURIComponent(id)}`
  );
  return parseApiResponse(ragRunResponseSchema, data, "rag run").run;
}

export async function createRagRun(input: CreateRagRunInput): Promise<RagRun> {
  const data = await postJson<unknown>("/api/v1/rag/agentic", input);
  return parseApiResponse(ragRunResponseSchema, data, "create rag run").run;
}
