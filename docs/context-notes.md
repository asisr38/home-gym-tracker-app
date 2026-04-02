# Product Reality

- Mobile-first workout tracker for home and Planet Fitness style training.
- The current app behavior is centered on a fixed 5-day upper/lower split generated from `client/src/lib/upperLowerPlan.ts`, not a free-form workout planner.
- Core user journey: open Today view, start the scheduled session, quick-log sets, complete the session, review weekly volume and history snapshots.

# Architecture Notes

- Client stack: React 19, Vite 7, TypeScript, Wouter, Zustand, React Query, Tailwind 4, Radix UI.
- State is local-first in Zustand with per-user localStorage keys. Cloud sync is best-effort and only covers `profile`, `history`, and `currentPlan`.
- Auth uses Supabase email/password sign-in. Unauthenticated users are redirected to `/login`, and signed-in users must complete `/onboarding` before the main app routes unlock.
- Cloud sync uses a single API backend at `/api/user-data` with a 1-second debounce. Supabase access token is sent as a Bearer token.
- `/login`, `/register`, and `/forgot-password` are guest-only routes.
- Supabase client config requires `VITE_SUPABASE_URL` and either `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` or legacy `VITE_SUPABASE_ANON_KEY`. Server-side requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Local development reads both client and server credentials from the repo-root `.env`: Vite uses the repo root as `envDir`, and the Node server eagerly loads the same file before resolving Supabase config.
- Missing Supabase credentials do not block app startup; the server stays up in local-only mode and `/api/user-data` returns `503` until credentials are configured.
- In local development, when `PORT` is unset and the default `5000` is busy, the Express/Vite server auto-increments to the next free port instead of crashing. Explicit `PORT` values still fail fast.
- There are two server surfaces for the same persistence contract: Express routes in `server/routes.ts` and a Vercel handler in `api/user-data.ts`.
- Shared source of truth for persisted data lives in `shared/userData.ts`. Store exports `schemaVersion: 2` through `getUserData()`.
- Completed workout history is intentionally pruned to the latest 30 days on both client and server.
- User data is stored in Supabase Postgres as a `jsonb` blob in the `user_data` table, keyed by `user_id`. Row Level Security enforces `auth.uid() = user_id`.

# Behavioral Invariants

- `currentPlan` is the active weekly template. `history` stores completed copies of workout days.
- The Today screen maps weekdays Monday-Friday to plan days 1-5 through `client/src/lib/workout.ts`.
- Rest day is currently represented as a recovery/cardio entry inside the plan rather than a null schedule slot.
- Exercise swaps preserve the original movement in `exercise.primary` and annotate the reason in `swapReason`.

# Known Gaps

- Plan generation ignores profile goal and equipment today. The UI says the schedule is tailored, but `buildPlan()` always returns the same upper/lower template.
- Supabase email/password auth must be enabled in the Supabase dashboard for the login/register flow to work.

# Maintenance Rule

- When behavior changes in ways that static extraction cannot infer, update this file before running `pnpm context:update`.
