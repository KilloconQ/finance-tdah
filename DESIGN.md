# finance-tdah — Design System & Redesign Brief

Status: active redesign (2026-07-19). This file is the contract for the professional,
mobile-first **and** responsive pass. Screens must look intentional on phone, tablet,
and desktop — not a phone column stretched across a wide screen.

Product: Spanish-language personal finance app for people with ADHD. Calm, warm,
low-cognitive-load. Light and dark themes (System / Light / Dark, default System — see §8).

---

## 1. What was wrong (baseline audit)

- **Everything capped at `max-w-3xl` centered** → desktop shows a thin strip in ~60% dead
  whitespace, plus a visible grey gutter (background-color mismatch between the centered
  `PhoneShell` and the `main` behind it).
- **Accounts screen renders no list** in default "Simple" density — only a number + a
  stacked bar. Outright broken.
- **Panic screen** still shows the sidebar (not a real takeover) and is unreachable.
- **Split accent system**: brand is sage green, but every *selected/active* state is pure
  black (`bg-ink`). Reads unfinished.
- **No type scale**: dozens of one-off `text-[13px]`, `[13.5px]`, `[11px]`, `[15px]`.
- **Wireframe residue**: monospace money everywhere, UPPERCASE tracked micro-labels,
  identical monogram avatars, grey `$0` placeholders, outlined jar.
- **`flex-1` spacer → bottom-docked CTA** pattern on every screen (fine on phone, wrong on
  desktop where it strands buttons at the viewport bottom).
- Only `md:` breakpoints — 768→1440 never re-adapts. No empty/loading states.

## 2. Layout & responsive model (the core fix)

**App shell (`_app.tsx`)**: sidebar (md+) + `main`. Unify backgrounds so there is NO visible
gutter: sidebar `bg-surface`, main `bg-bg`. Each page renders inside a shared content
container, left-aligned, that grows with the viewport:

```
container = "mx-auto w-full max-w-[1080px] px-4 sm:px-6 lg:px-8"
```

- `PhoneShell` is repurposed as this responsive page container (keep the name to avoid churn,
  or introduce `<Page>`). It must NOT cap content at a phone width on desktop.
- `narrow` variant (auth / focused forms) stays a centered `max-w-[440px]` column.

**Kill the `flex-1` spacer → docked CTA on ≥md.** On desktop, primary actions sit inline
near the content (top-right of the page header, or directly under the hero), never pinned to
the viewport bottom. On mobile the docked CTA + bottom TabBar stay.

**Lists become responsive:**
- Cards (accounts, goals): `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`.
- Row lists (transactions, subscriptions): constrain the ROW content to `max-w-2xl` (or a
  2-column layout on `lg`) so the label and amount don't fly to opposite screen edges.

**Overlays**: creation flows and the Panic takeover are true overlays — `fixed inset-0 z-50`,
covering the sidebar. Panic is a full-screen crisis mode, not an embedded page.

## 3. Design tokens (in `index.css`)

Keep the warm-neutral + sage palette. Changes:

- **Accent is the only selection color.** Remove every `bg-ink`/black active state; selected =
  `bg-accent-bg text-accent-strong` (soft) or `bg-accent text-surface` (strong).
- **Stacked "cuánto tienes" bar**: `libre` = `accent` (the hero/positive), `frascos` =
  `accent-bg`/muted sage, `deuda` = `danger`. No black.
- **Radius scale**: cards `rounded-2xl`, buttons/inputs `rounded-xl`, chips/pills
  `rounded-full`. Be consistent.
- **Elevation**: `shadow-card` (resting surfaces) and `shadow-soft` (overlays/menus) only.
- **Type scale** — replace ad-hoc `text-[Npx]` with a semantic scale (Tailwind defaults are
  fine; add display sizes if needed):
  - display / hero number: `text-5xl sm:text-6xl font-semibold tracking-tight`, tabular nums
  - page title: `text-xl font-semibold tracking-tight`
  - section label: `text-sm font-medium text-ink-mid` (normal case — retire UPPERCASE tracked
    micro-labels, or keep ONE subtle `text-xs uppercase tracking-wide text-ink-soft` used
    sparingly)
  - body: `text-sm` / `text-[15px]`→`text-base`; secondary `text-ink-mid`
- **Money**: sans font with `font-variant-numeric: tabular-nums` (`.money` utility). Drop
  `wf-mono` for monetary values. Real values, never grey `$0` placeholder styling.

## 4. Components

- **PageHeader** (replaces the ambiguous `AppBar`): left-aligned title on md+, optional
  subtitle, right-aligned real icon button(s) ≥44px (`h-11 w-11 rounded-xl hover:bg-bg-alt`).
  Back arrow only on detail/sub pages (`/accounts/new`, `/goals/$id`, …), never on top-level
  tabs.
- **Btn**: min height `h-11` (44px tap target), `text-sm font-medium`, radius `rounded-xl`.
  Keep kinds primary/ghost/danger; `primary`=sage.
- **Card**: `rounded-2xl border border-line bg-surface shadow-card`, padding `p-4 sm:p-5`.
- **Chip**: pill, selected = sage (never black).
- **Money**: sans tabular.
- **Skeleton** + **EmptyState**: add. Lists/dashboard show a pulse skeleton while loading and
  a friendly empty state ("Aún no tienes cuentas — agrega la primera").
- **Subscription avatar**: colored initial circle with a deterministic color derived from the
  name (so Apple TV+ ≠ Audible), not identical grey monograms.

## 5. Wiring fixes (fold into the redesign of each screen)

1. **Panic** (`app/_app/panic.tsx`): remove hardcoded `$840` / fake action savings; drive from
   real data (overspend vs week target). Make it a full-screen overlay. The "Activar alerta"
   no-op (`navigate('/')`) → a real action or remove. Add an entry point (a discreet trigger
   on the dashboard / header) so it's reachable.
2. **Challenge "Saltar"** (`app/_app/challenge.tsx`): wire to `POST /challenges/:id/fail` via a
   new mutation in `queries.ts`.
3. **Dashboard "reto" stat** (`app/_app/index.tsx`): use real `activeChallengeQuery`
   (`doneDays/days`), not the hardcoded `"3/7 🔥"`.
4. Minor/deferred (document, don't necessarily build): edit/delete affordances for
   accounts/expenses/goals/subs (endpoints exist, no UI); voice capture stub stays as-is.

## 6. Screen targets (desktop especially)

- **Dashboard**: 2-col on lg — left: greeting + hero "hoy puedes gastar" + week box (visible on
  mobile too, not `hidden md:block`) + inline quick actions; right: goal jar in a card + mini
  stats. Fill the width; no bottom-stranded CTA on desktop.
- **Accounts**: ALWAYS render the account list (card grid). Keep the "cuánto tienes" summary +
  bar on top, then the accounts. Fix the black bar segment.
- **Subscriptions**: keep the strong list; colored avatars; constrain row width; sage labels.
- **Transactions**: constrain row width; one category-icon system (emoji), consistent.
- **Goals**: card grid; show `$current / $target` on cards by default; hide the numeric keypad
  on md+ in `goals/new`.
- **Auth / onboarding**: `narrow` centered card; no stranded bottom CTA.

## 7. Out of scope now

Real brand logos for subscriptions, household/shared accounts, edit/delete UI for
existing records (endpoints exist — follow-up), voice transcription (stub stays).

---

## 8. Dark theme

Same warm-neutral + sage identity, not an inversion. `index.css` holds both palettes: light values
in `@theme`, dark overrides in `:root[data-theme='dark']`. Components only use tokens, so a theme
swap never touches them.

**Mechanics**
- Preference `system | light | dark` (default `system`) lives in `localStorage` key
  `finance-tdah:theme`, per device on purpose, never in the profile. Store: `lib/theme.ts`.
- `system` follows `prefers-color-scheme` live; Light/Dark ignore the OS.
- An inline script in `index.html` sets `<html data-theme>` and `color-scheme` before first paint
  (no light flash). Its rules and `THEME_COLORS` must match `lib/theme.ts` and the `--color-bg`
  tokens; `lib/theme.test.tsx` fails if they drift.
- `<meta name="theme-color">` follows the resolved theme. The PWA manifest cannot (one static
  value): it stays light, so a dark-mode user sees a light splash when launching the installed app.
- Selector: Ajustes → Apariencia (Sistema / Claro / Oscuro).

**Rules for new UI**
- Colors come from tokens only. No hex/`rgb()`/Tailwind palette colors (`bg-white`, `text-gray-*`)
  and no fixed shadows. Per-item colors (e.g. subscription avatars) set only a hue and let a class
  in `index.css` choose lightness per theme (`.avatar-tint`).
- Never pure black or pure white: dark background is warm charcoal `#151412`.
- Text uses `ink`, `ink-mid` or `ink-soft`. `ink-ghost` is decoration only (borders, dividers, icons),
  never text, and is not used for text today (placeholders use `ink-soft`). Data fills (bar segments) use `accent-muted`, not `accent-bg`
  (a faint tint for backgrounds behind text).
- Selected = `accent-bg` + `accent-strong` (soft) or `accent` + `surface` (strong), as in light.

**Dark palette**

| Token | Value | Token | Value |
|---|---|---|---|
| `bg` / `canvas` | `#151412` | `accent` | `#8fa881` |
| `bg-alt` | `#1c1b19` | `accent-strong` | `#a9c19b` |
| `surface` | `#201f1c` | `accent-bg` | `#262e20` |
| `line` / `line-soft` | `#36342f` / `#2b2a26` | `accent-muted` | `#4b5b42` (light `#c9d6bf`) |
| `ink` | `#ece9e3` | `warn` / `warn-bg` | `#d8a876` / `#33291d` |
| `ink-mid` | `#b0ada6` | `danger` / `danger-bg` | `#dc9494` / `#3b2727` |
| `ink-soft` | `#908d86` | `good` / `good-bg` | `#8db39f` / `#212f28` |
| `ink-ghost` | `#5c5a54` (decorative) | | |

**Contrast (WCAG 2.x, text needs 4.5:1)** — computed from the token values with the relative
luminance formula.

| Pair (foreground on background) | Dark | Light |
|---|---|---|
| `ink` on `bg` / `surface` | 15.19 / 13.60 | 15.95 / 16.66 |
| `ink-mid` on `bg` / `bg-alt` / `surface` | 8.22 / 7.68 / 7.36 | 5.18 / 4.92 / 5.41 |
| `ink-soft` on `bg` / `bg-alt` / `surface` | 5.56 / 5.20 / 4.98 | 2.45 / 2.32 / 2.56 |
| `accent-strong` on `bg` / `accent-bg` | 9.46 / 7.22 | 5.11 / 4.53 |
| `accent` on `bg` / `surface` | 7.09 / 6.35 | 3.90 / 4.07 |
| `surface` on `accent` (primary button) | 6.35 | 4.07 |
| `warn` on `bg` / `warn-bg` | 8.58 / 6.63 | 2.97 / 2.68 |
| `danger` on `bg` / `danger-bg` | 7.63 / 5.78 | 4.07 / 3.50 |
| `good` on `bg` / `good-bg` | 7.96 / 6.05 | 3.64 / 3.26 |
| Avatar initial on its tint (worst hue of 360) | 5.98 | 4.85 |

Dark: every text token passes AA on every surface it is used on (lowest: `ink-soft` on `surface`,
4.98). Light: the pairs below 4.5 are **pre-existing and unchanged** by the dark-mode work, which
only fixed the avatar initials (lightness 34% → 30%, was 3.95 at yellow hues). Known light-theme
debt: `ink-soft` hints/captions (2.3–2.6), `warn`, `good`, `danger` and `accent` as small text, and
the primary button label. Fixing them means darkening those light tokens, a visual change to the
light theme that needs its own decision.
