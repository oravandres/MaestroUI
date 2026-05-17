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
// server's GET /api/v1/conversations/{id} response is just the flat
// Conversation row; `fetchConversation` wraps it into this shape with an
// empty messages list so the page doesn't have to special-case "no
// history endpoint yet". When the server grows a real
// GET /conversations/{id}/messages, populate `messages` from a parallel
// fetch here and no page change is needed.
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

export async function fetchConversation(id: string): Promise<ConversationDetail> {
  const data = await fetchJson<unknown>(`/api/v1/conversations/${id}`);
  const conversation = parseApiResponse(conversationSchema, data, "conversation");
  return { conversation, messages: [] };
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

function emitStreamLine(line: string, onToken: (token: string) => void) {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith(":")) return;
  const data = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
  if (data === "[DONE]") return;
  try {
    const parsed = JSON.parse(data) as unknown;
    const token = tokenFromPayload(parsed);
    if (token) onToken(token);
  } catch {
    onToken(data);
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
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) emitStreamLine(line, options.onToken);
    }

    buffer += decoder.decode();
    if (buffer.trim() !== "") emitStreamLine(buffer, options.onToken);
  } catch (error) {
    if (isAbortError(error) || error instanceof ApiError) throw error;
    throw new NetworkError(
      error instanceof Error ? error.message : "The Maestro API could not be reached.",
      { path, method: "POST" },
      { cause: error }
    );
  }
}
