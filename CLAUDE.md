# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Getting Started

Before any task, read `SYSTEM_CONTEXT.md` — it is the auto-generated architecture snapshot for this repo. After changes to routes, shared schemas, store shape, API handlers, build scripts, dependencies, or user-facing flows, update `docs/context-notes.md` if needed and run `pnpm context:update`.

## Commands

```bash
# Development
pnpm dev              # Full-stack dev server (Express + Vite, port 5000)
pnpm dev:client       # Client-only Vite dev server

# Type checking
pnpm check            # TypeScript type check (no emit)

# Build & production
pnpm build            # Compile client (Vite → dist/public/) + server (esbuild → dist/index.cjs)
pnpm start            # Run production server from dist/index.cjs

# Context management
pnpm context:update   # Regenerate SYSTEM_CONTEXT.md from source
pnpm context:watch    # Watch mode for context regeneration
```

There are no automated tests in this repository.

## Architecture

**Full-stack TypeScript monorepo**: React 19 + Vite 7 client, Express backend, Supabase auth + Postgres storage, Zustand local-first state.

### Data flow

State lives in Zustand with per-user `localStorage` keys as the source of truth. Cloud sync is **best-effort only** and covers `profile`, `history`, and `currentPlan`. The client syncs to `/api/user-data` (Express or Vercel handler) using a 1-second debounce.

The shared data contract is in `shared/userData.ts` (Zod schemas, `schemaVersion: 2`). Both `server/routes.ts` and `api/user-data.ts` implement the same persistence contract — keep them in sync.

### Auth & routing

Supabase email/password auth. Unauthenticated users → `/login`. Authenticated users without completed onboarding → `/onboarding`. `/login`, `/register`, `/forgot-password` are guest-only.

### Workout model

The app runs a **fixed upper/lower 4-day split** defined in `client/src/lib/upperLowerPlan.ts`. `buildPlan()` always returns the same template regardless of profile goals or equipment (known gap). The Today screen maps Mon–Fri to plan days 1–5 via `client/src/lib/workout.ts`. History is pruned to the last 30 days on both client and server.

Key invariants:
- `currentPlan` = active weekly template; `history` = completed workout day copies
- Exercise swaps preserve the original in `exercise.primary` and set `swapReason`
- Rest day is a recovery/cardio entry in the plan, not a null slot

### Supabase configuration

**Client** (Vite env vars): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

**Server**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

Missing credentials don't block startup — the server runs in local-only mode and `/api/user-data` returns `503`.

Required Supabase table:
```sql
create table user_data (
  user_id uuid references auth.users primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table user_data enable row level security;
create policy "Users can manage own data" on user_data
  for all using (auth.uid() = user_id);
```

### Path aliases

`@/*` → `client/src/*`, `@shared/*` → `shared/*`
