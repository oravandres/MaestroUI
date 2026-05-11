import { describe, expect, it } from "vitest";
import { z } from "zod";
import { jsonArraySchema, parseApiResponse } from "@/api/parse";

describe("parse helpers", () => {
  it("rejects non-array values instead of silently emptying them", () => {
    const schema = z.object({ capabilities: jsonArraySchema });

    expect(() =>
      parseApiResponse(schema, { capabilities: {} }, "system")
    ).toThrow("system response did not match the expected shape");
  });
});
