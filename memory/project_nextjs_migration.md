---
name: Next.js Migration Completed
description: Project fully migrated from Express+Vite to Next.js 15 App Router; all legacy code removed
type: project
---

Migration to Next.js 15 (App Router) is complete and cleaned up.

**Stack:** React 19 + Next.js 15, Supabase auth + Postgres, Zustand, Tailwind v4

**Architecture:**
- `app/` — Next.js App Router pages grouped by access level: `(public)`, `(protected)`, `(onboarding)`
- `app/api/*/route.ts` — Next.js API routes
- `client/src/pages/` — page components (imported by app/ pages)
- `client/src/components/`, `client/src/lib/`, `client/src/hooks/` — shared client code
- `server/api-core.ts`, `server/supabase.ts`, `server/env.ts` — server-side logic shared by all API routes
- `shared/userData.ts` — Zod schemas for persisted data

**Removed in cleanup:** Express server, Vite config, Wouter router, Vercel serverless functions (`api/`), legacy build scripts, `types/next-shim.d.ts`

**Env vars:** Client uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`; server uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

**Why:** Full Next.js migration for deployment on Vercel with App Router.
**How to apply:** Do not add Express, Vite, or Wouter back. All routing is Next.js App Router. API routes go in `app/api/`.
