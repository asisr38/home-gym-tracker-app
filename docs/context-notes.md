# Product Reality

- Mobile-first workout tracker for home and Planet Fitness style training.
- The current app behavior is centered on a fixed 5-day upper/lower split generated from `client/src/lib/upperLowerPlan.ts`, not a free-form workout planner.
- Core user journey: open Today view, start the scheduled session, quick-log sets, complete the session, review weekly volume and history snapshots.
- Auth entry screens now include expectation-setting copy, inline password guidance, and password visibility toggles so the register/login/reset flows feel lower-friction on mobile.
- Users can change their split after onboarding from Profile; applying a new split regenerates `currentPlan` from current goal/equipment settings while leaving `history` intact.
- The day session flow now supports in-place exercise swaps through a searchable alternative picker, so users can keep the same slot and logged progress when equipment is unavailable or a movement feels wrong.
- Session quick log now seeds both weight and reps from the best recent completed set for that exercise when available, so users can nudge prior performance upward instead of re-entering baseline numbers every set.
- Session quick log exposes the same tap-first controls for reps as weight, with decrement/increment buttons, preset chips, and the primary log CTA placed underneath both controls for faster one-handed logging.

# Architecture Notes

- Client stack: React 19, Vite 7, TypeScript, Wouter, Zustand, React Query, Tailwind 4, Radix UI.
- The Next.js migration is still additive: the existing Vite SPA and Express server remain available, while the parallel App Router shell lives under `app/`.
- State is local-first in Zustand with per-user localStorage keys. Cloud sync is best-effort and only covers `profile`, `history`, and `currentPlan`.
- Auth uses Supabase email/password sign-in. Unauthenticated users are redirected to `/login`, and signed-in users must complete `/onboarding` before the main app routes unlock.
- Cloud sync uses a single API backend at `/api/user-data` with a 1-second debounce. Supabase access token is sent as a Bearer token.
- `/login`, `/register`, and `/forgot-password` are guest-only routes.
- Supabase client config now accepts either Vite envs (`VITE_SUPABASE_URL` plus `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` or `VITE_SUPABASE_ANON_KEY`) or Next public envs (`NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Server-side requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- In the shared browser Supabase client, Next public vars must be read through direct `process.env.NEXT_PUBLIC_*` references. Aliasing `process.env` prevents Next from inlining those values into the client bundle and makes auth initialize as unavailable.
- Local development reads both client and server credentials from the repo-root `.env`: Vite uses the repo root as `envDir`, and the Node server eagerly loads the same file before resolving Supabase config.
- Missing Supabase credentials do not block app startup; the server stays up in local-only mode and `/api/user-data` returns `503` until credentials are configured.
- In local development, when `PORT` is unset and the default `5000` is busy, the Express/Vite server auto-increments to the next free port instead of crashing. Explicit `PORT` values still fail fast.
- There are two server surfaces for the same persistence contract: Express routes in `server/routes.ts` and a Vercel handler in `api/user-data.ts`.
- The Next shell now has native App Router handlers for `/api/user-data`, `/api/workouts`, `/api/workouts/history`, `/api/workouts/stats`, and `/api/body-metrics`. These handlers share the same server-side auth and persistence logic as the legacy Express routes through `server/api-core.ts`.
- `next:dev` now runs Next directly; it no longer boots the Express API as a proxy dependency.
- The PWA service worker is production-only. In local Next development the app unregisters any existing worker and clears `ironstride-*` caches so stale cached HTML or `/_next` chunks do not mask current route changes.
- Route gating only blocks on cloud user-data sync when an authenticated session has no usable local snapshot yet. Public guest routes render immediately, and authenticated sync falls back after a short timeout so local-first state is not hidden behind an indefinite loading screen.
- Vercel deployments must use the Next.js framework preset and default output handling. `vercel.json` pins `framework: "nextjs"` so stale Vite-era `dist` expectations in project settings do not break deploys.
- The default lifecycle scripts now target Next (`dev`, `build`, `start`). The old Vite/Express flow is still available as `legacy:dev`, `legacy:build`, and `legacy:start` during migration cleanup.
- Shared source of truth for persisted data lives in `shared/userData.ts`. Store exports `schemaVersion: 2` through `getUserData()`.
- Completed workout history is intentionally pruned to the latest 30 days on both client and server.
- User data is stored in Supabase Postgres as a `jsonb` blob in the `user_data` table, keyed by `user_id`. Row Level Security enforces `auth.uid() = user_id`.

# Behavioral Invariants

- `currentPlan` is the active weekly template. `history` stores completed copies of workout days.
- The Today screen maps weekdays Monday-Friday to plan days 1-5 through `client/src/lib/workout.ts`.
- Today treats partially logged sessions as "in progress" and changes the primary CTA from start to continue when notes, run data, or completed sets already exist on the scheduled day.
- Rest day is currently represented as a recovery/cardio entry inside the plan rather than a null schedule slot.
- Session re-entry jumps to the first incomplete exercise, shows a live session clock, and asks for confirmation before finishing a lift day with sets still unlogged.
- Exercise swaps preserve the original movement in `exercise.primary` and annotate the reason in `swapReason`.

# Known Gaps

- Plan generation ignores profile goal and equipment today. The UI says the schedule is tailored, but `buildPlan()` always returns the same upper/lower template.
- Supabase email/password auth must be enabled in the Supabase dashboard for the login/register flow to work.
- This sandbox cannot safely mutate pnpm dependencies because of a store-path mismatch. If `build` or `dev` fails on missing packages after a package.json change, run `pnpm install` locally to refresh `node_modules`.

# Maintenance Rule

- When behavior changes in ways that static extraction cannot infer, update this file before running `pnpm context:update`.
