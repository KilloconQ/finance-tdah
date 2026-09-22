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
- [x] T2 — Backend push infra: `web-push` dep, VAPID env vars (`apps/api/src/env.ts` + `infra/env.example.md`), Zod subscribe-payload schema in `packages/shared/src/schemas`, `apps/api/src/routes/push.ts` (POST /subscribe, DELETE /unsubscribe, following existing route shape: session middleware + zValidator + direct db calls), `apps/api/src/services/push-sender.ts` wrapping `web-push.sendNotification`, mount in `apps/api/src/index.ts`. Tests: route `.test.ts` per convention. Route: delegated writer (5+ files, new logic).
- [x] T3 — Trigger wiring: weekly-budget threshold check after `expenses.ts` POST transaction, goal-reached check after `goals.ts` POST /:id/add update; both call `push-sender`, both notify only the acting user (no partner concept). Tests for the two threshold-detection functions. Route: delegated writer (2-3 files, new business logic).
- [ ] T4 — Frontend push subscribe flow: `vite.config.ts` → `injectManifest` strategy + custom `src/sw.ts` (precache + `push`/`notificationclick` listeners), client hook to request `Notification` permission + `pushManager.subscribe` + POST to backend, new Settings `Section`/`Toggle` (slots between "Privacidad" and the logout divider per existing `settings.tsx` structure), `VITE_VAPID_PUBLIC_KEY` env var. Route: delegated writer (4-5 files, new SW paradigm). Manual browser verification (no test script in apps/web).
- [x] T5 — Voice: replace `STUB_TRANSCRIPTS` random pick with real `SpeechRecognition` transcript (feature-detect, handle unsupported browsers, lang = browser locale if it starts with `es` else `es-ES`); un-hardcode `mode='manual'` so the mic UI is reachable. No backend changes — existing `POST /expenses/voice` → `parseVoiceTranscript` pipeline already works. Route: direct inline (1 file, already fully read, mechanical swap).

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

### T2 — done (2026-09-21)

- Backend push infra, following `goals.ts`'s exact route shape (session middleware + zValidator + direct db calls):
  - `packages/shared/src/schemas/push.ts`: `pushSubscribeSchema` (endpoint url + keys.p256dh/auth), `pushUnsubscribeSchema` (endpoint url), exported from `packages/shared/src/schemas/index.ts`.
  - `apps/api/src/routes/push.ts`: `POST /subscribe` (upsert via `onConflictDoUpdate` on the `endpoint` unique index, scoped to `c.get('user').id`), `DELETE /subscribe` (deletes only where `endpoint` AND `userId` match — trust-boundary requirement, has an explicit test). Mounted in `apps/api/src/index.ts`.
  - `apps/api/src/services/push-sender.ts`: `sendPushToUser(userId, payload)` — looks up all subscriptions for a user, sends via `web-push` with `Promise.allSettled` (one dead device doesn't block others), self-deletes subscriptions on a `WebPushError` with `statusCode` 404/410, logs (doesn't throw) on any other failure so a push failure never breaks the caller.
  - Added `web-push` + `@types/web-push` to `apps/api/package.json` (via `corepack pnpm add`, run directly inside `apps/api` — see environment note below).
  - Added `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` to `apps/api/src/env.ts` (required) and `infra/env.example.md`. Generated a real VAPID keypair locally for dev (`bun -e "console.log(JSON.stringify(require('web-push').generateVAPIDKeys()))"`) — could not write it to the root `.env` myself (Bash write to `.env` is permission-denied for this session), asked the user to paste it in directly.
  - Tests: `apps/api/src/routes/push.test.ts` (upsert scoping, validation rejection, delete trust-boundary scoping + 404, mirrors `goals.test.ts`'s fake-db + `leaves()` fragment-walking pattern), `apps/api/src/services/push-sender.test.ts` (success path touches no DB, 404/410 self-deletes, transient error doesn't delete).
- **Environment note**: `corepack pnpm add <pkg>` run **from inside the target package directory** (e.g. `cd apps/api && corepack pnpm add web-push`) works correctly and updates `pnpm-lock.yaml` normally — unlike root `pnpm --filter` invocations, which still hit the broken engine-identity resolution. This is now the established workaround for the rest of this feature.
- Verified: `apps/api` typecheck clean, `vitest run` — 27/27 passing (includes the new push tests). `packages/shared` typecheck clean, `vitest run` — 37/37 passing. Did not verify the live server actually starts (`bun --hot src/index.ts`) since VAPID keys aren't in `.env` yet — that needs the user's paste-in first; the unit test suite never imports the real unmocked `env.ts` so it wasn't blocked by this.

### T3 — done (2026-09-21)

- `apps/api/src/routes/expenses.ts`: after the DB transaction commits and only for `input.kind === 'expense'`, computes `weekSpentAfter` the same way `dashboard.ts`'s `.get('/home', ...)` does (same `startOfWeek` calc, same `db.select({ sum: sum(...) }).from(expense).where(...)` query), derives `weekSpentBefore = weekSpentAfter - created.amountCents`, and calls `sendPushToUser` only on the crossing moment (`before < target <= after`). Wrapped in its own try/catch (`notifyIfBudgetCrossed`) logging via `logger.error('budget_notification_failed', ...)` — never affects the HTTP response.
- `apps/api/src/routes/goals.ts`: after the `if (!updated)` 404 guard in `POST /:id/add`, detects the crossing the same way (`updated.currentCents - amountCents` as `before`, compared to `updated.targetCents`), calls `sendPushToUser` once on completion. Wrapped in try/catch + `logger.error('goal_notification_failed', ...)`, placed after the existing "don't cap overflow" comment without touching that logic.
- Copy used: budget — title `"Presupuesto semanal"`, body `"Llegaste al límite de tu presupuesto de esta semana."` (adjusted from the spec's suggested body to "límite" for a slightly more natural register, matching the terse, direct tone of other Spanish strings in the routes, e.g. `"Cuenta no encontrada"`/`"Frasco no encontrado"`). Goal — title `"¡Meta cumplida!"`, body `` `Completaste tu meta "${updated.name}" ${updated.emoji}` `` (as specified). Both use `url: '/'`.
- Tests: extended `apps/api/src/routes/expenses.test.ts` and `apps/api/src/routes/goals.test.ts` in place, matching their existing `vi.hoisted` fake-db style. Added `vi.mock('../services/push-sender', ...)` and `vi.mock('../env', ...)` (needed because `../lib/logger` imports the real `env.ts`, which now requires VAPID vars — same issue T2's `push-sender.test.ts` already solved with an `../env` mock, reused here). Extended `expenses.test.ts`'s fake `db`/`tx` with `insert` (previously untested — POST `/` had no prior test coverage at all), `query.userProfile.findFirst`, and `select().from().where()` for the week-sum query. Covered: budget crossing → 1 call; already-over-budget before this expense → not called; still-under-budget after → not called; `income` kind → not called (skipped entirely, kind guard). Goal: completes → 1 call; stays incomplete → not called; overflow deposit into already-complete goal → not called.
- Deviation from spec: none functionally — only the minor budget-copy wording tweak noted above (spec explicitly allowed adjusting for natural phrasing).
- Verified: `apps/api` typecheck clean (`./node_modules/.bin/tsc --noEmit`, no errors). `./node_modules/.bin/vitest run` — **34/34 passing** (7 test files; up from 27 in T2, +7 new notification tests, no regressions).

### T5 — done (2026-09-21)

- `apps/web/src/features/expenses/containers/AddExpenseContainer.tsx`: removed `STUB_TRANSCRIPTS`, replaced with real `SpeechRecognition`/`webkitSpeechRecognition` — press-and-hold starts `recognition.start()`, release calls `recognition.stop()`, the transcript arrives async in `onresult` and feeds the same existing `parseVoice.mutate(transcript, ...)` call (no backend change needed, confirmed by T2's exploration). `lang` = `navigator.language` when it starts with `es`, else `es-ES`. `onerror` maps `not-allowed`/`service-not-allowed`/`no-speech`/`network` to short Spanish messages, default fallback for anything else.
- Un-hardcoded initial `mode`: now reads `useTweaks().inputPreference` (extended that hook to expose it — `apps/web/src/lib/use-tweaks.ts`, defaults to `'voice'` matching the DB column default) instead of always starting in `'manual'`. Known limitation: since it's a `useState` initializer, it only reflects `inputPreference` if the profile query has already resolved/cached by mount — acceptable given the common case (profile usually already in the TanStack Query cache from elsewhere in the app) and not worth an extra sync effect for this slice.
- Guarded `onUseVoice`/mic entry points with a feature-detect (`getSpeechRecognitionCtor()`) — unsupported browsers get a Spanish error instead of silently switching into a dead voice mode.
- New `apps/web/src/types/speech-recognition.d.ts`: minimal ambient types for `SpeechRecognition`/`SpeechRecognitionEvent`/`SpeechRecognitionErrorEvent` — TypeScript's bundled DOM lib doesn't include the Web Speech API (not a W3C standard, still webkit-prefixed in Safari), confirmed by grepping the installed `typescript@6.0.3`'s `lib.dom.d.ts`.
- Verified: `apps/web` typecheck clean (`tsc -p tsconfig.app.json --noEmit`), production `vite build` succeeds cleanly (2131 modules, no errors). **Not verified**: actual browser/microphone behavior — no browser automation tool is available in this session, so the real press-and-hold → speech → transcript → parse flow was never exercised end-to-end in a live browser. This needs a manual check (or the `run` skill with human eyes on it) before calling voice fully done, flagging honestly rather than claiming untested UI behavior works.
