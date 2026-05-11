const DEV_DEFAULT_BASE = "http://localhost:8002";

/**
 * Base URL for the Maestro HTTP API (no trailing slash).
 * Empty string means "same origin", which lets nginx/Vite proxy /api/v1/*.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_MAESTRO_API_BASE_URL;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === "/") return "";
    return trimmed.replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return DEV_DEFAULT_BASE;
  }
  return "";
}

export interface ApiErrorMeta {
  path?: string;
  method?: string;
  requestId?: string;
  code?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly path?: string;
  readonly method?: string;
  readonly requestId?: string;
  readonly code?: string;

  constructor(
    message: string,
    status: number,
    body: unknown,
    meta: ApiErrorMeta = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.path = meta.path;
    this.method = meta.method;
    this.requestId = meta.requestId;
    this.code = meta.code;
  }
}

export class NetworkError extends Error {
  readonly path?: string;
  readonly method?: string;

  constructor(
    message: string,
    meta: { path?: string; method?: string } = {},
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "NetworkError";
    this.path = meta.path;
    this.method = meta.method;
  }
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

function errorCodeFromBody(data: unknown): string | undefined {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "object" &&
    (data as { error: unknown }).error !== null &&
    "code" in ((data as { error: unknown }).error as Record<string, unknown>) &&
    typeof ((data as { error: { code: unknown } }).error.code) === "string"
  ) {
    return (data as { error: { code: string } }).error.code;
  }
  return undefined;
}

function errorMessageFromBody(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "object" &&
    (data as { error: unknown }).error !== null &&
    "message" in ((data as { error: unknown }).error as Record<string, unknown>) &&
    typeof ((data as { error: { message: unknown } }).error.message) === "string"
  ) {
    return (data as { error: { message: string } }).error.message;
  }
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return fallback;
}

function readRequestId(headers: Headers): string | undefined {
  const raw = headers.get("x-request-id");
  if (raw === null) return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

export async function fetchJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers);
  const method = (init?.method ?? "GET").toUpperCase();

  let res: Response;
  try {
    res = await fetch(buildApiUrl(path), { ...init, headers });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new NetworkError(
      err instanceof Error ? err.message : String(err),
      { path, method },
      { cause: err }
    );
  }
  const requestId = readRequestId(res.headers);
  const text = await res.text();
  let data: unknown;
  if (text.length > 0) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError("Response is not valid JSON", res.status, text, {
        path,
        method,
        requestId,
      });
    }
  } else {
    data = undefined;
  }

  if (!res.ok) {
    throw new ApiError(
      errorMessageFromBody(data, res.statusText),
      res.status,
      data,
      { path, method, requestId, code: errorCodeFromBody(data) }
    );
  }

  return data as T;
}

export async function postJson<TResponse>(
  path: string,
  body: unknown,
  init?: Omit<RequestInit, "body" | "method">
): Promise<TResponse> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  return fetchJson<TResponse>(path, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

export async function putJson<TResponse>(
  path: string,
  body: unknown,
  init?: Omit<RequestInit, "body" | "method">
): Promise<TResponse> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  return fetchJson<TResponse>(path, {
    ...init,
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
}
