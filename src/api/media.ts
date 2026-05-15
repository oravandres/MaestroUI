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
  voice?: string;
  style?: string;
  language?: string;
}

export interface UploadMediaInput {
  type: "audio";
  file: File;
  model_id?: string;
  language?: string;
}

export async function fetchMediaAssets(type?: string): Promise<MediaAssetsResponse> {
  const suffix = type ? `?type=${encodeURIComponent(type)}` : "";
  const data = await fetchJson<unknown>(`/api/v1/media/assets${suffix}`);
  return parseApiResponse(mediaAssetsResponseSchema, data, "media assets");
}

export async function generateMedia(input: GenerateMediaInput): Promise<MediaJobResponse> {
  const path =
    input.type === "audio"
      ? "/api/v1/audio/tts"
      : `/api/v1/media/${input.type}`;
  const body: Record<string, string> = {};
  if (input.type === "audio") {
    body.text = input.prompt;
    if (input.voice) body.voice = input.voice;
    if (input.style) body.style = input.style;
    if (input.language) body.language = input.language;
  } else {
    body.prompt = input.prompt;
  }
  if (input.model_id) body.model_id = input.model_id;
  const data = await postJson<unknown>(path, body);
  return parseApiResponse(mediaJobResponseSchema, data, "media generation");
}

export async function uploadMedia(input: UploadMediaInput): Promise<MediaJobResponse> {
  const body = new FormData();
  body.set("file", input.file);
  if (input.model_id) body.set("model_id", input.model_id);
  if (input.language) body.set("language", input.language);
  const data = await postFormData<unknown>("/api/v1/audio/asr", body);
  return parseApiResponse(mediaJobResponseSchema, data, "media upload");
}
