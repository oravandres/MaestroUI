import { z } from "zod";
import { postJson } from "@/api/client";
import { jsonArraySchema, parseApiResponse } from "@/api/parse";

const reasoningResultSchema = z.object({
  id: z.string(),
  status: z.string(),
  conclusion: z.string(),
  confidence: z.string(),
  steps: jsonArraySchema,
  risks: jsonArraySchema,
  created_at: z.string().optional().nullable(),
});

const comparisonResultSchema = z.object({
  id: z.string(),
  status: z.string(),
  winner: z.string().optional().nullable(),
  confidence: z.string(),
  criteria_results: jsonArraySchema,
  summary: z.string(),
  created_at: z.string().optional().nullable(),
});

export type ReasoningResult = z.infer<typeof reasoningResultSchema>;
export type ComparisonResult = z.infer<typeof comparisonResultSchema>;

export async function analyzeReasoning(input: {
  prompt: string;
  context?: string;
}): Promise<ReasoningResult> {
  const data = await postJson<unknown>("/api/v1/reasoning/analyze", input);
  return parseApiResponse(reasoningResultSchema, data, "reasoning analysis");
}

export async function compareReasoning(input: {
  option_a: string;
  option_b: string;
  criteria: string;
}): Promise<ComparisonResult> {
  const data = await postJson<unknown>("/api/v1/reasoning/compare", input);
  return parseApiResponse(comparisonResultSchema, data, "reasoning comparison");
}
