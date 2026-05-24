# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

pnpm workspace monorepo, three packages:

- `apps/api` — Hono server running on **Bun** (`bun --hot src/index.ts`). Auth via better-auth + Drizzle adapter (Postgres).
- `apps/web` — React 19 + Vite 8 SPA. TanStack Router (file-based, generated tree) + TanStack Query. Tailwind v4.
- `packages/shared` — single source of truth for **Drizzle schema** (`src/db/schema/`) and **Zod request/response schemas** (`src/schemas/`). Consumed by both apps via `@finance-tdah/shared/{db,schemas,types}`.

Workspace root (`package.json`) drives everything via `pnpm -r --filter=./apps/*` for app-only ops.

## Commands

Run from the repo root unless noted:

```bash
pnpm dev                # api + web in parallel
pnpm dev:web            # web only (Vite, :5173 with /api proxy → :3001)
pnpm dev:api            # api only (Bun --hot, :3001)
pnpm build              # builds both apps
pnpm typecheck          # tsc --noEmit across all workspaces
pnpm lint               # eslint (web only — api has no lint script)

# Database (proxies to apps/api)
pnpm db:generate        # drizzle-kit generate from packages/shared/src/db/schema
pnpm db:migrate         # bun src/db/migrate.ts (reads DATABASE_URL directly, NOT via env.ts)
pnpm db:seed            # bun src/db/seed.ts
pnpm db:studio          # drizzle-kit studio
pnpm auth:schema        # regenerate better-auth tables (writes apps/api/src/db/auth-generated.ts)

# Docker (full stack: postgres + api + web + caddy + cloudflared)
pnpm docker:up          # uses .env at repo root
pnpm docker:down
pnpm docker:logs
```

There is **no test runner configured** in this repo yet. Don't claim "tests pass" — there are none.

The api has no lint script; `pnpm lint` only hits `apps/web`.

## Environment

Two distinct env stories (don't mix them):

1. **API runtime** (`apps/api/src/env.ts`): strict Zod validation, exits on any missing var. Requires `DATABASE_URL`, `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL`, `WEB_ORIGIN`.
2. **Migrations** (`apps/api/src/db/migrate.ts`): intentionally **decoupled** from `env.ts`. Reads `DATABASE_URL` directly from `process.env` so migrations can run with only a DB URL (no auth secret needed in CI/local migration scripts). Don't re-import `env.ts` here.

Template lives at `infra/env.example.md` — `.env` goes at the repo root.

## Architecture notes

### Shared schemas as the contract

`packages/shared/src/schemas/*` exports Zod schemas used by **both** sides:
- API routes validate inputs with `@hono/zod-validator` against these.
- Web validates API responses with `fetchValidated()` in `apps/web/src/lib/api.ts` against the same schemas.

When changing an API payload, edit the Zod schema in `packages/shared` first — both sides break loudly.

### Drizzle schema

Lives in `packages/shared/src/db/schema/` (split into `auth.ts` + `finance.ts`). `drizzle.config.ts` points to `../../packages/shared/src/db/schema/index.ts`. Run `pnpm db:generate` after schema edits, then `pnpm db:migrate`.

All monetary values are stored as **integer cents** (`amountCents`, `balanceCents`, `targetCents`, etc.) — never floats.

### Auth

better-auth with the Drizzle adapter. The `user`, `session`, `account`, `verification` tables in `packages/shared/src/db/schema/auth.ts` mirror the shape better-auth expects — keep them in sync with `pnpm auth:schema` if better-auth fields change.

- API mounts auth handler at `/api/auth/*` (catch-all in `apps/api/src/index.ts`).
- Protected routes use `sessionMiddleware` (`apps/api/src/middleware/session.ts`) which calls `auth.api.getSession()` and sets `c.var.user` / `c.var.session`.
- Web uses `authClient` from `apps/web/src/lib/auth-client.ts`. Route guards via TanStack Router `beforeLoad` — see `apps/web/src/app/_app.tsx` (the `_app` pathless layout enforces auth for everything under it).

### Frontend routing

- File-based, generated into `apps/web/src/routeTree.gen.ts` by `@tanstack/router-plugin/vite`. **Don't edit `routeTree.gen.ts` by hand** — it regenerates on dev/build.
- Folder convention: `_app/*` = authed app shell, `auth/*` = public auth screens, `onboarding/*` = post-signup flow.
- `@/` alias resolves to `apps/web/src/`.

### Server state vs client state

- **TanStack Query** handles all server data via `queryOptions` factories in `apps/web/src/lib/queries.ts`. All `queryFn` calls go through `fetchValidated()` → Zod-validated typed result.
- **Zustand** (`apps/web/src/store/appStore.ts`) holds UI tweaks + onboarding draft state, persisted to localStorage. Note: the store still contains `MOCK_*` data for accounts/goals/expenses/etc. — that's the legacy mock layer, the real data path is the API + Query.

### Naming convention

**English only** for filenames, route paths, component names, enum literals. The Spanish you'll see in user-facing strings (UI copy, error messages) is intentional — the product is in Spanish. Don't translate UI copy unless asked, don't introduce Spanish in code identifiers.

## Conventions to follow

- Conventional commits, no AI co-author trailers.
- Prefer `bat`/`rg`/`fd`/`sd`/`eza` over `cat`/`grep`/`find`/`sed`/`ls` in shell commands.
- When you change a Zod schema in `packages/shared`, both api routes and web queries need a look — that's the point of the shared package.
