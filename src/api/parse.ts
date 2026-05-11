import { z } from "zod";

export const jsonObjectSchema: z.ZodType<
  Record<string, unknown>,
  z.ZodTypeDef,
  unknown
> = z.preprocess(
  (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? value
      : {},
  z.record(z.unknown())
);

export const jsonArraySchema: z.ZodType<unknown[], z.ZodTypeDef, unknown> = z.preprocess(
  (value) => (Array.isArray(value) ? value : []),
  z.array(z.unknown())
);

export const paginationSchema: z.ZodType<
  { total: number },
  z.ZodTypeDef,
  unknown
> = z.object({
  total: z.preprocess(
    (value) => (typeof value === "number" ? value : 0),
    z.number().int().nonnegative()
  ),
});

export function parseApiResponse<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  data: unknown,
  context: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`${context} response did not match the expected shape`);
  }
  return result.data;
}
