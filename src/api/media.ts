import { z } from "zod";
import { ApiError, fetchJson, postFormData, postJson } from "@/api/client";
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

// Maestro's media/audio submit envelope is `{job_id, external_job_id?,
// job: {... status ...}}` (see internal/media/handlers.go submitResponse).
// Accept the rich envelope and project to the slim `{job_id, status}`
// the UI consumers (MediaPage, tests) already use, so the Zod parse
// no longer rejects a successful submission as "did not match the
// expected shape" while the job is actually queued. The legacy
// `{job_id, status}` shape is still accepted for backward-compat with
// tests and any older Maestro build that lands in front of this UI.
const mediaJobResponseSchema = z.preprocess(
  (raw) => {
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>;
      const inner = obj.job;
      if (
        typeof obj.status !== "string" &&
        inner &&
        typeof inner === "object" &&
        !Array.isArray(inner) &&
        typeof (inner as Record<string, unknown>).status === "string"
      ) {
        return { ...obj, status: (inner as Record<string, unknown>).status };
      }
    }
    return raw;
  },
  z
    .object({
      job_id: z.string(),
      status: z.string(),
    })
    .passthrough()
);

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
  try {
    const data = await fetchJson<unknown>(`/api/v1/media/assets${suffix}`);
    return parseApiResponse(mediaAssetsResponseSchema, data, "media assets");
  } catch (error) {
    // Maestro PLAN.md ticks /media/assets as shipped, but the route is not
    // actually registered yet. Until the backend lands it, treat the 404
    // as an empty gallery so MediaPage shows the standard "No media
    // assets" empty state instead of a generic ErrorState. Anything else
    // (including a real 500) keeps surfacing as an error so backend bugs
    // remain visible. Drop this fallback once `/api/v1/media/assets`
    // ships in Maestro and the live deployment includes it.
    if (error instanceof ApiError && error.status === 404) {
      return { items: [], pagination: { total: 0 } };
    }
    throw error;
  }
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
