# Architecture

This document defines how code is organized in `apps/web` so business logic never leaks into screens. Read this before opening a PR — both author and reviewer use the checklist at the bottom.

## The golden rule

> **Screens are dumb glue. Business logic lives in `domain/`.**

If a component answers a business question ("is this jar complete?", "is this subscription worth it?", "how do I format MXN?"), the logic is in the wrong place. Move it to a pure function in `domain/`.

## Layer responsibilities

| Layer | What it does | What it must NOT do |
|-------|--------------|---------------------|
| **Routes** (`app/`) | Mount containers. Pass route params. | Fetch data, hold business logic, render real UI. |
| **Containers** (`features/<x>/containers/`) | Read queries, call mutations, navigate. Pass props down. | Render complex JSX, hold business rules. |
| **Components** (`features/<x>/components/`) | Receive props, return JSX. Local UI state only (open/closed, focused). | Call hooks that touch network/store, import queries. |
| **Domain** (`features/<x>/domain/` or `packages/shared/src/domain/`) | Pure functions. Business rules. Money math. | Import React, hooks, fetch, or anything I/O. |
| **API** (`features/<x>/api/`) | `queryOptions` factories + mutation hooks. | Hold business rules. Format for display. |
| **Shared UI** (`shared/ui/`) | Design system primitives (Button, Card, Input). | Know about features. |

## Folder structure

```
apps/web/src/
├── app/                         # TanStack Router routes (composition only)
│   └── _app/
│       ├── index.tsx            # → <HomeContainer />
│       └── add-expense.tsx      # → <AddExpenseContainer />
│
├── features/                    # Vertical slices, one per product area
│   ├── expenses/
│   │   ├── containers/          # Data-aware
│   │   ├── components/          # Presentational
│   │   ├── api/                 # queryOptions + mutations
│   │   └── domain/              # Pure business logic
│   ├── goals/                   # Frascos
│   ├── subscriptions/
│   ├── accounts/
│   └── onboarding/
│
├── shared/
│   ├── ui/                      # Design system primitives
│   ├── lib/                     # api.ts (fetchValidated), auth-client.ts
│   └── store/                   # Zustand (tweaks, simple/detailed mode)
│
└── routeTree.gen.ts             # generated — do not edit
```

`packages/shared` adds a new folder for logic shared between API and Web:

```
packages/shared/src/
├── db/         # Drizzle schema (canonical)
├── schemas/    # Zod (API ↔ Web contract)
└── domain/     # NEW: pure logic used by BOTH apps
    ├── money.ts      # cents conversion, MXN formatting
    └── jar.ts        # jar progress math
```

## The four rules

### 1. Domain is pure

No React, no hooks, no `fetch`. Input → output. Trivially testable.

```ts
// features/goals/domain/jar-progress.ts
export type JarProgress = {
  percent: number;
  isComplete: boolean;
  overflowCents: number;
};

export function jarProgress(savedCents: number, targetCents: number): JarProgress {
  const percent = Math.min(100, (savedCents / targetCents) * 100);
  return {
    percent,
    isComplete: percent >= 100,
    overflowCents: Math.max(0, savedCents - targetCents),
  };
}
```

If the same rule is needed by the API (e.g. to gate a "completed" notification), promote it to `packages/shared/src/domain/`.

### 2. Containers know the world, Presentational don't

```tsx
// features/goals/containers/JarContainer.tsx — data-aware
export function JarContainer({ goalId }: { goalId: string }) {
  const { data } = useQuery(goalQueryOptions(goalId));
  const progress = jarProgress(data.savedCents, data.targetCents);
  return <Jar progress={progress} title={data.title} />;
}

// features/goals/components/Jar.tsx — pure props in, JSX out
type JarProps = { progress: JarProgress; title: string };
export function Jar({ progress, title }: JarProps) {
  return <svg aria-label={title}>{/* ... */}</svg>;
}
```

Benefit: `Jar` is Storybook-able and testable without mocking the network.

### 3. Queries and mutations live in `features/<x>/api/`

Never inside a component. Always co-located with the feature.

```ts
// features/expenses/api/expenses.queries.ts
import { queryOptions } from '@tanstack/react-query';
import { fetchValidated } from '@/shared/lib/api';
import { expenseListSchema } from '@finance-tdah/shared/schemas';

export const expensesQueryOptions = () =>
  queryOptions({
    queryKey: ['expenses'],
    queryFn: () => fetchValidated('/api/expenses', expenseListSchema),
  });
```

### 4. Promote shared logic, don't copy-paste

If two features need the same thing → `shared/`.
If API and Web need the same thing → `packages/shared/src/domain/`.

## PR checklist

Author runs through this before requesting review. Reviewer uses it to verify.

- [ ] No business rules inside `components/*.tsx` (search for `if (.*Cents`, `if (.*amount`, etc.)
- [ ] No `useQuery` / `useMutation` inside `components/` — only inside `containers/`
- [ ] No `fetch` calls outside `features/<x>/api/` or `shared/lib/api.ts`
- [ ] New business rules have a pure function in `domain/` with a test
- [ ] Money handled as integer cents end-to-end (no floats)
- [ ] File/folder/component names in English (UI strings stay Spanish — see `CLAUDE.md`)
- [ ] Reused logic lives in `shared/` or `packages/shared/`, not duplicated

## Smell test for "wrong place"

If you see any of these inside a screen or `components/` file, the logic is misplaced:

```ts
if (account.balanceCents < expense.amountCents) // → domain/cooling-off.ts
const percent = (saved / target) * 100;          // → domain/jar-progress.ts
const formatted = `MX$ ${(c / 100).toFixed(2)}`; // → shared/domain/money.ts
const daysSinceUse = differenceInDays(...);      // → domain/subscription-usage.ts
```

## Next step

When starting a new feature, scaffold the four folders first (`containers/`, `components/`, `api/`, `domain/`) even if some start empty. Empty folders prevent the temptation to "just put it in the screen for now".

---

# Backend Architecture (`apps/api`)

## The golden rule

> **Routes are dumb HTTP glue. Business logic lives in `features/<x>/use-cases/`.**

If a route handler answers a business question (ownership check, balance deduction, transaction scope), the logic is in the wrong place. Move it to a use-case function.

## Layer responsibilities

| Layer | What it does | What it must NOT do |
|-------|--------------|---------------------|
| **Routes** (`routes/`) | Parse request, call one use-case, return response. | Import `drizzle-orm`, `schema`, or `db` directly. Hold business logic. |
| **Use-cases** (`features/<x>/use-cases/`) | Orchestrate repository calls. Own transaction scope. Throw typed domain errors. | Import Hono, request-id, or logger (unless injected via deps). |
| **Repositories** (`features/<x>/repositories/`) | Thin Drizzle wrappers. Accept `Db \| Tx`. Always include `userId` in WHERE on user-owned entities. | Contain business logic (`if`, math). Import use-cases. |
| **Errors** (`features/<x>/errors/` or `shared/errors/`) | Typed `DomainError` subclasses. Set `code`, `status`, Spanish `message`. | Contain logic. |
| **Shared infra** (`shared/`) | `DomainError` base, generic errors, HTTP mapper, `UseCaseDeps`/`UseCase` types. | Feature-specific knowledge. |

## Folder structure

```
apps/api/src/
├── shared/
│   ├── errors/
│   │   ├── domain-error.ts          # abstract base class
│   │   ├── not-found.error.ts       # generic 404
│   │   ├── not-owned.error.ts       # generic 403
│   │   ├── validation.error.ts      # generic 422
│   │   └── index.ts                 # barrel
│   ├── http/
│   │   └── error-mapper.ts          # maps DomainError → c.json response
│   └── types/
│       └── use-case.ts              # UseCaseDeps, UseCase<TIn, TOut>
│
├── features/
│   ├── expenses/
│   │   ├── use-cases/               # create-expense.ts, delete-expense.ts, list-expenses.ts
│   │   ├── repositories/            # expense.repository.ts
│   │   ├── errors/                  # expense-not-found.error.ts
│   │   └── index.ts                 # barrel — re-exports use-cases
│   ├── accounts/                    # same structure
│   ├── goals/
│   ├── subscriptions/
│   ├── dashboard/                   # no repository — composes other features' repos
│   ├── profile/
│   └── challenges/
│
└── routes/                          # thin — parse → call use-case → return
```

## Use-case shape

```ts
// shared/types/use-case.ts
type UseCaseDeps = { db: Db; userId: string; logger?: Logger }
type UseCase<TInput, TOutput> = (deps: UseCaseDeps, input: TInput) => Promise<TOutput>
```

- Plain async functions. No class factories. No DI containers.
- `userId` is always in `deps` — it is a cross-cutting auth concern, not part of the business input.
- Use-cases that mutate more than one table MUST wrap all writes in `db.transaction(async (tx) => ...)`.

## Error model

```ts
// shared/errors/domain-error.ts
abstract class DomainError extends Error {
  abstract readonly code: string
  abstract readonly status: number
}
```

- Feature errors extend `DomainError` (e.g. `ExpenseNotFoundError`, `AccountNotFoundError`).
- Messages are in Spanish to preserve the wire format the web client already parses.
- `app.onError` calls `mapErrorToResponse` from `shared/http/error-mapper.ts`.
- Wire format is frozen: `{ "error": "<Spanish message>" }`. Do not change without a separate SDD.

## Repository rules

1. Every repository function that reads user-owned data MUST include `userId` in its WHERE clause.
2. Repository functions accept `db: Db | Tx` for portability inside transactions.
3. A feature owns the repository for the tables it semantically owns. Other features may import from it (e.g. `expenses` imports `findUserAccountById` from `features/accounts/repositories/`).
4. Repositories MUST NOT import use-cases. Use-cases may import another feature's repository.

## Transaction ownership

The use-case owns the transaction — not the route. Routes MUST NOT call `db.transaction()`.

Transactional use-cases (multi-table mutations): `createExpense`, `deleteExpense`, `completeOnboarding`, `checkChallenge`.

## Testing

- vitest 4 is configured in `apps/api`. Run: `pnpm --filter @finance-tdah/api test`.
- Tests are co-located: `use-cases/create-expense.test.ts` next to `create-expense.ts`.
- Use-case tests mock repositories with `vi.fn()`. No real Postgres connection needed.
- Domain functions in `packages/shared/src/domain/` are tested in `packages/shared`.

## Tx type

```ts
// db/client.ts
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
```

Extracted via `Parameters` utility so it stays in sync with Drizzle's generated types automatically.

## PR checklist (Backend)

Author runs through this before requesting review. Reviewer uses it to verify.

- [ ] No `drizzle-orm` or `schema` imports in `routes/*.ts`
- [ ] Multi-table mutations run inside `db.transaction()` — in the use-case, not the route
- [ ] Domain errors are typed classes extending `DomainError`; `mapErrorToResponse` maps all of them
- [ ] Repository functions always include `userId` in their WHERE clause on user-owned entities
- [ ] Use-cases are unit-tested (vitest) without Hono or Postgres
- [ ] `pnpm typecheck` passes at repo root
- [ ] `pnpm --filter @finance-tdah/api test` passes
- [ ] All HTTP response shapes and status codes are unchanged
- [ ] File names are English, kebab-case; error classes are PascalCase ending in `Error`
- [ ] Wire format `{ "error": "<Spanish message>" }` is preserved verbatim
