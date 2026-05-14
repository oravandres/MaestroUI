import { z } from "zod";
import { postJson } from "@/api/client";
import { jsonArraySchema, parseApiResponse } from "@/api/parse";

export const codeFindingSchema = z.object({
  severity: z.string(),
  title: z.string(),
  explanation: z.string(),
  path: z.string().optional().nullable(),
  line: z.number().int().positive().optional().nullable(),
  recommendation: z.string().optional().nullable(),
});

const codeReviewResponseSchema = z.object({
  summary: z.string(),
  findings: z.array(codeFindingSchema),
  architecture_notes: jsonArraySchema,
  tests_to_add: jsonArraySchema,
  final_recommendation: z.string(),
});

export type CodeFinding = z.infer<typeof codeFindingSchema>;
export type CodeReviewResponse = z.infer<typeof codeReviewResponseSchema>;

export interface SubmitCodeReviewInput {
  repository?: string;
  language?: string;
  diff: string;
  instructions?: string;
}

export async function submitCodeReview(
  input: SubmitCodeReviewInput
): Promise<CodeReviewResponse> {
  const data = await postJson<unknown>("/api/v1/coding/review", input);
  return parseApiResponse(codeReviewResponseSchema, data, "code review");
}
