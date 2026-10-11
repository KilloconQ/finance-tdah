# Feature: dark mode

## Objective
Add a dark theme to the web app (`apps/web`), selectable as System / Light / Dark, default System.

## Why
Deferred earlier on purpose (`DESIGN.md` said light only). The user asked to bring it forward. Decision confirmed with the user (2026-10-10): selector stored per device in `localStorage`, NOT in the profile.

## Scope
- In: color tokens for dark, theme store, no-flash bootstrap, Settings selector, PWA/meta theme colors, `DESIGN.md` + `ROADMAP.md` updates.
- Out: any DB or shared-schema change (no migration), the landing/promo site (`feature/cadaquien-promo-site`, do NOT touch), per-account sync of the theme.

## Constraints
- All colors already flow through CSS variables in `apps/web/src/index.css`; override them, do not rewrite components. Hardcoded colors/shadows found by audit must move to tokens.
- Keep the warm-neutral + sage identity. No pure black (`#000`) backgrounds, no neon; text contrast must meet WCAG AA (4.5:1) against its surface, including `ink-mid`/`ink-soft` where they carry meaning.
- UI copy in Spanish, identifiers in English.
- Test-first (Vitest + Testing Library, `fake-api.ts` where the API is involved).

## Tasks
- [x] T1 Theme core: dark tokens in `index.css`; `lib/theme.ts` store (`system|light|dark`, localStorage, follows `prefers-color-scheme` live in system mode, `useSyncExternalStore`); inline bootstrap script in `index.html` setting the theme on `<html>` before first paint (no flash); `color-scheme` set so native controls follow. Route: delegated (single writer).
- [ ] T2 Settings selector: Sistema / Claro / Oscuro control in `settings.tsx` using the store; tests. Route: delegated.
- [ ] T3 Audit and polish: replace hardcoded colors/shadows with tokens, dynamic `theme-color` meta (+ manifest note), check every screen in both themes with screenshots; update `DESIGN.md` (dark palette + rules) and `ROADMAP.md` (move from "Más adelante" to Hecho). Route: delegated.

## Acceptance
- Choosing Oscuro/Claro/Sistema changes the whole app immediately and persists across reloads; System follows the OS live.
- No light flash on load in dark mode.
- `pnpm --filter ./apps/web test`, `pnpm typecheck`, `pnpm lint` pass.
- Contrast of text tokens vs surfaces documented in `DESIGN.md`.

## Delivery
Single PR from `feature/dark-mode`, estimated ~350 changed lines. One work-unit commit per task. Push/PR/merge are the user's decisions.

## Progress
Created 2026-10-10.
- T1 done 2026-10-11. A previous worker was lost mid-T1; its uncommitted work was reviewed and kept. Review fix: the bootstrap-script test read `index.html` via `import.meta.url` (not a `file:` URL under jsdom) and `__dirname` (untyped); now uses Vite `?raw`. Observed: `pnpm --filter ./apps/web test` 38 files / 315 tests pass, `pnpm typecheck` ok, `pnpm lint` ok. Dark palette contrast checked (all text tokens >= 4.98:1 on bg/bg-alt/surface; ratios go into DESIGN.md in T3). Route: delegated (single writer), continued by a second worker.
- Note: earlier full-suite failures (timeouts, `findBy*` misses, one ExpenseForm hang) happened only while the machine was at load ~150 from other worktrees; the same files pass in seconds at normal load.
