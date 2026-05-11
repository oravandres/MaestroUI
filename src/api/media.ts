import { z } from "zod";
import { fetchJson, postFormData, postJson } from "@/api/client";
import { jsonObjectSchema, paginationSchema, parseApiResponse } from "@/api/parse";

export const mediaAssetSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  title: z.string(),
  uri: z.string().optional().nullable(),
  job_id: z.string().optional().nullable(),
  model_id: z.string().optional().nullable(),
  metadata: jsonObjectSchema,
  created_at: z.string(),
});

const mediaAssetsResponseSchema = z.object({
  items: z.array(mediaAssetSchema),
  pagination: paginationSchema,
});

const mediaJobResponseSchema = z.object({
  job_id: z.string(),
  status: z.string(),
});

export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type MediaAssetsResponse = z.infer<typeof mediaAssetsResponseSchema>;
export type MediaJobResponse = z.infer<typeof mediaJobResponseSchema>;

export interface GenerateMediaInput {
  type: "image" | "video" | "audio";
  prompt: string;
  model_id?: string;
}

export interface UploadMediaInput {
  type: "image" | "video" | "audio";
  file: File;
}

export async function fetchMediaAssets(type?: string): Promise<MediaAssetsResponse> {
  const suffix = type ? `?type=${encodeURIComponent(type)}` : "";
  const data = await fetchJson<unknown>(`/api/v1/media/assets${suffix}`);
  return parseApiResponse(mediaAssetsResponseSchema, data, "media assets");
}

export async function generateMedia(input: GenerateMediaInput): Promise<MediaJobResponse> {
  const data = await postJson<unknown>("/api/v1/media/generations", input);
  return parseApiResponse(mediaJobResponseSchema, data, "media generation");
}

export async function uploadMedia(input: UploadMediaInput): Promise<MediaJobResponse> {
  const body = new FormData();
  body.set("type", input.type);
  body.set("file", input.file);
  const data = await postFormData<unknown>("/api/v1/media/uploads", body);
  return parseApiResponse(mediaJobResponseSchema, data, "media upload");
}
