import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, rootDir, "");
  const maestroApiKey = env.MAESTRO_API_KEY?.trim();
  const maestroTarget =
    env.MAESTRO_API_PROXY_TARGET?.trim() || "http://localhost:8002";

  void command;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.join(rootDir, "src"),
      },
    },
    server: {
      port: 5175,
      strictPort: true,
      proxy: {
        "/api/v1": {
          target: maestroTarget,
          changeOrigin: true,
          headers: maestroApiKey
            ? { Authorization: `Bearer ${maestroApiKey}` }
            : undefined,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: vendorChunks,
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
    },
  };
});

const vendorBuckets: ReadonlyArray<{ name: string; match: RegExp }> = [
  { name: "vendor-react", match: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
  { name: "vendor-router", match: /[\\/]node_modules[\\/]react-router(-dom)?[\\/]/ },
  { name: "vendor-query", match: /[\\/]node_modules[\\/]@tanstack[\\/]/ },
  { name: "vendor-zod", match: /[\\/]node_modules[\\/]zod[\\/]/ },
  { name: "vendor-icons", match: /[\\/]node_modules[\\/]lucide-react[\\/]/ },
];

function vendorChunks(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;
  for (const bucket of vendorBuckets) {
    if (bucket.match.test(id)) return bucket.name;
  }
  return "vendor-other";
}
