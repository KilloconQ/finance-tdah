# Mobile nav: 1 CTA + 4 tabs, new "Dinero" hub

Objective: fewer bottom-of-screen buttons on mobile without hiding anything (ADHD-first). Branch `feat/mobile-nav-money` (worktree `../finance-tdah-worktrees/mobile-nav-money`), single PR. Tests: Vitest + Testing Library (`pnpm --filter web test`). Design: https://claude.ai/artifact/ARkbeD6YrnX7sL5yYU616o

## Specs

- S1 — Mobile tab bar has 4 tabs: "Hoy", "Movimientos", "Dinero", "Grupos" ("1 CTA + 4 tabs: Hoy, Movimientos, Dinero, Grupos"). "Dinero" is active on `/money` and on the screens it leads to (`/accounts`, `/goals`, `/subscriptions`). Inactive labels use `text-ink-mid` (ink-soft fails 4.5:1). The desktop sidebar keeps its current entries.
- S2 — New `/money` screen ("pantalla Dinero con secciones Cuentas/Frascos/Suscripciones"): three summary tiles at the top (Cuentas, Frascos, Suscripciones) that jump to their section, then the three sections in one scroll, no inner tabs. Rows open the item's detail; each section has an add link; balances respect `showBalances`. Suscripciones must be visible without scrolling (user: "mi unica pregunta es donde esta la parte de suscripciones").
- S3 — Home ("Retos como tarjeta en Hoy"): one docked CTA "Gasto"; "Echar al frasco" moves into the jar card (opens that jar); the challenge becomes a tappable card (active: progress "día X de Y"; none: invitation to start one) that opens `/challenge`.

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S1 | inline | done (RED 8/9 → GREEN 9/9) | see Log |
| T2 | S2 | inline | done (RED missing module → GREEN 6/6) | see Log |
| T3 | S3 | inline | done (RED 3/11 → GREEN 11/11) | see Log |

## Log

- L1 (2026-10-26, user): "30min ponte a trabajar en el nuevo cambio, cuando acabes pasa code review. tienes que hacer tdd tests, trabajo y luego review y cuando acabes haces pr"
- L2: "El nuevo cambio" = the canvas proposal agreed in conversation: before 2 CTAs + 5 tabs, after 1 CTA + 4 tabs; Dinero with summary tiles added after the user asked where Suscripciones was.
- L3: PR #49 (open, restores "Suscrip." as a 6th mobile tab) conflicts with S1; this branch supersedes it. Closing #49 is the user's call.
- L4: T1+T2 in c3c8923; T3 in the next commit. Web suite 46 files / 388 tests green, typecheck and eslint clean.
