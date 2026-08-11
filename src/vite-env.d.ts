/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of ri-api. Defaults to http://localhost:4000 when unset. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
