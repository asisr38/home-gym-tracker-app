import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

console.log("[IronStride:supabase] init", {
  hasUrl: Boolean(url),
  urlPrefix: url ? url.slice(0, 32) : "MISSING",
  hasKey: Boolean(key),
  keyPrefix: key ? key.slice(0, 20) : "MISSING",
});

export const supabase = url && key ? createClient(url, key) : null;

if (!supabase) {
  console.error(
    "[IronStride:supabase] client is NULL — " +
    "VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY " +
    "was not set at build time. Add them to Vercel env vars and redeploy."
  );
}
