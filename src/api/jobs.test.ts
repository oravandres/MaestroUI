import { afterEach, describe, expect, it, vi } from "vitest";
import { canCancelJob, fetchQueueSummary, isActiveJobStatus } from "@/api/jobs";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchQueueSummary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("merges /api/v1/queues and /api/v1/workers into the flat queue summary shape", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string) => {
        if (url === "/api/v1/queues") {
          return Promise.resolve(
            jsonResponse({
              by_status: { queued: 3, running: 1, completed: 4, failed: 0, cancelled: 0 },
              by_priority: { high: 1, normal: 2, low: 1 },
              oldest_queued_age_seconds: 42,
            })
          );
        }
        if (url === "/api/v1/workers") {
          return Promise.resolve(
            jsonResponse({
              items: [
                {
                  id: "worker-1",
                  hostname: "maestro-1",
                  pid: 1,
                  started_at: "2026-05-16T17:00:00Z",
                  last_heartbeat_at: "2026-05-16T17:01:00Z",
                  metadata: {},
                },
                {
                  id: "worker-2",
                  hostname: "maestro-2",
                  pid: 1,
                  started_at: "2026-05-16T17:00:00Z",
                  last_heartbeat_at: "2026-05-16T17:01:00Z",
                  metadata: {},
                },
              ],
              pagination: { total: 2 },
            })
          );
        }
        throw new Error(`unexpected fetch url: ${url}`);
      });
    vi.stubGlobal("fetch", fetchMock);

    const summary = await fetchQueueSummary();

    expect(summary).toEqual({ queued: 3, running: 1, workers: 2 });
    const calls = fetchMock.mock.calls.map(([url]) => url);
    expect(calls).toContain("/api/v1/queues");
    expect(calls).toContain("/api/v1/workers");
    expect(calls).not.toContain("/api/v1/jobs/summary");
  });

  it("treats missing queue counters as zero so partial payloads stay parseable", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/v1/queues") {
        return Promise.resolve(
          jsonResponse({
            by_status: { completed: 9 },
            by_priority: {},
            oldest_queued_age_seconds: 0,
          })
        );
      }
      if (url === "/api/v1/workers") {
        return Promise.resolve(jsonResponse({ items: [], pagination: { total: 0 } }));
      }
      throw new Error(`unexpected fetch url: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const summary = await fetchQueueSummary();

    expect(summary).toEqual({ queued: 0, running: 0, workers: 0 });
  });
});

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

  it.each([
    ["queued", true],
    ["running", true],
    ["completed", false],
    ["failed", false],
    ["cancelled", false],
    ["unknown", false],
  ] as const)("isActiveJobStatus(%s) returns %s", (status, expected) => {
    expect(isActiveJobStatus(status)).toBe(expected);
  });
});
