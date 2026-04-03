import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const key = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

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
    "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing from build env vars."
  );
}
