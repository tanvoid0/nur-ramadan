/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  /** Optional backend API base URL (e.g. https://api.example.com). When set, user data is synced to the server; IndexedDB is used as cache. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
