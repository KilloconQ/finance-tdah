# Invitation cleanup

Objective: finish the five cleanups the /simplify pass skipped on the group + app invitation work.
Branch: `feat/group-invites` (all work uncommitted). Delivery: ask-on-risk. Test runner: Vitest (`pnpm test`; API integration tests need `TEST_DATABASE_URL` → throwaway DB `ft_test`).

## Specs

- **S1: Persist the app-invitation limits in Postgres.** Replace the in-memory maps in `apps/api/src/routes/invitations.ts` (`sentByUser`, `sentToAddress`, `allow`) with a table, so the limits survive restarts and work with more than one API instance. Behavior of `POST /invitations/app` stays exactly the same:
  - always `202 { ok: true }` for a valid email, whether or not the address has an account;
  - at most 10 requests per inviter per rolling 24 h, then `429 { error: 'Llegaste al límite de invitaciones por hoy. Intenta mañana.' }`;
  - an address with no account gets at most one sign-up email per rolling 24 h, whoever sends it;
  - invalid email → 400 and uses no quota.
  The limits must hold under concurrent requests (no double send, no going over 10). The table must not grow without bound. The schema goes in `packages/shared/src/db/schema/finance.ts`; the migration is generated with `pnpm db:generate` (it will be `0009_*`, after the uncommitted `0008`).
- **S2: Rename the group-invite endpoint.** `POST /groups/:id/members` becomes `POST /groups/:id/invitations`, with the same body, response (`201 { members }`), and anti-enumeration behavior. Remove the old route. Update the web hook (`useAddMember` in `apps/web/src/features/groups/api.ts`; rename it if the name no longer fits) and every test that calls the old path.
- **S3: Shared integration-test helper.** `apps/api/src/routes/groups.integration.test.ts` and `apps/api/src/routes/invitations.integration.test.ts` repeat the HTTP `call()` helper and member seeding. Extract what can be shared (`vi.mock` calls must stay in each test file because they are hoisted) into one helper module, and use it in both files.
- **S4: Drop the invitation card immediately on accept.** On accept, the invitation leaves the list right away (optimistic cache update) instead of waiting for two refetches in sequence, and the "no groups" empty state must not flash while the new group loads. On failure, the invitation list is refetched (as today). Decline keeps its current behavior.
- **S5: One error-message helper on the web.** Replace the inline `err instanceof Error ? err.message : '<fallback>'` with `errorText(err, '<fallback>')` from `apps/web/src/lib/api.ts` in: `app/onboarding/done.tsx`, `app/_app/challenge.tsx`, and the containers under `features/{subscriptions,goals,accounts,expenses}/containers/` that use the pattern. `lib/use-push-subscription.ts` falls back to `null`, not a string, so it stays as is.

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S1 | delegated (user asked for a fix agent + review loop) | done (uncommitted) | — |
| T2 | S2 | delegated | done (uncommitted) | — |
| T3 | S3 | delegated | done (uncommitted) | — |
| T4 | S4 | delegated | done (uncommitted) | — |
| T5 | S5 | delegated | done (uncommitted) | — |

## Log

- L1 (2026-10-26, user): "usa un agente para arreglar esta mierda, luego usas otro para que lo revise y si sale algo que quede por corregir se lo dices al primero y eso entra en loop hasta que se arregle o tenga dudas"
- L2 (2026-10-26, user): scope chosen = "Lo que quedó sin hacer" (the five items the /simplify pass skipped).
- L3: Risk: S1 is item 1 (new table + migration) and item 4 (concurrency); S2 is item 3 (endpoint rename, web and API ship together in one deploy).
- L4 (2026-10-26, fix agent): T1-T5 implemented, uncommitted. S1 uses table `app_invitation_log` (migration 0009_thin_lord_tyger), per-key advisory lock in a transaction, bounded sweep of rows older than 1 day (SKIP LOCKED). The address ledger row is now written for every valid request (also when the address has an account) and the lookup runs in parallel with it, so response time does not reveal whether an account exists; the email is still sent only when there is no account. S2: hook renamed `useInviteToGroup`; `DELETE /groups/:id/members/me` unchanged. S3: helper in `apps/api/src/test/integration.ts`. S4: optimistic removal in `useAnswerInvitation` plus `joining` guard on the empty state. S5: 10 files switched to `errorText`.
- L5 (2026-10-26, verifier round 1): S1–S5 PASS, no blockers, no product questions; the review loop ends after one round. Accepted the L4 choice (address ledger row written for every valid request). Verification: shared 112, api 167 (integration included), web 379, typecheck and lint clean. Pending: commit/PR is the user's decision.
