import { z } from "zod";
import { postJson } from "@/api/client";
import { jsonArraySchema, parseApiResponse } from "@/api/parse";

export const codeFindingSchema = z.object({
  id: z.string(),
  severity: z.string(),
  title: z.string(),
  detail: z.string(),
  file: z.string().optional().nullable(),
  line: z.number().int().positive().optional().nullable(),
  recommendation: z.string().optional().nullable(),
});

const codeReviewResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  findings: z.array(codeFindingSchema),
  architecture_suggestions: jsonArraySchema,
  test_suggestions: jsonArraySchema,
  final_recommendation: z.string(),
  created_at: z.string().optional().nullable(),
});

export type CodeFinding = z.infer<typeof codeFindingSchema>;
export type CodeReviewResponse = z.infer<typeof codeReviewResponseSchema>;

export interface SubmitCodeReviewInput {
  repository?: string;
  diff: string;
  goals: string;
}

export async function submitCodeReview(
  input: SubmitCodeReviewInput
): Promise<CodeReviewResponse> {
  const data = await postJson<unknown>("/api/v1/coding/review", input);
  return parseApiResponse(codeReviewResponseSchema, data, "code review");
}
