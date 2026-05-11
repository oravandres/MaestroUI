import { z } from "zod";
import { buildApiUrl, ApiError, NetworkError, fetchJson, postJson } from "@/api/client";
import {
  jsonArraySchema,
  jsonObjectSchema,
  paginationSchema,
  parseApiResponse,
} from "@/api/parse";

export const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  mode: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

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

const conversationDetailSchema = z.object({
  conversation: conversationSchema,
  messages: z.array(messageSchema),
});

const createConversationResponseSchema = z.object({
  conversation: conversationSchema,
});

const sendMessageResponseSchema = z.object({
  message: messageSchema.optional(),
});

export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type ConversationsResponse = z.infer<typeof conversationsResponseSchema>;
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;

export interface CreateConversationInput {
  title: string;
  mode: string;
}

export interface SendMessageInput {
  content: string;
  mode: string;
}

export async function fetchConversations(): Promise<ConversationsResponse> {
  const data = await fetchJson<unknown>("/api/v1/conversations");
  return parseApiResponse(conversationsResponseSchema, data, "conversations");
}

export async function fetchConversation(id: string): Promise<ConversationDetail> {
  const data = await fetchJson<unknown>(`/api/v1/conversations/${id}`);
  return parseApiResponse(conversationDetailSchema, data, "conversation");
}

export async function createConversation(
  input: CreateConversationInput
): Promise<Conversation> {
  const data = await postJson<unknown>("/api/v1/conversations", input);
  return parseApiResponse(createConversationResponseSchema, data, "create conversation")
    .conversation;
}

export async function sendMessage(
  conversationId: string,
  input: SendMessageInput
): Promise<Message | undefined> {
  const data = await postJson<unknown>(
    `/api/v1/conversations/${conversationId}/messages`,
    input
  );
  return parseApiResponse(sendMessageResponseSchema, data, "send message").message;
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
