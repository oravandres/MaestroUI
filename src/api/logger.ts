import { ApiError, NetworkError } from "@/api/client";

interface LogContext {
  source?: string;
  key?: unknown;
}

export function logApiError(error: unknown, ctx: LogContext = {}): void {
  if (error instanceof ApiError) {
    console.error("[maestro:api-error]", {
      source: ctx.source,
      key: ctx.key,
      status: error.status,
      path: error.path,
      method: error.method,
      requestId: error.requestId,
      message: error.message,
    });
    return;
  }

  if (error instanceof NetworkError) {
    console.error("[maestro:network-error]", {
      source: ctx.source,
      key: ctx.key,
      path: error.path,
      method: error.method,
      message: error.message,
    });
    return;
  }

  console.error("[maestro:unknown-error]", {
    source: ctx.source,
    key: ctx.key,
    message: error instanceof Error ? error.message : String(error),
  });
}
