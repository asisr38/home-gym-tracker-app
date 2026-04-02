import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { ensureLocalEnvLoaded } from "../server/env";
import { userDataSchema } from "../shared/userData";

ensureLocalEnvLoaded();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);
const supabaseDisabledMessage =
  "Supabase credentials are not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Cloud sync is unavailable.";

const MAX_HISTORY_DAYS = 30;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const pruneHistory = (history: Array<{ dateCompleted?: string }>) => {
  const cutoff = Date.now() - MAX_HISTORY_DAYS * MS_IN_DAY;
  return history.filter((day) => {
    if (!day.dateCompleted) return true;
    const timestamp = Date.parse(day.dateCompleted);
    if (Number.isNaN(timestamp)) return true;
    return timestamp >= cutoff;
  });
};

async function getUserId(req: VercelRequest, res: VercelResponse) {
  if (!supabaseConfigured) {
    res.status(503).json({ message: supabaseDisabledMessage });
    return null;
  }

  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).json({ message: "Missing auth token." });
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error } = await supabase.auth.getUser(match[1]);
    if (error || !user) {
      res.status(401).json({ message: "Invalid auth token." });
      return null;
    }
    return user.id;
  } catch {
    res.status(401).json({ message: "Invalid auth token." });
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req, res);
  if (!userId) return;

  const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("user_data")
      .select("data")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      res.status(500).json({ message: "Failed to load user data." });
      return;
    }

    if (!data) {
      res.status(204).send("");
      return;
    }

    res.status(200).json(data.data);
    return;
  }

  if (req.method === "POST") {
    let payload: unknown = req.body;
    if (typeof req.body === "string") {
      try {
        payload = JSON.parse(req.body);
      } catch {
        res.status(400).json({ message: "Invalid JSON payload." });
        return;
      }
    }

    const parseResult = userDataSchema.safeParse(payload);
    if (!parseResult.success) {
      res.status(400).json({ message: "Invalid data payload." });
      return;
    }

    const prunedData = {
      ...parseResult.data,
      history: pruneHistory(parseResult.data.history),
    };

    const { error } = await supabase.from("user_data").upsert(
      {
        user_id: userId,
        data: prunedData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      res.status(500).json({ message: "Failed to save user data." });
      return;
    }

    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ message: "Method not allowed." });
}
