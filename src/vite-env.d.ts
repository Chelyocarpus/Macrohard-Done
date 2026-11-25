/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Cloud sync: the Supabase project address (optional, see README) */
  readonly VITE_SUPABASE_URL?: string;
  /** Cloud sync: the Supabase public "anon" key (optional, see README) */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
