import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ensureLocalEnvLoaded } from "./env";

ensureLocalEnvLoaded();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

export const supabaseDisabledMessage =
  "Supabase credentials are not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Cloud sync is unavailable.";

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!_client) {
    _client = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}
