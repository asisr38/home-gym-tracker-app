import type { Express } from "express";
import { type Server } from "http";
import { requireUser, type AuthedRequest } from "./auth";
import { supabaseDisabledMessage, getSupabaseAdmin } from "./supabase";
import { userDataSchema } from "@shared/userData";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/user-data", requireUser, async (req, res) => {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({ message: supabaseDisabledMessage });
    }

    const { userId } = req as AuthedRequest;
    const { data, error } = await supabase
      .from("user_data")
      .select("data")
      .eq("user_id", userId)
      .single();

    // PGRST116 = no rows found
    if (error && error.code !== "PGRST116") {
      return res.status(500).json({ message: "Failed to load user data." });
    }

    if (!data) return res.status(204).send();
    return res.json(data.data);
  });

  app.post("/api/user-data", requireUser, async (req, res) => {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({ message: supabaseDisabledMessage });
    }

    const { userId } = req as AuthedRequest;
    const parseResult = userDataSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid data payload." });
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
      return res.status(500).json({ message: "Failed to save user data." });
    }

    return res.json({ ok: true });
  });

  return httpServer;
}
