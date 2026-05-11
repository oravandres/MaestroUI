import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApiUrl, getApiBaseUrl } from "@/api/client";

describe("api client base URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses same-origin relative paths when the base URL is explicitly blank", () => {
    vi.stubEnv("VITE_MAESTRO_API_BASE_URL", "");

    expect(getApiBaseUrl()).toBe("");
    expect(buildApiUrl("/api/v1/health")).toBe("/api/v1/health");
  });

  it("uses same-origin relative paths when no explicit base URL is configured", () => {
    vi.stubEnv("VITE_MAESTRO_API_BASE_URL", undefined);

    expect(getApiBaseUrl()).toBe("");
    expect(buildApiUrl("api/v1/health")).toBe("/api/v1/health");
  });

  it("normalizes an explicit base URL before building paths", () => {
    vi.stubEnv("VITE_MAESTRO_API_BASE_URL", "https://maestro.example.test/");

    expect(getApiBaseUrl()).toBe("https://maestro.example.test");
    expect(buildApiUrl("/api/v1/systems")).toBe("https://maestro.example.test/api/v1/systems");
  });
});
