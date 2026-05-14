import { z } from "zod";
import { postJson } from "@/api/client";
import { jsonArraySchema, parseApiResponse } from "@/api/parse";

export const codingReviewVariants = [
  "review",
  "architecture",
  "refactor_plan",
  "security_review",
] as const;

export type CodingReviewVariant = (typeof codingReviewVariants)[number];

const codingReviewRoutes: Record<CodingReviewVariant, string> = {
  review: "/api/v1/coding/review",
  architecture: "/api/v1/coding/architecture",
  refactor_plan: "/api/v1/coding/refactor-plan",
  security_review: "/api/v1/coding/security-review",
};

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
  variant?: CodingReviewVariant;
  repository?: string;
  language?: string;
  diff: string;
  instructions?: string;
}

export async function submitCodeReview(
  input: SubmitCodeReviewInput
): Promise<CodeReviewResponse> {
  const { variant = "review", ...body } = input;
  const data = await postJson<unknown>(codingReviewRoutes[variant], body);
  return parseApiResponse(codeReviewResponseSchema, data, "code review");
}
