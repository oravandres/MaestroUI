import { z } from "zod";
import { fetchJson, putJson } from "@/api/client";
import { parseApiResponse } from "@/api/parse";

export const settingSchema = z.object({
  key: z.string(),
  value: z.unknown(),
});

const settingsResponseSchema = z.object({
  items: z.array(settingSchema),
});

const settingResponseSchema = z.object({
  setting: settingSchema,
});

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
  const data = await putJson<unknown>(`/api/v1/settings/${encodeURIComponent(key)}`, {
    value,
  });
  return parseApiResponse(settingResponseSchema, data, "setting").setting;
}
