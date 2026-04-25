/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the Maestro API (e.g. http://localhost:8002). No trailing slash. */
  readonly VITE_MAESTRO_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
