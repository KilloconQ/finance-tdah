# Delete goals (frascos) and expenses (gastos)

## Objective
Let the user delete a goal ("frasco") and an expense ("gasto") from the web app.

## Why
Product ask from the user's partner: "Quiero poder borrar frascos y gastos."

## Scope
- Backend: none needed. `DELETE /api/goals/:id` (soft-archive) and `DELETE /api/expenses/:id`
  (hard delete + balance reversal) already exist in `apps/api/src/routes/goals.ts` and
  `apps/api/src/routes/expenses.ts`.
- Frontend only: add mutations + UI entry points.

## Constraints / conventions
- Reuse the existing tap-to-confirm danger pattern from `apps/web/src/app/_app/settings.tsx`
  (`Btn kind="plain"` → confirm box with `Btn kind="ghost"` cancel + `Btn kind="danger"` confirm).
- `apps/web` has no test script (per root CLAUDE.md) — verification is `pnpm typecheck` and
  `pnpm lint`, not a test suite. TDD does not apply here.

## Tasks
- [x] T1: Delete a goal from its detail page
  - Added `useDeleteGoal(goalId)` to `apps/web/src/features/goals/api/goals.mutations.ts`
    (DELETE `goals/${goalId}`, invalidate `['goals']` and `['goals', goalId]` on success).
  - Exported it from `apps/web/src/features/goals/api/index.ts` (explicit named barrel).
  - Wired delete button + confirm state into `GoalDetailContainer`/`GoalDetailView`
    (`apps/web/src/features/goals/containers/GoalDetailContainer.tsx`,
    `apps/web/src/features/goals/components/GoalDetailView.tsx`); navigates to `/goals`
    (replace) on success. Confirm UX copies the settings.tsx danger-box pattern exactly.
- [x] T2: Delete an expense from the transactions list
  - Added `useDeleteExpense()` to `apps/web/src/features/expenses/api/expenses.mutations.ts`
    (DELETE `expenses/${id}`, invalidate `['expenses']`, `['dashboard']`, `['accounts']` —
    mirrors `useCreateExpense`'s invalidation since deleting reverses balances too).
  - Added a per-row delete affordance in `apps/web/src/app/_app/transactions.tsx`: a small
    `Trash2` `IconButton` next to the amount that sets `confirmingId`; the row in
    "confirming" state renders the danger confirm box (¿Estás seguro? / Cancelar / Confirmar)
    in place of the normal `Row`.

## Delivery
Direct/delegated organic implementation (no SDD). Single feature branch
`feature/delete-goals-expenses`, work-unit commits per task, no push/PR unless asked.

## Verification
- `pnpm typecheck` failed in this environment due to a pnpm version mismatch unrelated to the
  change (global pnpm is 12.3.4, repo pins `packageManager: pnpm@11.1.1`, corepack shim also
  misbehaved). Worked around with `npx --yes pnpm@11.1.1 -r typecheck` — PASSED (all three
  workspaces: packages/shared, apps/api, apps/web — "Done" / no errors).
- `npx --yes pnpm@11.1.1 lint` (same pnpm-version workaround) — `apps/web` reports 31
  pre-existing `react-refresh/only-export-components` errors (route files exporting `Route`
  alongside a page component, e.g. `transactions.tsx`, `settings.tsx`, `_app.tsx`, etc.).
  Verified via `git stash` that this is the exact pre-existing baseline (31 errors, including
  2 in `transactions.tsx` at the same two component declarations, just at different line
  numbers) — my changes add zero new lint errors. `pnpm lint` does not run on `apps/api`
  (no lint script, per root CLAUDE.md) or `packages/shared`.
- Manual: not run — no dev server/browser session started in this pass. UI wiring was
  verified by reading the compiled render output (typecheck) and matching the existing
  settings.tsx confirm pattern line-for-line; not clicked through manually.

## Status
Done (T1 + T2 implemented, typecheck clean, lint clean relative to baseline).
