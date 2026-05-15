import { z } from "zod";
import { fetchJson, patchJson } from "@/api/client";
import { parseApiResponse } from "@/api/parse";

export const settingSchema = z.object({
  key: z.string(),
  value: z.unknown(),
});

const wireSettingsPayloadSchema = z.object({
  settings: z.record(z.unknown()),
  updated_at: z.string().optional(),
});

const settingsResponseSchema = wireSettingsPayloadSchema.transform((payload) => ({
  items: Object.entries(payload.settings).map(([key, value]) => ({ key, value })),
  updated_at: payload.updated_at,
}));

export type Setting = z.infer<typeof settingSchema>;
export type SettingsResponse = z.infer<typeof settingsResponseSchema>;

export function isSecretSetting(key: string): boolean {
  return /(secret|token|key|password|credential)/i.test(key);
}

export function displaySettingValue(setting: Setting): string {
  if (isSecretSetting(setting.key)) return "********";
  if (typeof setting.value === "string") return setting.value;
  return JSON.stringify(setting.value);
}

export async function fetchSettings(): Promise<SettingsResponse> {
  const data = await fetchJson<unknown>("/api/v1/settings");
  return parseApiResponse(settingsResponseSchema, data, "settings");
}

export async function saveSetting(key: string, value: unknown): Promise<Setting> {
  const data = await patchJson<unknown>("/api/v1/settings", {
    settings: { [key]: value },
  });
  const parsed = parseApiResponse(wireSettingsPayloadSchema, data, "setting");
  const updatedValue = parsed.settings[key];
  return { key, value: updatedValue ?? value };
}
