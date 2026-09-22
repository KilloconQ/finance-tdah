# Feature: Self-service password reset via Resend

## Objective

Add a real "forgot password" flow (email link → reset form) instead of the manual DB-hack used to unblock the user mid-session (2026-09-21/22). Uses Resend to send the reset email.

## Problem / why

User forgot their password, got unblocked with a direct DB password update (server-side `hashPassword` from `better-auth/crypto`, matches the account's credential row) as a stopgap. User then asked to build the real flow, and confirmed (2026-09-22) they can use Resend.

## Scope

**In:**
- `apps/api/src/auth.ts`: wire `emailAndPassword.sendResetPassword` using the Resend SDK.
- `apps/web`: `/auth/forgot-password` (request email) and `/auth/reset-password` (set new password, reads `token` from the URL) routes; a link from `/auth/sign-in` to the new forgot-password route.
- Env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

**Out:**
- Custom domain in Resend — user has a domain but hasn't verified it there yet. Starting with Resend's sandbox `onboarding@resend.dev` (only delivers to the account owner's own verified address, which is exactly this app's one real user right now). Switching to a real domain later is just an env var change once verified.
- Any admin/CLI-based password reset path — went with self-service email since the user confirmed Resend.

## Constraints

- better-auth's actual server contract (read directly from `better-auth@1.6.11`'s `dist/api/routes/password.mjs`, not assumed from docs):
  - `POST /request-password-reset` — body `{ email, redirectTo? }`. Calls `emailAndPassword.sendResetPassword({ user, url, token }, request)`. `url` is already the full callback link: `${BETTER_AUTH_URL}/api/auth/reset-password/{token}?callbackURL={encodeURIComponent(redirectTo)}` — just link to `url` directly in the email, better-auth's own GET callback verifies the token and redirects the browser to `redirectTo?token={token}`.
  - `POST /reset-password` — body `{ newPassword, token }`.
  - Client SDK auto-generates method names from these paths: `authClient.requestPasswordReset({ email, redirectTo })` and `authClient.resetPassword({ newPassword, token })`. Verify these resolve (TS autocomplete / no type error) before assuming — the generated client is a proxy, don't guess an alternate name from memory.
- Existing auth screens (`apps/web/src/app/auth/sign-in.tsx`, `sign-up.tsx`) each define their own local `Field` component and use `PhoneShell`/`Card`/`Hello`/`Btn` from `@/components` — match that exact convention (they don't share a `Field`, both files duplicate it; keep consistent with that unless sharing is clearly trivial and not overreaching scope).
- `apps/api/src/env.ts` currently requires `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (from the unrelated PWA push feature, already on a different branch — not present on this branch, this feature branched off `main` before that work existed). Do not reintroduce those here.
- TDD: strict only for `packages/shared` (not touched by this feature). `apps/api` — every route/service has a sibling `.test.ts`, but `auth.ts`'s `sendResetPassword` callback is thin glue calling the Resend SDK; use judgment on whether a test adds real value vs. mocking Resend's SDK just to assert one call — don't force a test that only proves the mock was called.
- `apps/web` has no test script — typecheck + production build only, no live browser available this session either.

## Working directory

This feature lives in an isolated git worktree so it doesn't disturb the `feature/pwa-voice-push-notifications` branch's running dev servers:
`/Users/fernandocorrales/Dev/projects/finance-tdah-worktrees/password-reset-resend` (branch `feature/password-reset-resend`, branched off `main`).

`.env` / `apps/web/.env` are NOT copied into the worktree (Bash/Write permission-denied on `.env` files for this session) — typecheck and build work without them (Zod env validation only runs when the actual server process starts), but the real dev server cannot be booted from the worktree until the user copies those files in or the orchestrator asks them to.

## Tasks

- [x] T1 — Backend: `resend` dep, `RESEND_API_KEY`/`RESEND_FROM_EMAIL` env vars (`apps/api/src/env.ts` + `infra/env.example.md`), `sendResetPassword` wired into `apps/api/src/auth.ts`'s `emailAndPassword` config. Route: delegated writer (multi-file, external service integration).
- [x] T2 — Frontend: `apps/web/src/app/auth/forgot-password.tsx`, `apps/web/src/app/auth/reset-password.tsx`, link from `sign-in.tsx`. Same delegated writer as T1 (small enough combined feature, one bounded task).

## Delivery

- Branch: `feature/password-reset-resend`, worktree as above.
- Work-unit commit(s), conventional commit format, no AI attribution trailer.
- Push/PR remain the user's decision.

## Progress log

### T1 + T2 — done (2026-09-21)

- `apps/api/src/auth.ts`: `sendResetPassword` sends via Resend (`resend.emails.send`), links directly to better-auth's own `url` (its GET callback verifies the token then redirects to `redirectTo?token=...`, confirmed by reading `better-auth@1.6.11`'s source directly).
- `apps/api/src/env.ts`: `RESEND_API_KEY` (required), `RESEND_FROM_EMAIL` (defaults to Resend's sandbox `onboarding@resend.dev` — user's own domain isn't verified with Resend yet).
- New `apps/web/src/app/auth/forgot-password.tsx` / `reset-password.tsx`: match `sign-in.tsx`/`sign-up.tsx`'s exact style (local `Field`, `PhoneShell`/`Card`/`Hello`/`Btn`). Forgot-password never reveals whether an email exists (always shows the same confirmation). Reset-password reads `token` from the URL, shows an explicit invalid-link state instead of a broken form when missing.
- `sign-in.tsx`: added "¿Olvidaste tu contraseña?" link.
- Client methods confirmed correct (`authClient.requestPasswordReset`, `authClient.resetPassword`) by clean typecheck/build, not guessed — matches better-auth's proxy-generated names for `/request-password-reset` and `/reset-password`.
- Verified independently (re-ran, not just trusted the report): `apps/api` typecheck clean, `apps/web` production build clean (`mode generateSW`, unrelated to the PWA push feature — this branch predates that work).
- **Not verified**: actual email delivery via Resend, or the live click-through flow (sign-in → forgot-password → email → reset-password → sign-in). No browser automation tool, no real Resend API key in this worktree (no `.env` copied in — permission-denied on `.env` writes). User needs to add a real `RESEND_API_KEY` (from resend.com) plus copy `DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`/`WEB_ORIGIN`/`ALLOWED_EMAILS` into this worktree's own `.env` before it can actually run.

### Live end-to-end verification — done (2026-09-22)

User added the real `.env` to this worktree. Ran this worktree's API + web on non-colliding ports (3002/5174, overriding the copied `.env`'s 3001/5173 via shell env vars, since the `feature/pwa-voice-push-notifications` branch's servers were already running on those in the main checkout). Triggered `POST /api/auth/request-password-reset` for the real user — email arrived from `onboarding@resend.dev`, link redirected correctly to `/auth/reset-password?token=...`, user completed the form and confirmed the password actually changed. Full flow confirmed working by a human, not just build/typecheck.
