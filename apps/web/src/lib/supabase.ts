import { createClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __SUPABASE__?: { url: string; key: string };
  }
}

const config = window.__SUPABASE__;
if (!config) {
  throw new Error(
    "window.__SUPABASE__ is undefined — the Worker must inject Supabase config into index.html",
  );
}

export const supabase = createClient(config.url, config.key, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
  },
});
