# Payment calendar: card payments, subscriptions and income, on web and iOS
Objective: a calendar of what must be paid and what is coming in, plus a way to register payroll ("nómina") and other one-off or recurring income ("cobros").
Branch: feat/payment-calendar (stacked on feat/ios-app). Delivery strategy: ask-on-risk. Test runners: Vitest (api, shared, web), Swift Testing (Kit, app).

## Specs
- S1: "quiero poder ver un calendario de cuando tiene que pagar las tarjetas de crideto, las suscripciones" — a calendar showing the payment date of every credit card and the charge date of every subscription.
- S2: "quiere poder poner cuando le toca la nómina o cobros así que habria que meter eso de alguna manera" — the user can register income (payroll, other payments owed to her) with when it arrives, and it shows on the calendar. Assumption: frequency is once / weekly / every 14 days / semimonthly (15th and last day) / monthly; the amount is optional; it only reminds, it never creates a movement by itself.
- S3: "en la web y en ios" — both clients.
- S4: "en ios se ponga chicos los iconos de la barra, es algo nuevo creo que he visto en la app de instagram" — the iOS tab bar becomes compact like Instagram's. Assumption: the iOS 26 behavior that shrinks the bar while scrolling (`tabBarMinimizeBehavior`); earlier iOS keeps the normal bar.
- S5 (assumption): the server computes the events (`GET /api/calendar?from&to`) so web and iOS cannot disagree; a new "Calendario" tab on both.

## Tasks
- [ ] T1 (S1,S2,S5) API: shared domain for calendar events, `scheduled_income` table + migration, `/incomes` CRUD, `GET /calendar` — route: inline — Risk: item 1 (additive migration)
- [ ] T2 (S1,S2,S3) Web: calendar page, income forms, navigation — route: inline
- [ ] T3 (S1,S2,S3) iOS: Kit models/services/rules, calendar screen, income forms, new tab — route: inline
- [ ] T4 (S4) iOS: compact tab bar — route: inline
- [ ] T5 Close: full test pass, README/docs, cleanup — route: inline

## Log
- L1 (2026-11-21, user): "la perra de mi novia quiero poder ver un calendario de cuando tiene que pagar las tarjetas de crideto, las suscripciones, por lo visto quiere poder poner cuando le toca la nómina o cobros así que habria que meter eso de alguna manera. en la web y en ios, aparte de eso yo quiero que en ios se ponga chicos los iconos de la barra, es algo nuevo creo que he visto en la app de instagram"
