-- =============================================================================
-- IronStride — Supabase Schema
-- Run this in Supabase → SQL Editor
-- =============================================================================

-- ── user_data (existing) ─────────────────────────────────────────────────────
create table if not exists user_data (
  user_id uuid references auth.users primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table user_data enable row level security;
create policy "Users can manage own data" on user_data
  for all using (auth.uid() = user_id);

-- ── workout_sessions ─────────────────────────────────────────────────────────
-- One row per completed workout. Never pruned — full unlimited history.
create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  day_id text not null,
  title text not null,
  day_type text,                       -- push | pull | legs | cardio | full
  workout_type text,                   -- lift | run | recovery
  completed_at timestamptz not null,
  notes text,
  total_volume numeric default 0,      -- sum(weight × reps) for the session
  total_sets int default 0,
  completed_sets int default 0,
  run_distance numeric,
  run_time_seconds int,
  created_at timestamptz default now()
);

alter table workout_sessions enable row level security;
create policy "Users own sessions" on workout_sessions
  for all using (auth.uid() = user_id);

create index idx_workout_sessions_user_date
  on workout_sessions (user_id, completed_at desc);

-- ── exercise_logs ────────────────────────────────────────────────────────────
-- One row per exercise per session. Powers strength PRs & volume trends.
create table exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  session_id uuid references workout_sessions on delete cascade,
  exercise_name text not null,
  muscle_group text,
  sets_completed int default 0,
  sets_total int default 0,
  max_weight numeric,                  -- heaviest set weight
  total_volume numeric default 0,      -- sum(weight × reps) for this exercise
  logged_at timestamptz not null,
  created_at timestamptz default now()
);

alter table exercise_logs enable row level security;
create policy "Users own exercise logs" on exercise_logs
  for all using (auth.uid() = user_id);

create index idx_exercise_logs_user_exercise
  on exercise_logs (user_id, exercise_name, logged_at desc);
create index idx_exercise_logs_session
  on exercise_logs (session_id);

-- ── body_metrics ─────────────────────────────────────────────────────────────
-- Daily body weight + optional measurements. One row per user per day.
create table body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  measured_at date not null,
  weight numeric not null,
  weight_unit text not null default 'lbs',
  body_fat_percent numeric,
  notes text,
  created_at timestamptz default now(),
  unique (user_id, measured_at)
);

alter table body_metrics enable row level security;
create policy "Users own body metrics" on body_metrics
  for all using (auth.uid() = user_id);

create index idx_body_metrics_user_date
  on body_metrics (user_id, measured_at desc);
