# Calendar notifications: push reminders for income, card cutoff/payment and subscriptions
Objective: push notifications (web push + APNs) before each calendar event, with per-kind options for how many days before and at what hour.
Branch: feat/payment-calendar. Delivery strategy: ask-on-risk. Test runners: Vitest (api, shared, web), Swift Testing (Kit, app).

## Specs
- S1: "que mande notificaciones por favor" — a push notification is sent for calendar events (income, card cutoff, card payment, subscription charge), on every channel the user has (web push, iPhone).
- S2: "que haya opciones de cuando se tienen que mandar las notificaciones" — per kind the user can turn it off and choose how many days before and the hour; on web and iOS (Ajustes).
- S3: "por defecto para día de pago el mismo día en la tarde a las 19:00" — income: 0 days before, 19:00.
- S4: "el día de corte 2 días antes" — card cutoff: 2 days before.
- S5: "el día de pago 4 días antes" — card payment due date: 4 days before.
- S6: "el día de la suscripción 1 día antes por si lo quiere cancelar si es mensual y si es anual 1 semana antes de renovar" — subscription: monthly 1 day before, yearly 7 days before.
- S7 (assumption): the hour for every default other than income is not specified; default 09:00 local time. It is configurable like the rest.
- S8 (assumption): this replaces the old "day-before at the daily reminder hour" subscription push; the charge date still rolls forward. One notification per event, ever (no repeats), delivered once the alert day and hour have arrived.

## Tasks
- [x] T1 (S3-S7) shared: alert rule defaults + `dueAlerts` domain + zod schemas — shared 175 (alerts.test.ts 12 new; one load-flaky timeout in card-subscription.adversarial passes alone and on the base) — commit: see git log
- [x] T2 (S1,S8) API: migration (rules, sent log), rules routes, calendar-alerts service replacing the subscription push, ticking — api 266 with Postgres (calendar-alerts + rules integration, 16 in the two touched files; 2 auth tests timed out under load and pass alone) — commit: see git log
- [x] T3 (S2) web: Ajustes section — web calendar+settings 29 tests, tsc and eslint clean — commit: see git log
- [x] T4 (S2) iOS: Kit model/service + Ajustes section — Kit 149 tests (service by kind, choices), app builds; Ajustes screen not seen in the simulator — commit: see git log

## Log
- L1 (2026-11-21, user): "que mande notificaciones por favor, que haya opciones de cuando se tienen que mandar las notificaciones pero por defecto para día de pago el mismo día en la tarde a las 19:00. el día de corte 2 días antes, el día de pago 4 días antes, el día de la suscripción 1 día antes por si lo quiere cancelar si es mensual y si es anual 1 semana antes de renovar."
