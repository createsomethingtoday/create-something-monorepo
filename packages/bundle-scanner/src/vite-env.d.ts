/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_API_KEY: string;
  readonly VITE_SCANNER_API_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
