import { z } from "zod";
import { fetchJson, postFormData } from "@/api/client";
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

export type KnowledgeSource = z.infer<typeof sourceSchema>;
export type KnowledgeDocument = z.infer<typeof documentSchema>;
export type SourcesResponse = z.infer<typeof sourcesResponseSchema>;
export type DocumentsResponse = z.infer<typeof documentsResponseSchema>;

export interface UploadDocumentInput {
  title: string;
  sourceId?: string;
  file: File;
}

export async function fetchSources(): Promise<SourcesResponse> {
  const data = await fetchJson<unknown>("/api/v1/knowledge/sources");
  return parseApiResponse(sourcesResponseSchema, data, "knowledge sources");
}

export async function fetchDocuments(): Promise<DocumentsResponse> {
  const data = await fetchJson<unknown>("/api/v1/knowledge/documents");
  return parseApiResponse(documentsResponseSchema, data, "knowledge documents");
}

export async function uploadDocument(input: UploadDocumentInput): Promise<KnowledgeDocument> {
  const body = new FormData();
  body.set("title", input.title);
  if (input.sourceId) body.set("source_id", input.sourceId);
  body.set("file", input.file);

  const data = await postFormData<unknown>("/api/v1/knowledge/documents", body);
  return parseApiResponse(uploadDocumentResponseSchema, data, "upload document").document;
}
