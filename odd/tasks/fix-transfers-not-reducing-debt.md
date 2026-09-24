# Feature: fix transfers not reducing credit-card debt

## Objective
Money transferred into a `credito` account should reduce its debt. It currently
can fail to, because the negative-balance-for-credit convention is only
enforced client-side.

## Problem / root cause
- Convention: `credito` accounts store `balanceCents` **negative** (debt).
  `signedBalanceForType()` in `packages/shared/src/domain/account.ts` encodes
  this. Net worth (`domain/net-worth.ts`) and the accounts UI both rely on it.
- The transfer math itself (`apps/api/src/routes/expenses.ts` POST/PATCH/DELETE)
  is correct under that convention: crediting a `credito` account with a
  positive amount moves its negative balance toward zero.
- The convention is applied **only** in two web containers
  (`NewAccountContainer.tsx:32`, `EditAccountContainer.tsx:62-67`) when
  building the payload for `POST /accounts` / `PATCH /accounts/:id`.
  `apps/api/src/routes/accounts.ts` writes whatever `balanceCents` the client
  sends, with no server-side enforcement of the sign for `type: 'credito'`.
- If a credit account's `balanceCents` is ever stored positive (legacy data,
  a bug, a future direct API caller), every subsequent transfer into it moves
  the number the wrong way — this matches the reported symptom exactly.

## Scope
- Enforce the sign invariant server-side in `apps/api/src/routes/accounts.ts`
  for both `POST /` (create) and `PATCH /:id` (update), using
  `signedBalanceForType` from `@finance-tdah/shared/domain`.
- Add regression coverage (`apps/api/src/routes/accounts.test.ts`, new file)
  proving a positive `balanceCents` sent for a `credito` account is stored
  negative on create, and that a `PATCH` (with or without `type` in the
  payload) re-signs it correctly.
- Out of scope: the transfer math in `expenses.ts` (already correct, no
  change needed) and any DB migration/constraint (application-level fix is
  sufficient and consistent with how the rest of the domain works).

## Recovery for already-affected accounts
Once this ships, re-saving the affected credit account from "Editar cuenta"
(no need to change any field) is enough — the server now derives the sign
from `type`, ignoring whatever sign the client/previous state implied.

## TDD
Strict TDD (per CLAUDE.md). Runner: `pnpm --filter @finance-tdah/api test`.
RED (failing test proving the bug) → GREEN (server-side fix) → REFACTOR.

## Tasks
- [x] T1 — Add failing tests in `apps/api/src/routes/accounts.test.ts` for
      POST and PATCH sign enforcement on `credito` accounts; confirm RED.
      RED observed: 4/6 new tests failed with `expected 5000 to be -5000`
      (and equivalent for PATCH), i.e. failing for the expected reason —
      no sign enforcement in the unmodified route. Note: dropped an extra
      "balanceCents absent from PATCH payload" test — discovered that
      `updateFinancialAccountSchema` (`.partial()` over a schema whose
      `balanceCents` already has `.default(0)`) makes Zod default it to
      `0` even when the client omits the key from the request body, so
      "absent" doesn't survive validation. Pre-existing, unrelated to this
      fix, out of scope (no schema changes); the web client always sends
      `balanceCents` on PATCH so this doesn't surface today.
- [x] T2 — Fix `apps/api/src/routes/accounts.ts` to normalize `balanceCents`
      sign via `signedBalanceForType` on create and update; confirm GREEN.
      GREEN confirmed: `pnpm --filter @finance-tdah/api test -- --run
      accounts.test.ts` → 13 files / 57 tests passed, 0 failed.
- [x] T3 — Run full `apps/api` test suite + `pnpm typecheck`; commit.
      Full suite: 13 files / 57 tests passed. `pnpm typecheck` (repo
      root, all 3 workspaces): clean — `packages/shared`, `apps/api`,
      `apps/web` all "Done" with no errors. Committed as
      `fix(api): enforce credit-account balance sign server-side`.

## Branch / worktree
`fix/transfers-not-reducing-debt` at
`~/Dev/projects/finance-tdah-worktrees/fix-transfers`
