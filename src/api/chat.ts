import { z } from "zod";
import { buildApiUrl, ApiError, NetworkError, fetchJson, postJson } from "@/api/client";
import {
  jsonArraySchema,
  jsonObjectSchema,
  paginationSchema,
  parseApiResponse,
} from "@/api/parse";

export const chatModes = [
  "balanced",
  "fast",
  "premium",
  "auto",
  "rag",
  "coding",
  "reasoning",
] as const;

export type ChatMode = (typeof chatModes)[number];

export function isChatMode(value: string): value is ChatMode {
  return chatModes.some((mode) => mode === value);
}

export const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  mode: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// messageSchema is the rich client-side message shape rendered by
// ConversationPage. The Maestro server currently has no "list messages for
// a conversation" endpoint (GET /api/v1/conversations/{id}/messages returns
// 405), and the conversation detail endpoint returns just the flat
// Conversation row — see conversationDetailSchema and fetchConversation
// below. Until that endpoint exists, ConversationPage always sees
// `messages: []` from a fresh load and any user/assistant turn from the
// current session is rendered live from the streamed delta buffer, not
// from persisted state. Keeping this schema intact means we don't have to
// touch the rendering surface when the backend ships the messages list
// and starts populating these fields.
export const messageSchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  role: z.string(),
  content: z.string(),
  model_id: z.string().optional().nullable(),
  system_id: z.string().optional().nullable(),
  mode: z.string().optional().nullable(),
  sources: jsonArraySchema,
  usage: jsonObjectSchema,
  metadata: jsonObjectSchema,
  created_at: z.string(),
});

const conversationsResponseSchema = z.object({
  items: z.array(conversationSchema),
  pagination: paginationSchema,
});

// Maestro PR #34 adds GET /api/v1/conversations/{id}/messages which
// returns `{items: [Message...]}` in chronological order. No pagination
// wrapper today — a single thread is bounded; if any conversation
// grows past a few hundred turns we'll need to add `pagination` here
// and adapt the page to lazy-load. Until then keep the parser permissive
// so a future `pagination` block is silently ignored rather than
// throwing.
const messagesResponseSchema = z.object({
  items: z.array(messageSchema),
});

// Server-side `nonStreamResponse` shape from
// Maestro/internal/chat/handlers.go — flat, not enveloped under `message`.
// Mostly informational here because every UI codepath goes through
// streamChatMessage; sendMessage() is the non-streaming fallback used by a
// few internal scripts and the contract tests.
const sendMessageResponseSchema = z.object({
  message_id: z.string(),
  content: z.string(),
  model: z.string(),
  system: z.string(),
  usage: jsonObjectSchema,
  latency_ms: z.number(),
});

export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type ConversationsResponse = z.infer<typeof conversationsResponseSchema>;
export type SendMessageResponse = z.infer<typeof sendMessageResponseSchema>;

// ConversationDetail is the view-model ConversationPage renders. The
// server splits the surface across two endpoints —
// GET /api/v1/conversations/{id}      -> flat Conversation row
// GET /api/v1/conversations/{id}/messages -> {items: [Message...]}
// — and `fetchConversation` fans them out in parallel and combines the
// results into this shape, so the page does not have to coordinate
// two queries. Failure semantics: if either fetch fails the combined
// promise rejects, which ConversationPage already renders as
// `<ErrorState onRetry=...>`. Empty messages list is the normal
// post-create state and is shown as the "No messages yet" empty
// state, not an error.
export type ConversationDetail = {
  conversation: Conversation;
  messages: Message[];
};

export interface CreateConversationInput {
  title: string;
  mode: ChatMode;
}

export interface SendMessageInput {
  message: string;
  mode: ChatMode;
}

export async function fetchConversations(): Promise<ConversationsResponse> {
  const data = await fetchJson<unknown>("/api/v1/conversations");
  return parseApiResponse(conversationsResponseSchema, data, "conversations");
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const data = await fetchJson<unknown>(
    `/api/v1/conversations/${conversationId}/messages`
  );
  return parseApiResponse(messagesResponseSchema, data, "messages").items;
}

export async function fetchConversation(id: string): Promise<ConversationDetail> {
  // Fan out detail + history in parallel — the two endpoints are
  // independent so Promise.all keeps load time at max(detail, list)
  // instead of detail+list, and matters for long threads. Either rejecting
  // surfaces as an ErrorState in the page via React Query's `isError`.
  const [conversation, messages] = await Promise.all([
    fetchJson<unknown>(`/api/v1/conversations/${id}`).then((data) =>
      parseApiResponse(conversationSchema, data, "conversation")
    ),
    fetchMessages(id),
  ]);
  return { conversation, messages };
}

export async function createConversation(
  input: CreateConversationInput
): Promise<Conversation> {
  const data = await postJson<unknown>("/api/v1/conversations", input);
  return parseApiResponse(conversationSchema, data, "create conversation");
}

export async function sendMessage(
  conversationId: string,
  input: SendMessageInput
): Promise<SendMessageResponse> {
  const data = await postJson<unknown>(
    `/api/v1/conversations/${conversationId}/messages`,
    input
  );
  return parseApiResponse(sendMessageResponseSchema, data, "send message");
}

export async function deleteConversation(id: string): Promise<void> {
  await fetchJson<unknown>(`/api/v1/conversations/${id}`, { method: "DELETE" });
}

export interface StreamChatMessageOptions {
  signal?: AbortSignal;
  onToken: (token: string) => void;
}

function readRequestId(headers: Headers): string | undefined {
  const value = headers.get("x-request-id");
  return value?.trim() || undefined;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function parseErrorBody(text: string): unknown {
  if (text.length === 0) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function messageFromErrorBody(body: unknown, fallback: string): string {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "object" &&
    (body as { error: unknown }).error !== null &&
    "message" in ((body as { error: unknown }).error as Record<string, unknown>) &&
    typeof ((body as { error: { message: unknown } }).error.message) === "string"
  ) {
    return (body as { error: { message: string } }).error.message;
  }
  return fallback;
}

function tokenFromPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const object = payload as Record<string, unknown>;
  for (const key of ["token", "delta", "content"]) {
    if (typeof object[key] === "string") return object[key] as string;
  }
  return undefined;
}

// StreamEventError is raised when Maestro emits `event: error` mid-stream
// (see Maestro/internal/chat/handlers.go:641 — the SSE side-channel for
// upstream-stream failures). ConversationPage's catch block already
// surfaces thrown errors as the message-failed banner; throwing this
// lets the stream error reach the UI instead of being silently swallowed
// by the parser, which used to "emit" the error payload as token text.
export class StreamEventError extends Error {
  readonly code: string;
  readonly payload: Record<string, unknown> | undefined;

  constructor(code: string, message: string, payload?: Record<string, unknown>) {
    super(message);
    this.name = "StreamEventError";
    this.code = code;
    this.payload = payload;
  }
}

// SSEEvent is one fully buffered Server-Sent Event frame as defined in
// https://html.spec.whatwg.org/multipage/server-sent-events.html. Maestro
// emits the three event names below via sseWriter.event() at
// Maestro/internal/chat/streaming.go:255:
//
//   * `token` — payload `{delta: string}` — one chunk per upstream token.
//   * `done`  — payload `{message_id, model, system, mode, usage,
//               latency_ms}` — terminal frame; closes the stream.
//   * `error` — payload `{code, message}` — upstream-side failure that
//               surfaced mid-stream.
type SSEEvent = {
  event: string;
  data: string;
};

// parseSSEFrames takes the rolling text buffer that accumulates from the
// Response.body reader and pulls fully-terminated SSE event frames out
// of it (defined as blank-line delimited groups of `field: value`
// lines). Whatever is left after the last blank line is returned in
// `remainder` so the caller can keep appending bytes from the next
// fetch chunk before re-parsing.
//
// This is the load-bearing fix for the bug where the chat UI rendered
// "event: tokenOkayevent: token theevent: token user..." — the previous
// parser walked the byte stream one line at a time and treated every
// non-`data:` line as a token to forward verbatim. The `event: <name>`
// field lines that the SSE protocol emits before each frame were
// therefore concatenated into the assistant's visible message. SSE is
// inherently a frame protocol (field lines BELONG to the next blank-line
// terminated event), and parsing it line-by-line cannot be correct.
function parseSSEFrames(buffer: string): { events: SSEEvent[]; remainder: string } {
  const events: SSEEvent[] = [];
  const lines = buffer.split(/\r?\n/);
  // Anything after the last newline could be a partial line; if the
  // buffer happens to end in a blank line the trailing element will be
  // "" and the loop below will terminate the in-flight event cleanly
  // before this code runs.
  const remainder = lines.pop() ?? "";

  let eventName = "message";
  let dataLines: string[] = [];

  const flush = () => {
    if (dataLines.length === 0 && eventName === "message") return;
    events.push({ event: eventName, data: dataLines.join("\n") });
    eventName = "message";
    dataLines = [];
  };

  for (const rawLine of lines) {
    // Per spec the BOM at the start of the stream is the only required
    // strip; line.trim() would also eat embedded spaces inside `data:`
    // payloads, so we only chomp the trailing CR that split() may have
    // left when the upstream uses CRLF.
    const line = rawLine.replace(/\r$/, "");

    if (line === "") {
      flush();
      continue;
    }
    if (line.startsWith(":")) {
      // SSE comment / keep-alive — explicitly ignored.
      continue;
    }
    const colonIndex = line.indexOf(":");
    const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
    let value = colonIndex === -1 ? "" : line.slice(colonIndex + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    switch (field) {
      case "event":
        eventName = value || "message";
        break;
      case "data":
        dataLines.push(value);
        break;
      case "id":
      case "retry":
        // Recognized but not interesting for chat streaming.
        break;
      default:
        // Unknown fields are ignored per the SSE spec; CRUCIALLY we no
        // longer forward them to onToken, which is what caused the
        // disappearing-text-becomes-`event: token`-text bug.
        break;
    }
  }

  return { events, remainder };
}

function dispatchSSEEvent(event: SSEEvent, onToken: (token: string) => void): void {
  // OpenAI/legacy compatibility: a bare `data: [DONE]` sentinel inside
  // an unnamed event frame still terminates the stream cleanly.
  if (event.data === "[DONE]") return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(event.data) as unknown;
  } catch {
    // A non-JSON `data:` payload is invalid for any of Maestro's three
    // event names; ignore it rather than forwarding the raw string as
    // if it were a token (the historical behaviour that surfaced
    // protocol garbage in the UI).
    return;
  }

  switch (event.event) {
    case "error": {
      const obj =
        parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
      const code = typeof obj.code === "string" ? obj.code : "stream_error";
      const message =
        typeof obj.message === "string" ? obj.message : "The chat stream failed.";
      throw new StreamEventError(code, message, obj);
    }
    case "done":
      // Terminal frame from sseWriter.event("done", ...) — nothing to
      // emit; ConversationPage refetches the conversation once the
      // promise resolves so the persisted assistant turn replaces the
      // live buffer.
      return;
    case "token":
    case "message":
    default: {
      const token = tokenFromPayload(parsed);
      if (token) onToken(token);
    }
  }
}

export async function streamChatMessage(
  conversationId: string,
  input: SendMessageInput,
  options: StreamChatMessageOptions
): Promise<void> {
  if (options.signal?.aborted) {
    throw new DOMException("The chat request was aborted.", "AbortError");
  }

  const path = `/api/v1/conversations/${conversationId}/messages`;
  try {
    const response = await fetch(buildApiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, stream: true }),
      signal: options.signal,
    });

    if (!response.ok) {
      const body = parseErrorBody(await response.text());
      throw new ApiError(messageFromErrorBody(body, response.statusText), response.status, body, {
        path,
        method: "POST",
        requestId: readRequestId(response.headers),
      });
    }

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, remainder } = parseSSEFrames(buffer);
      buffer = remainder;
      for (const event of events) dispatchSSEEvent(event, options.onToken);
    }

    buffer += decoder.decode();
    // Trailing buffered bytes after the reader closes can still contain
    // one final event if the upstream did not terminate it with a blank
    // line. Append a synthetic blank line so parseSSEFrames flushes any
    // in-flight frame instead of dropping it on the floor.
    if (buffer.trim() !== "") {
      const { events } = parseSSEFrames(`${buffer}\n\n`);
      for (const event of events) dispatchSSEEvent(event, options.onToken);
    }
  } catch (error) {
    if (isAbortError(error) || error instanceof ApiError || error instanceof StreamEventError)
      throw error;
    throw new NetworkError(
      error instanceof Error ? error.message : "The Maestro API could not be reached.",
      { path, method: "POST" },
      { cause: error }
    );
  }
}
