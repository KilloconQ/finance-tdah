# Tarjetas de crédito (corte/pago) y alertas de cobro de suscripciones

Objetivo: fecha de corte y de pago en tarjetas con cálculo de lo que toca pagar, y alertas de cobro de suscripciones.
Rama: `feat/card-statements-subscription-alerts`. Entrega: `ask-on-risk`. Runner: Vitest (`apps/api`, `packages/shared`, `apps/web`); integración con `TEST_DATABASE_URL`.

## Specs

- S1. "para las suscripciones es que tu pones cuando te hacen el cobro de la suscripcion y te manda las alertas". La suscripción ya guarda `nextChargeAt`; se agrega una alerta push antes del cobro.
- S2. "para la tarjetas de crédito tu puedes meter fecha de corte y fecha de pago". Las cuentas `credito` guardan día de corte y día de pago.
- S3. "así puede ir sabiendo cuando te toca pagar". Se muestra la próxima fecha de pago.
- S4. "funciona como en el banco que si compraste entro ta fecha y tal otra, te dice ah pues de los 3mil pesos para la fecha de pago te tocan realmene 1500". Se muestra cuánto de la deuda toca pagar en la próxima fecha de pago: solo las compras hasta el corte.
- S5. "las compras después del corte pasan al siguiente periodo" (respuesta del usuario a la pregunta de producto).

Supuestos (no pedidos por el usuario, a confirmar): alerta de suscripción 1 día antes del cobro, a la hora del recordatorio diario del usuario; al pasar la fecha de cobro, `nextChargeAt` avanza según `cadence`; un pago a la tarjeta (ingreso a la cuenta) después del corte reduce lo que toca pagar; solo se calcula el periodo cerrado más reciente (sin arrastrar saldos de periodos anteriores).

## Tasks

- [x] T1 (S2) shared: columnas `cutoffDay`/`paymentDay` en `financial_account`, schemas create/update (sin `.default()` en update), migración 0011 `card_statement_days`. Ruta: inline.
- [x] T2 (S3, S4, S5) shared: función pura de periodo de tarjeta (fechas + monto del periodo cerrado) con tests. RED (módulo ausente) y luego GREEN 6/6. Ruta: inline.
- [x] T3 (S3, S4) api: `GET /accounts/:id/statement` (422 sin días/no crédito, 404 ajena). Typecheck y suite OK; la prueba de integración `accounts.statement.integration.test.ts` NO se ejecutó (sin Postgres local ni `TEST_DATABASE_URL`); la corre CI. Ruta: inline.
- [x] T4 (S2, S3, S4) web: campos de corte/pago en el formulario y resumen "te toca pagar" en la pantalla de editar cuenta. Web 430/430 antes de las pruebas nuevas; tsc y eslint limpios. Sin prueba manual en navegador. Ruta: inline.
- [x] T5 (S1) api: alerta push de cobro + avance de `nextChargeAt`, con columna de dedupe `last_alerted_for` y migración 0012. RED (funciones ausentes) y luego GREEN; integración corrida contra Postgres desechable: API 179/179 (incluye `accounts.statement` y `subscription-alerts`). Ruta: inline.

## Log

- L1 (2026-11-17): "los cambios son los siguientes, para las suscripciones es que tu pones cuando te hacen el cobro de la suscripcion y te manda las alertas, para la tarjetas de crédito tu puedes meter fecha de corte y fecha de pago y así puede ir sabiendo cuando te toca pagar que, es decir funciona como en el banco que si compraste entro ta fecha y tal otra, te dice ah pues de los 3mil pesos para la fecha de pago te tocan realmene 1500 por ponerte un ejemplo"
- L2 (2026-11-17): "sí, las compras después del corte pasan al siguiente periodo"
- L3: exploración: saldo de crédito se guarda negativo (`packages/shared/src/domain/account.ts:12`); `occurredAt` es la fecha del gasto; `nextChargeAt` solo avanza en `/pause`; recordatorio diario en `apps/api/src/services/daily-reminder.ts`; última migración 0010.

- L4: T3/T5 integración verificada contra un Postgres desechable (puerto 54399, contenedor ya eliminado). T4 sin prueba manual en navegador. Pendiente de confirmar por el usuario: los supuestos de arriba (alerta 1 día antes a la hora del recordatorio, el aviso depende del timer de web push).
