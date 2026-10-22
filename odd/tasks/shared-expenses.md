# Shared expenses (split + who owes whom)
Branch: worktree-shared-expenses (worktree: ../worktree-shared-expenses). Delivery: ask-on-risk. Runner: pnpm test (vitest); API integration needs TEST_DATABASE_URL.

## Specs
S1. Groups: a user creates a group and adds other existing users by email. Members see the group. (assumption: members must already have an account; not-found returns a generic Spanish error.)
S2. Shared expense: a member records an expense paid by one member, split among selected members. Default equal split; custom per-member amounts allowed. Shares are integer cents and always sum to the amount (remainder cents go to the first members). (assumption)
S3. Balances: per group, show each member's net balance and a simplified list of "quién le debe a quién" with amounts.
S4. Settle up: a member records a payment from one member to another; it updates balances.
S5. Only group members can read or write a group's data. Edit/delete of a shared expense limited to its payer or creator. (assumption)
S6. Not linked to personal accounts/envelopes in this first slice. (assumption)
S7. Code identifiers in English; UI copy in Spanish. Money in integer cents.

## Tasks
- [x] T1 (S2,S3,S7) shared: Drizzle tables + migration 0007_dazzling_silhouette, Zod schemas, pure domain fns `splitEqual` and `computeBalances`/`simplifyDebts` + unit tests. Route: inline. RED observed (module missing), GREEN 8/8; shared typecheck clean, 98 tests pass. Commit: 03cc638.
- [x] T2 (S1,S2,S4,S5) api: groups/members/expenses/settlements routes + integration test. Route: inline. 6 integration tests pass on throwaway Postgres (docker ft_test, port 55432); typecheck/lint/all tests green. Not done: PATCH (edit) of a shared expense, only DELETE (S5 edit half). Commit: 6b0ad10.
- [x] T3 (S1-S4) web: groups list, group detail (expenses, balances, settle), forms, tests, nav entry. Route: inline. 8 new web tests; typecheck/lint/all tests green. Gaps: UI splits equally only (no custom amounts), no expense edit UI, nav = 6th tab 'Grupos'. Commit: db4eab1.

- [x] T4 (S2,S5) edit: API `PUT /groups/:id/expenses/:expenseId` (full replacement, payer/creator only, shared `resolveSplits` with create) + web edit sheet and custom per-member amounts. Route: inline. Integration + 2 web tests added; typecheck/lint/all tests green. Commit: see git log.

## Log
L1 (2026-10-15, user): "tengo que tener la parte de los gastos compartidos ya hechos, asi que worktree y branch para hacerlo"
L2 (2026-10-15, user): "el 1 es para dividir gastos y quien debe a quien" (chose: another person with an account, split expenses, who owes whom)
L3 (2026-10-16): Explorer map: ids uuid, user.id is text, cents ints, migrations 0007 next, routes via sessionMiddleware+zValidator, new update schemas must be added to update-schemas.test.ts, TabBar already has 5 tabs.
L4 (2026-10-16): T1 verified (98 shared tests, typecheck) and committed 03cc638.
L5 (2026-10-16): T2 routes in apps/api/src/routes/groups.ts mounted at /api/groups; tests written after the route (no RED observed). Member-only guard returns 404 for non-members. Integration run against docker postgres:17 ft_test only.
L6 (2026-10-16): T3 web in features/groups + app/_app/groups; added groupListSchema/groupDetailSchema to shared. Tests written alongside, no RED observed.
L7 (2026-10-22, user): asked to finish it; closes T2/T3 gaps (expense edit, custom amounts UI). Edit is PUT (full body) rather than PATCH so the update-schema `.default()` pitfall cannot apply.
