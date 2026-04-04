---
name: Mobile-First PWA Setup
description: App is a mobile-first PWA; manifest, SW, icons, and viewport meta are in place
type: project
---

This app (IronStride) is a mobile-first Progressive Web App. The full PWA stack was added.

**Why:** User requirement — all UI/UX decisions must start from mobile; app should be installable and work offline.

**How to apply:** When building any new page or component, design for ~390px first. Do not add hover-only affordances, use `inputMode` on numeric/email inputs, and ensure touch targets are ≥ 44px.

## Files added/modified for PWA
- `app/manifest.ts` — Next.js native manifest (auto-generates `/manifest.webmanifest`)
- `app/layout.tsx` — exports `viewport` (device-width, max-scale=1, viewport-fit=cover, theme-color) and `metadata` (manifest link, appleWebApp, formatDetection)
- `public/sw.js` — service worker: cache-first for `/_next/static/`, network-first for `/api/`, stale-while-revalidate for HTML pages
- `public/icons/icon.svg` — SVG dumbbell icon (dark bg, blue dumbbell)
- `client/src/components/app/AppProviders.tsx` — `ServiceWorkerRegistration` component registers `/sw.js` on mount

## Mobile rules added to CLAUDE.md
- Touch targets ≥ 44px
- No hover-only affordances
- Use `inputMode` on all inputs (`email`, `decimal`, `numeric`)
- Keep `safe-pt`/`safe-pb`/`safe-px` on full-screen containers
- Use `no-scrollbar` on scroll containers
