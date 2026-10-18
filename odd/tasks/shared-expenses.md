# Gastos compartidos (hogar / grupo)

## Objetivo
Que varias personas (grupos de N, no solo parejas) lleven gastos en común y la app diga quién le
debe a quién, **sin mezclar sus finanzas personales**. Estilo Splitwise, dentro de finance-tdah.

## Decisiones ya tomadas (confirmadas por el usuario)
- **Solo gastos compartidos con reparto.** Cada quien conserva sus cuentas, cajitas, metas y
  suscripciones privadas. No hay "cuentas del hogar" ni patrimonio común.
- **Grupos de N personas** (familia, roomies, pareja). Nada de asumir 2.
- **Sin `ALLOWED_EMAILS`**: se elimina la variable; el registro es abierto y una invitación aceptada
  no depende de ninguna lista (rama `claude/remove-allowed-emails`).
- **Moneda única: peso mexicano (MXN).** Sin campo de moneda por hogar.
- **Sin paywall por ahora.** El módulo compartido es gratis; el cobro se decide después.
- iOS nativo es una fase posterior y su stack (Expo vs Swift) se decide después. Consecuencia para
  este trabajo: todo lo nuevo debe vivir en la API + Zod compartido, sin lógica solo-web.

## Modelo (propuesta, a validar)
Todo en centavos enteros, como el resto del schema. Una sola moneda para toda la app: MXN.

- `household` — id, name, createdBy, createdAt.
- `household_member` — householdId, userId, role (`owner` | `member`), joinedAt. Único (householdId, userId).
- `household_invite` — id, householdId, email, tokenHash, expiresAt, acceptedAt. Se guarda el hash, nunca el token.
- `shared_expense` — id, householdId, paidByUserId, amountCents, description, category, occurredOn,
  splitMode (`equal` | `exact` | `percent` | `shares`), createdBy, createdAt, updatedAt.
- `shared_expense_share` — sharedExpenseId, userId, shareCents. **Invariante: la suma de shares = amountCents.**
- `settlement` — id, householdId, fromUserId, toUserId, amountCents, occurredOn, createdBy.
  Un pago entre miembros que salda deuda (no es un gasto).

**El balance no se guarda, se deriva**: para cada miembro, `pagado − su parte + liquidaciones recibidas − enviadas`.
Guardarlo es la clase de bug que ya vimos con los saldos de cuentas (ediciones concurrentes). Se calcula en
una función pura en `packages/shared/src/domain` y se prueba sola.

### Reparto sin perder centavos
`amountCents / N` rara vez es entero. Método del resto mayor: cada quien recibe `floor`, y los centavos
que sobran se reparten de uno en uno de forma determinista (orden estable por userId) para que dos
clientes calculen exactamente lo mismo. En `exact`/`percent`/`shares` la API **valida** que sumen;
no las "arregla" en silencio.

### Simplificar deudas
Vista "quién le paga a quién" con el mínimo de transferencias (greedy sobre saldos netos). Es solo
presentación: las liquidaciones reales las registra la gente.

## Reglas de permisos
- Solo miembros ven un hogar; nunca ven nada personal de otro miembro (cuentas, gastos propios, metas).
- Cualquier miembro agrega gastos y liquidaciones. Editar/borrar: quien lo creó, quien pagó, o el owner.
- Invitar y quitar miembros: owner. Salirse: cualquiera, **bloqueado si su saldo ≠ 0** (hay que saldar primero).
- Un `shared_expense` solo puede repartirse entre miembros actuales del hogar (validado en la ruta, no solo en la UI).
- Escrituras de dinero toman lock sobre la fila del `household` (`SELECT … FOR UPDATE`), igual que cuentas/cajitas.
- Borrado: hard delete del gasto y sus shares (consistente con gastos personales). Las liquidaciones no se editan, se borran.

## Invitaciones
Registro abierto, así que no hay allowlist que sortear. La invitación es un **link con token al portador**
(quien lo tiene entra), porque se comparte por WhatsApp/SMS/lo que sea y ahí no hay email que comparar.
- Token aleatorio de un solo uso que vence; solo se guarda su hash. Rate limit al crear y aceptar.
- El owner (y quien invitó) puede revocarlo, ve quién se unió y puede quitar a un miembro.
- **Compartir**: el botón "Invitar" usa el menú nativo del teléfono (`navigator.share`) con respaldo a
  `https://wa.me/?text=…` y a copiar el link. Sale desde la cuenta de quien invita; la app no integra WhatsApp
  Business API ni SMS (costo, plantillas aprobadas, verificación; no se justifica en v1).
- **Email desde la app (opcional)**: Resend con el remitente de prueba solo entrega al correo del dueño de la
  cuenta; para invitar a terceros hace falta un dominio propio verificado. Mientras no exista, queda solo el link.
- El token debe sobrevivir al registro, al login y al onboarding (se guarda en el cliente hasta aceptar).
- **Miembro pendiente (propuesto, falta confirmar)**: poder repartir un gasto con alguien que aún no se une,
  como en Splitwise. Implica `household_member.userId` nullable + nombre visible y reclamarlo al aceptar.

## Integración con las finanzas personales (fuera de v1)
v1 es un libro aparte: un gasto compartido **no toca** tus cuentas. Vincularlo ("pagué $900 desde mi
tarjeta BBVA") obliga a decidir qué se descuenta de tu cuenta (el total que pagaste, no solo tu parte)
y cómo entran/salen las liquidaciones (¿ingreso/transferencia?). Es su propia tarea, después de v1.

## Fases (cada una con TDD en api/shared)
- [x] **F1 — Dominio puro** (`packages/shared`): hecho con TDD (rojo observado antes de implementar).
  `domain/split.ts` (`computeShares`: equal/shares/percent/exact, resto mayor, determinista, errores tipados),
  `domain/debts.ts` (`computeBalances`, `simplifyDebts`), `schemas/household.ts` (hogar, gasto compartido,
  liquidación; los update sin `.default()` y sumados a `update-schemas.test.ts`). Los participantes son ids de
  texto, así que el miembro pendiente no obliga a cambiar nada aquí. Verificado rompiendo a propósito el
  reparto del resto y el signo de las liquidaciones: 9 tests fallan. Fuera de F1 a propósito: invitaciones
  (F3) y la validación de que los participantes sean miembros (la hace la ruta).
- [ ] **F2 — Esquema y migración**: tablas anteriores + índices; `pnpm db:generate`.
- [ ] **F3 — API** (`apps/api`): hogares, miembros, invitaciones, gastos, liquidaciones, balances.
  Tests de integración contra Postgres real (`TEST_DATABASE_URL`): aislamiento entre hogares, permisos,
  salida con saldo ≠ 0, concurrencia de dos gastos simultáneos, share de alguien que no es miembro → 422.
- [ ] **F4 — Web**: pantallas de hogar (lista, detalle con balances y "quién paga a quién", agregar gasto
  con selector de reparto, liquidar, invitar). Mobile-first según `DESIGN.md`; tests como el resto de pantallas.
- [ ] **F5 — Avisos push** al agregar un gasto o una liquidación (reusa `push-sender`; respeta que push puede estar apagado).

## Preguntas abiertas
Ninguna que bloquee F1–F3. Pendiente más adelante: cuándo y qué lleva paywall.

## Nota sobre cobrar en iOS (para planificar, no es parte de esta tarea)
Apple exige que lo digital que se vende dentro de la app use su compra integrada (suscripción vía StoreKit),
con comisión del 15–30 %; el cobro con Stripe/web desde la app tiene reglas específicas que cambian por región.
Habrá que decidir cuándo llegue el momento. Por ahora nada lleva paywall; cuando se decida, conviene un concepto de
"plan/entitlement" por usuario en la API en vez de asumir que todos son gratis.
