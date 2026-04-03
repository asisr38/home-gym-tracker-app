import type { Express } from "express";
import { type Server } from "http";
import { requireUser, type AuthedRequest } from "./auth";
import { supabaseDisabledMessage, getSupabaseAdmin } from "./supabase";
import { userDataSchema } from "@shared/userData";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Workout tracking schemas
// ---------------------------------------------------------------------------

const exerciseLogSchema = z.object({
  exerciseName: z.string(),
  muscleGroup: z.string().optional(),
  setsCompleted: z.number(),
  setsTotal: z.number(),
  maxWeight: z.number().nullable(),
  totalVolume: z.number(),
});

const workoutSessionSchema = z.object({
  dayId: z.string(),
  title: z.string(),
  dayType: z.string().optional(),
  workoutType: z.string().optional(),
  completedAt: z.string(),
  notes: z.string().optional(),
  totalVolume: z.number(),
  totalSets: z.number(),
  completedSets: z.number(),
  runDistance: z.number().nullable().optional(),
  runTimeSeconds: z.number().nullable().optional(),
  exercises: z.array(exerciseLogSchema),
});

const bodyMetricSchema = z.object({
  measuredAt: z.string(),
  weight: z.number(),
  weightUnit: z.string().default("lbs"),
  bodyFatPercent: z.number().nullable().optional(),
  notes: z.string().optional(),
});

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

  // ── POST /api/workouts — persist completed workout session ──────────────
  app.post("/api/workouts", requireUser, async (req, res) => {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(503).json({ message: supabaseDisabledMessage });

    const { userId } = req as AuthedRequest;
    const parsed = workoutSessionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid workout payload." });

    const { exercises, ...session } = parsed.data;

    const { data: sessionRow, error: sessionErr } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: userId,
        day_id: session.dayId,
        title: session.title,
        day_type: session.dayType,
        workout_type: session.workoutType,
        completed_at: session.completedAt,
        notes: session.notes,
        total_volume: session.totalVolume,
        total_sets: session.totalSets,
        completed_sets: session.completedSets,
        run_distance: session.runDistance ?? null,
        run_time_seconds: session.runTimeSeconds ?? null,
      })
      .select("id")
      .single();

    if (sessionErr || !sessionRow) {
      return res.status(500).json({ message: "Failed to save workout session." });
    }

    if (exercises.length > 0) {
      const exerciseRows = exercises.map((ex) => ({
        user_id: userId,
        session_id: sessionRow.id,
        exercise_name: ex.exerciseName,
        muscle_group: ex.muscleGroup ?? null,
        sets_completed: ex.setsCompleted,
        sets_total: ex.setsTotal,
        max_weight: ex.maxWeight,
        total_volume: ex.totalVolume,
        logged_at: session.completedAt,
      }));
      const { error: exErr } = await supabase.from("exercise_logs").insert(exerciseRows);
      if (exErr) {
        return res.status(500).json({ message: "Failed to save exercise logs." });
      }
    }

    return res.json({ ok: true, sessionId: sessionRow.id });
  });

  // ── GET /api/workouts/history — paginated workout history ────────────────
  app.get("/api/workouts/history", requireUser, async (req, res) => {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(503).json({ message: supabaseDisabledMessage });

    const { userId } = req as AuthedRequest;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;

    const { data, error } = await supabase
      .from("workout_sessions")
      .select(`
        id, day_id, title, day_type, workout_type, completed_at, notes,
        total_volume, total_sets, completed_sets, run_distance, run_time_seconds,
        exercise_logs ( exercise_name, muscle_group, sets_completed, max_weight, total_volume )
      `)
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ message: "Failed to fetch history." });
    return res.json(data ?? []);
  });

  // ── GET /api/workouts/stats — aggregate progress stats ──────────────────
  app.get("/api/workouts/stats", requireUser, async (req, res) => {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(503).json({ message: supabaseDisabledMessage });

    const { userId } = req as AuthedRequest;
    const days = Math.min(Number(req.query.days) || 90, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [sessionsResult, exerciseResult] = await Promise.all([
      supabase
        .from("workout_sessions")
        .select("completed_at, total_volume, completed_sets, run_distance")
        .eq("user_id", userId)
        .gte("completed_at", since)
        .order("completed_at", { ascending: true }),
      supabase
        .from("exercise_logs")
        .select("exercise_name, muscle_group, max_weight, total_volume, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", since)
        .order("max_weight", { ascending: false }),
    ]);

    if (sessionsResult.error || exerciseResult.error) {
      return res.status(500).json({ message: "Failed to fetch stats." });
    }

    // Best weight per exercise (all-time within window)
    const bestWeights: Record<string, { maxWeight: number; muscleGroup: string | null }> = {};
    for (const row of exerciseResult.data ?? []) {
      const prev = bestWeights[row.exercise_name];
      if (!prev || (row.max_weight ?? 0) > prev.maxWeight) {
        bestWeights[row.exercise_name] = {
          maxWeight: row.max_weight ?? 0,
          muscleGroup: row.muscle_group,
        };
      }
    }

    return res.json({
      sessions: sessionsResult.data ?? [],
      bestWeights,
      totalSessions: (sessionsResult.data ?? []).length,
      totalVolume: (sessionsResult.data ?? []).reduce((s, r) => s + (r.total_volume ?? 0), 0),
    });
  });

  // ── POST /api/body-metrics — log body weight ─────────────────────────────
  app.post("/api/body-metrics", requireUser, async (req, res) => {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(503).json({ message: supabaseDisabledMessage });

    const { userId } = req as AuthedRequest;
    const parsed = bodyMetricSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid body metric payload." });

    const { error } = await supabase.from("body_metrics").upsert(
      {
        user_id: userId,
        measured_at: parsed.data.measuredAt,
        weight: parsed.data.weight,
        weight_unit: parsed.data.weightUnit,
        body_fat_percent: parsed.data.bodyFatPercent ?? null,
        notes: parsed.data.notes ?? null,
      },
      { onConflict: "user_id,measured_at" },
    );

    if (error) return res.status(500).json({ message: "Failed to save body metric." });
    return res.json({ ok: true });
  });

  // ── GET /api/body-metrics — fetch weight history ─────────────────────────
  app.get("/api/body-metrics", requireUser, async (req, res) => {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(503).json({ message: supabaseDisabledMessage });

    const { userId } = req as AuthedRequest;
    const days = Math.min(Number(req.query.days) || 90, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("body_metrics")
      .select("measured_at, weight, weight_unit, body_fat_percent, notes")
      .eq("user_id", userId)
      .gte("measured_at", since)
      .order("measured_at", { ascending: true });

    if (error) return res.status(500).json({ message: "Failed to fetch body metrics." });
    return res.json(data ?? []);
  });

  return httpServer;
}
