import { z } from "zod";
import { fetchJson, patchJson, postFormData, postJson } from "@/api/client";
import { jsonObjectSchema, paginationSchema, parseApiResponse } from "@/api/parse";

export const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  description: z.string().optional().nullable(),
  metadata: jsonObjectSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export const documentSchema = z.object({
  id: z.string(),
  source_id: z.string().optional().nullable(),
  title: z.string(),
  uri: z.string().optional().nullable(),
  content_type: z.string().optional().nullable(),
  status: z.string(),
  metadata: jsonObjectSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

const sourcesResponseSchema = z.object({
  items: z.array(sourceSchema),
  pagination: paginationSchema,
});

const documentsResponseSchema = z.object({
  items: z.array(documentSchema),
  pagination: paginationSchema,
});

const uploadDocumentResponseSchema = z.object({
  document: documentSchema,
});

const documentResponseSchema = z.object({
  document: documentSchema,
});

const sourceResponseSchema = z.object({
  source: sourceSchema,
});

export type KnowledgeSource = z.infer<typeof sourceSchema>;
export type KnowledgeDocument = z.infer<typeof documentSchema>;
export type SourcesResponse = z.infer<typeof sourcesResponseSchema>;
export type DocumentsResponse = z.infer<typeof documentsResponseSchema>;

export interface CreateKnowledgeSourceInput {
  name: string;
  type: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateKnowledgeSourceInput {
  name: string;
  type: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UploadDocumentInput {
  title: string;
  sourceId?: string;
  file: File;
}

export async function fetchSources(): Promise<SourcesResponse> {
  const data = await fetchJson<unknown>("/api/v1/knowledge/sources");
  return parseApiResponse(sourcesResponseSchema, data, "knowledge sources");
}

export async function fetchSource(id: string): Promise<KnowledgeSource> {
  const data = await fetchJson<unknown>(
    `/api/v1/knowledge/sources/${encodeURIComponent(id)}`
  );
  return parseApiResponse(sourceResponseSchema, data, "knowledge source").source;
}

export async function createSource(
  input: CreateKnowledgeSourceInput
): Promise<KnowledgeSource> {
  const data = await postJson<unknown>("/api/v1/knowledge/sources", {
    ...input,
    metadata: input.metadata ?? {},
  });
  return parseApiResponse(sourceResponseSchema, data, "create knowledge source").source;
}

export async function updateSource(
  id: string,
  input: UpdateKnowledgeSourceInput
): Promise<KnowledgeSource> {
  const data = await patchJson<unknown>(
    `/api/v1/knowledge/sources/${encodeURIComponent(id)}`,
    {
      ...input,
      metadata: input.metadata ?? {},
    }
  );
  return parseApiResponse(sourceResponseSchema, data, "update knowledge source").source;
}

export async function fetchDocuments(): Promise<DocumentsResponse> {
  const data = await fetchJson<unknown>("/api/v1/knowledge/documents");
  return parseApiResponse(documentsResponseSchema, data, "knowledge documents");
}

export async function fetchDocument(id: string): Promise<KnowledgeDocument> {
  const data = await fetchJson<unknown>(
    `/api/v1/knowledge/documents/${encodeURIComponent(id)}`
  );
  return parseApiResponse(documentResponseSchema, data, "knowledge document").document;
}

export async function uploadDocument(input: UploadDocumentInput): Promise<KnowledgeDocument> {
  const body = new FormData();
  body.set("title", input.title);
  if (input.sourceId) body.set("source_id", input.sourceId);
  body.set("file", input.file);

  const data = await postFormData<unknown>("/api/v1/knowledge/documents/upload", body);
  return parseApiResponse(uploadDocumentResponseSchema, data, "upload document").document;
}
