import { describe, expect, it } from "vitest";
import { canCancelJob } from "@/api/jobs";

describe("job status helpers", () => {
  it.each([
    ["queued", true],
    ["running", true],
    ["completed", false],
    ["failed", false],
    ["cancelled", false],
    ["unknown", false],
  ] as const)("canCancelJob(%s) returns %s", (status, expected) => {
    expect(canCancelJob(status)).toBe(expected);
  });
});
