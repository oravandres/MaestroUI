import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  jsonArraySchema,
  jsonObjectSchema,
  paginationSchema,
  parseApiResponse,
} from "@/api/parse";

describe("parse helpers", () => {
  it("rejects non-array values instead of silently emptying them", () => {
    const schema = z.object({ capabilities: jsonArraySchema });

    expect(() =>
      parseApiResponse(schema, { capabilities: {} }, "system")
    ).toThrow("system response did not match the expected shape");
  });

  it("rejects non-object values instead of silently emptying them", () => {
    const schema = z.object({ metadata: jsonObjectSchema });

    expect(() =>
      parseApiResponse(schema, { metadata: null }, "model")
    ).toThrow("model response did not match the expected shape");
    expect(() =>
      parseApiResponse(schema, { metadata: [] }, "model")
    ).toThrow("model response did not match the expected shape");
  });

  it("rejects missing or malformed pagination totals", () => {
    expect(() =>
      parseApiResponse(paginationSchema, {}, "pagination")
    ).toThrow("pagination response did not match the expected shape");
    expect(() =>
      parseApiResponse(paginationSchema, { total: "0" }, "pagination")
    ).toThrow("pagination response did not match the expected shape");
  });
});
