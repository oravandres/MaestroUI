import { z } from "zod";
import { fetchJson, patchJson } from "@/api/client";
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

const saveSettingResponseSchema = z.union([settingResponseSchema, settingsResponseSchema]);

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
  const parsed = parseApiResponse(saveSettingResponseSchema, data, "setting");
  if ("setting" in parsed) return parsed.setting;
  const updated = parsed.items.find((setting) => setting.key === key);
  if (updated) return updated;
  throw new Error("Settings response did not include the updated setting.");
}
