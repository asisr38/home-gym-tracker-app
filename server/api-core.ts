import { z } from "zod";
import { userDataSchema } from "@shared/userData";
import { getSupabaseAdmin, supabaseDisabledMessage } from "./supabase";

const MAX_HISTORY_DAYS = 30;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const exerciseLogSchema = z.object({
  exerciseName: z.string(),
  muscleGroup: z.string().optional(),
  setsCompleted: z.number(),
  setsTotal: z.number(),
  maxWeight: z.number().nullable(),
  totalVolume: z.number(),
});

export const workoutSessionSchema = z.object({
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

export const bodyMetricSchema = z.object({
  measuredAt: z.string(),
  weight: z.number(),
  weightUnit: z.string().default("lbs"),
  bodyFatPercent: z.number().nullable().optional(),
  notes: z.string().optional(),
});

export type ApiResult =
  | { status: number; body: unknown }
  | { status: number; empty: true };

type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; result: ApiResult };

const jsonResult = (status: number, body: unknown): ApiResult => ({ status, body });
const emptyResult = (status: number): ApiResult => ({ status, empty: true });

const pruneHistory = (history: Array<{ dateCompleted?: string }>) => {
  const cutoff = Date.now() - MAX_HISTORY_DAYS * MS_IN_DAY;
  return history.filter((day) => {
    if (!day.dateCompleted) return true;
    const timestamp = Date.parse(day.dateCompleted);
    if (Number.isNaN(timestamp)) return true;
    return timestamp >= cutoff;
  });
};

const getAuthorizedSupabase = () => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      ok: false as const,
      result: jsonResult(503, { message: supabaseDisabledMessage }),
    };
  }

  return { ok: true as const, supabase };
};

export async function requireUserFromAuthorizationHeader(
  authHeader: string | null | undefined,
): Promise<AuthResult> {
  const supabaseResult = getAuthorizedSupabase();
  if (!supabaseResult.ok) return supabaseResult;

  const match = (authHeader ?? "").match(/^Bearer (.+)$/);
  if (!match) {
    return {
      ok: false,
      result: jsonResult(401, { message: "Missing auth token." }),
    };
  }

  try {
    const {
      data: { user },
      error,
    } = await supabaseResult.supabase.auth.getUser(match[1]);

    if (error || !user) {
      return {
        ok: false,
        result: jsonResult(401, { message: "Invalid auth token." }),
      };
    }

    return { ok: true, userId: user.id };
  } catch {
    return {
      ok: false,
      result: jsonResult(401, { message: "Invalid auth token." }),
    };
  }
}

export async function getUserDataResult(userId: string): Promise<ApiResult> {
  const supabaseResult = getAuthorizedSupabase();
  if (!supabaseResult.ok) return supabaseResult.result;

  const { data, error } = await supabaseResult.supabase
    .from("user_data")
    .select("data")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    return jsonResult(500, { message: "Failed to load user data." });
  }

  if (!data) return emptyResult(204);
  return jsonResult(200, data.data);
}

export async function saveUserDataResult(payload: unknown, userId: string): Promise<ApiResult> {
  const supabaseResult = getAuthorizedSupabase();
  if (!supabaseResult.ok) return supabaseResult.result;

  const parseResult = userDataSchema.safeParse(payload);
  if (!parseResult.success) {
    return jsonResult(400, { message: "Invalid data payload." });
  }

  const prunedData = {
    ...parseResult.data,
    history: pruneHistory(parseResult.data.history),
  };

  const { error } = await supabaseResult.supabase.from("user_data").upsert(
    {
      user_id: userId,
      data: prunedData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return jsonResult(500, { message: "Failed to save user data." });
  }

  return jsonResult(200, { ok: true });
}

export async function saveWorkoutSessionResult(
  payload: unknown,
  userId: string,
): Promise<ApiResult> {
  const supabaseResult = getAuthorizedSupabase();
  if (!supabaseResult.ok) return supabaseResult.result;

  const parsed = workoutSessionSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonResult(400, { message: "Invalid workout payload." });
  }

  const { exercises, ...session } = parsed.data;

  const { data: sessionRow, error: sessionErr } = await supabaseResult.supabase
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
    return jsonResult(500, { message: "Failed to save workout session." });
  }

  if (exercises.length > 0) {
    const exerciseRows = exercises.map((exercise) => ({
      user_id: userId,
      session_id: sessionRow.id,
      exercise_name: exercise.exerciseName,
      muscle_group: exercise.muscleGroup ?? null,
      sets_completed: exercise.setsCompleted,
      sets_total: exercise.setsTotal,
      max_weight: exercise.maxWeight,
      total_volume: exercise.totalVolume,
      logged_at: session.completedAt,
    }));

    const { error: exerciseError } = await supabaseResult.supabase
      .from("exercise_logs")
      .insert(exerciseRows);

    if (exerciseError) {
      return jsonResult(500, { message: "Failed to save exercise logs." });
    }
  }

  return jsonResult(200, { ok: true, sessionId: sessionRow.id });
}

export async function getWorkoutHistoryResult(
  userId: string,
  input: { limit?: string | null; offset?: string | null },
): Promise<ApiResult> {
  const supabaseResult = getAuthorizedSupabase();
  if (!supabaseResult.ok) return supabaseResult.result;

  const limit = Math.min(Number(input.limit) || 50, 100);
  const offset = Number(input.offset) || 0;

  const { data, error } = await supabaseResult.supabase
    .from("workout_sessions")
    .select(`
      id, day_id, title, day_type, workout_type, completed_at, notes,
      total_volume, total_sets, completed_sets, run_distance, run_time_seconds,
      exercise_logs ( exercise_name, muscle_group, sets_completed, max_weight, total_volume )
    `)
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return jsonResult(500, { message: "Failed to fetch history." });
  }

  return jsonResult(200, data ?? []);
}

export async function getWorkoutStatsResult(
  userId: string,
  input: { days?: string | null },
): Promise<ApiResult> {
  const supabaseResult = getAuthorizedSupabase();
  if (!supabaseResult.ok) return supabaseResult.result;

  const days = Math.min(Number(input.days) || 90, 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [sessionsResult, exerciseResult] = await Promise.all([
    supabaseResult.supabase
      .from("workout_sessions")
      .select("completed_at, total_volume, completed_sets, run_distance")
      .eq("user_id", userId)
      .gte("completed_at", since)
      .order("completed_at", { ascending: true }),
    supabaseResult.supabase
      .from("exercise_logs")
      .select("exercise_name, muscle_group, max_weight, total_volume, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", since)
      .order("max_weight", { ascending: false }),
  ]);

  if (sessionsResult.error || exerciseResult.error) {
    return jsonResult(500, { message: "Failed to fetch stats." });
  }

  const bestWeights: Record<string, { maxWeight: number; muscleGroup: string | null }> = {};

  for (const row of exerciseResult.data ?? []) {
    const previous = bestWeights[row.exercise_name];
    if (!previous || (row.max_weight ?? 0) > previous.maxWeight) {
      bestWeights[row.exercise_name] = {
        maxWeight: row.max_weight ?? 0,
        muscleGroup: row.muscle_group,
      };
    }
  }

  return jsonResult(200, {
    sessions: sessionsResult.data ?? [],
    bestWeights,
    totalSessions: (sessionsResult.data ?? []).length,
    totalVolume: (sessionsResult.data ?? []).reduce(
      (sum, row) => sum + (row.total_volume ?? 0),
      0,
    ),
  });
}

export async function saveBodyMetricResult(payload: unknown, userId: string): Promise<ApiResult> {
  const supabaseResult = getAuthorizedSupabase();
  if (!supabaseResult.ok) return supabaseResult.result;

  const parsed = bodyMetricSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonResult(400, { message: "Invalid body metric payload." });
  }

  const { error } = await supabaseResult.supabase.from("body_metrics").upsert(
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

  if (error) {
    return jsonResult(500, { message: "Failed to save body metric." });
  }

  return jsonResult(200, { ok: true });
}

export async function getBodyMetricsResult(
  userId: string,
  input: { days?: string | null },
): Promise<ApiResult> {
  const supabaseResult = getAuthorizedSupabase();
  if (!supabaseResult.ok) return supabaseResult.result;

  const days = Math.min(Number(input.days) || 90, 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data, error } = await supabaseResult.supabase
    .from("body_metrics")
    .select("measured_at, weight, weight_unit, body_fat_percent, notes")
    .eq("user_id", userId)
    .gte("measured_at", since)
    .order("measured_at", { ascending: true });

  if (error) {
    return jsonResult(500, { message: "Failed to fetch body metrics." });
  }

  return jsonResult(200, data ?? []);
}

export async function readJsonRequestBody(
  request: Request,
  invalidMessage = "Invalid JSON payload.",
): Promise<{ ok: true; data: unknown } | { ok: false; result: ApiResult }> {
  try {
    const data = await request.json();
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      result: jsonResult(400, { message: invalidMessage }),
    };
  }
}

export function toWebResponse(result: ApiResult) {
  if ("empty" in result) {
    return new Response(null, { status: result.status });
  }

  return Response.json(result.body, { status: result.status });
}
