# Open signup + RevenueCat billing

Objective: open registration, charge through RevenueCat (web + iOS) except allowlisted users, hide the paywall in dev/local, onboarding per platform, admin stats.
Branch: `feat/open-signup-billing`. Delivery: ask-on-risk. Test runner: Vitest (`pnpm test`; integration needs `TEST_DATABASE_URL`).

## Specs

- **S1:** "las invitaciones ya no tienen que ser la única manera de entrar, que cualquira se pueda meter." Sign-up is open; invitations stay as a way to invite people.
- **S2:** "el onboarding se tiene que hacer para cada medio." Onboarding completion is tracked per platform (web, ios).
- **S3:** "mételo revenue cat para web y para ios, en dev/local hay que hacer que no salga." RevenueCat on both clients; no paywall in dev/local (server decides: `GET /api/billing/status.required`).
- **S4:** "quiero que los que estén en allow list no tengan que pagar por ahora." `ALLOWED_EMAILS` never pay.
- **S5:** "no se si necesito algo de admin para poder medir lo que sea, caidas, bugs, lo que se te ocurra." Admin stats endpoint + page; crash/bug reporting is a separate decision (Sentry).

Assumptions: one entitlement (`pro`), hard paywall (402) when billing is on; billing is on only in production with `REVENUECAT_WEBHOOK_AUTH` set; admins = `ADMIN_EMAILS`; existing onboarded users are backfilled as done on web only.

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 API: open signup, per-platform onboarding, billing webhook/status/gate, admin stats | S1-S5 | inline | done (integration tests not run locally: no Postgres server) | see git log |
| T2 Web: paywall (purchases-js), platform header, per-platform onboarding, admin page | S2-S5 | inline | pending | — |
| T3 iOS: purchases-ios, paywall, platform header, onboarding | S2-S4 | inline | pending | — |
| T4 Crash/bug reporting (Sentry) | S5 | inline | pending, needs user decision | — |

## Log

- L1 (2026-11-23): "mételo revenue cat para web y para ios, en dev/local hay que hacer que no salga. las invitaciones ya no tienen que ser la única manera de entrar, que cualquira se pueda meter. el onboarding se tiene que hacer para cada medio. quiero que los que estén en allow list no tengan que pagar por ahora en lo que se me ocurre algo. no se si necesito algo de admin para poder medir lo que sea, caidas, bugs, lo que se te ocurra."
