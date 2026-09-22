# Feature: PWA voice input + push notifications

## Objective

Close two onboarding-promise gaps found in the 2026-09-20 audit:
1. Voice expense entry is fake (`STUB_TRANSCRIPTS` random pick) — make it real.
2. No notification infrastructure exists at all — add Web Push for two triggers: weekly budget threshold crossed, goal target reached.

## Problem / why

Onboarding copy promises "Registra con la voz" and implies the app will nudge the user — neither is true today. User confirmed (2026-09-21) this repo stays PWA-only for this slice; a native wrapper (Capacitor) is a deliberate later phase for the home-screen widget and more reliable voice/push (user stated interest in eventually going native — noted for that future phase, not this one).

## Scope

**In:**
- Real speech-to-text in `AddExpenseContainer.tsx` via the browser's native `SpeechRecognition`/`webkitSpeechRecognition` (no new dependency — native platform feature covers it).
- Un-hardcode the voice mode so the mic path is actually reachable (currently forced to `mode='manual'`).
- Web Push infra: `push_subscriptions` table, VAPID keys, subscribe/unsubscribe route, service worker push handling.
- Two triggers: weekly budget threshold crossed (on expense create), goal target reached (on goal add-money).
- Settings toggle to enable/disable notifications.

**Out (explicitly deferred):**
- Native home-screen widget — needs Capacitor, separate phase.
- "Partner activity" notification trigger — no partner/household concept exists in the schema at all (confirmed via grep, zero matches). User chose (2026-09-21) to ship budget+goal triggers now and treat the partner data model as its own future decision, not smuggled into this slice.
- Changing `inputPreference` UX beyond making voice reachable (no new settings flow for it).

## Constraints

- No new client deps: `SpeechRecognition`, `Notification`, `PushManager` are native browser APIs.
- One new server dep: `web-push` (VAPID signing + send).
- TDD: strict only for `packages/shared` (per `sdd-init` testing-capabilities record); `apps/api` not strict but every route has a sibling `.test.ts` — keep that convention. `apps/web` has no test script — no automated tests there, verify manually in-browser.
- Test runner: root `pnpm test` → `pnpm -r test`; per-workspace `vitest run`.
- `vite-plugin-pwa` must switch from `generateSW` to `injectManifest` (confirmed: current config has no custom SW source, so there's nowhere to add `push`/`notificationclick` listeners today).
- Subscription endpoints must be scoped to the authenticated user only (trust boundary).

## Tasks

- [x] T1 — `push_subscriptions` table in `packages/shared/src/db/schema/finance.ts` (userId FK cascade, endpoint/p256dh/auth text cols, timestamps), added to `userRelations`; run `pnpm db:generate` + `pnpm db:migrate`. Route: direct inline (schema file already read in full, mechanical addition following existing conventions).
- [ ] T2 — Backend push infra: `web-push` dep, VAPID env vars (`apps/api/src/env.ts` + `infra/env.example.md`), Zod subscribe-payload schema in `packages/shared/src/schemas`, `apps/api/src/routes/push.ts` (POST /subscribe, DELETE /unsubscribe, following existing route shape: session middleware + zValidator + direct db calls), `apps/api/src/services/push-sender.ts` wrapping `web-push.sendNotification`, mount in `apps/api/src/index.ts`. Tests: route `.test.ts` per convention. Route: delegated writer (5+ files, new logic).
- [ ] T3 — Trigger wiring: weekly-budget threshold check after `expenses.ts` POST transaction, goal-reached check after `goals.ts` POST /:id/add update; both call `push-sender`, both notify only the acting user (no partner concept). Tests for the two threshold-detection functions. Route: delegated writer (2-3 files, new business logic).
- [ ] T4 — Frontend push subscribe flow: `vite.config.ts` → `injectManifest` strategy + custom `src/sw.ts` (precache + `push`/`notificationclick` listeners), client hook to request `Notification` permission + `pushManager.subscribe` + POST to backend, new Settings `Section`/`Toggle` (slots between "Privacidad" and the logout divider per existing `settings.tsx` structure), `VITE_VAPID_PUBLIC_KEY` env var. Route: delegated writer (4-5 files, new SW paradigm). Manual browser verification (no test script in apps/web).
- [ ] T5 — Voice: replace `STUB_TRANSCRIPTS` random pick with real `SpeechRecognition` transcript (feature-detect, handle unsupported browsers, lang = browser locale if it starts with `es` else `es-ES`); un-hardcode `mode='manual'` so the mic UI is reachable. No backend changes — existing `POST /expenses/voice` → `parseVoiceTranscript` pipeline already works. Route: direct inline (1 file, already fully read, mechanical swap).

## Delivery

- Branch: `feature/pwa-voice-push-notifications` (created off `main`, which was clean at start).
- One work-unit commit per task, conventional commit format, no AI attribution trailer (per project `CLAUDE.md`: "Never add Co-Authored-By or AI attribution to commits").
- Push/PR remain the user's decision — not done automatically.

## Progress log

### T1 — done (2026-09-21)

- Added `pushSubscription` table (`packages/shared/src/db/schema/finance.ts`): uuid id, `user_id` FK cascade, `endpoint`/`p256dh`/`auth` text, `created_at`; unique index on `endpoint`; added `pushSubscriptions: many(...)` to `userRelations` + `pushSubscriptionRelations`.
- **Environment bug found (pre-existing, unrelated to this feature):** `pnpm db:generate` is broken for anyone in this repo right now. Root cause is two-layer:
  1. `pnpm` itself fails with `ERR_PNPM_PNPM_ENGINE_IDENTITY_UNVERIFIABLE` (already logged in memory #1658) — `corepack use pnpm@11.1.1` fixes the top-level invocation (pins the integrity hash into `package.json`'s `packageManager` field) but does NOT fix nested `--filter` invocations, which still resolve a different pnpm.
  2. Even bypassing pnpm (`bunx drizzle-kit generate`), the pinned `drizzle-kit@^0.30.0`'s own `esbuild@^0.19.7` dependency does not support `es2023` as a target (verified directly against the esbuild binary: `es2020`/`es2021`/`es2022`/`esnext` all work, `es2023` errors), so it can't transpile `drizzle.config.ts`. `drizzle-kit@latest` (0.31.11) fixes this but then wants a `drizzle-orm` bump too — a real ORM upgrade across the whole monorepo, out of scope for this table addition.
  - Kept the `package.json` packageManager hash pin (harmless, matches corepack's own recommended format) as its own commit. Left `drizzle-kit`/`drizzle-orm` version bump untouched — flagging it here for a separate decision, not fixing it as a drive-by.
  - **Worked around** by hand-authoring the migration (`apps/api/drizzle/0003_add_push_subscription.sql` + `meta/0003_snapshot.json` + `meta/_journal.json` entry), mirroring drizzle-kit's own output format exactly (checked column/index/FK JSON shape against the `financial_account` table's existing snapshot entry).
- Verified: started `docker compose up -d postgres` only, ran `bun --env-file=../../.env src/db/migrate.ts` — migration applied cleanly, `\d push_subscription` in psql matches the schema exactly (PK, unique index on endpoint, FK cascade to `user.id`). `packages/shared` typecheck clean (`tsc --noEmit`), full `vitest run` — 37/37 passing, no regressions.
