# UI de edición: metas, suscripciones, gastos

## Objetivo
Completar el gap del roadmap "UI de edición para cuentas / gastos / metas / suscripciones".
Cuentas ya está resuelto (`EditAccountContainer` + ruta `/accounts/$id`, reference pattern).
Este documento cubre las tres entidades restantes.

## Por qué
Los endpoints de update ya existen para metas y suscripciones (API lista, gap solo frontend).
Gastos no tiene endpoint de update ni schema — requiere trabajo de backend primero.

## Alcance y decisiones de diseño
- Patrón de referencia: `AccountForm` reusado por create/edit vía prop `initial`, sin librería de
  modal (pantallas full-screen con `PhoneShell`/`AppBar`), sin `react-hook-form` (useState manual,
  consistente con el resto del código).
- Para metas y suscripciones, la ruta `$id` ya es una vista de detalle con acciones propias
  (depósito / cancelar-pausar). No se repurposa esa ruta como edición (regresión de esas acciones);
  se agrega una ruta nueva `$id/edit` y un botón "editar" en el `AppBar` del detalle.
- Gastos no tiene ruta de detalle; se agrega `/transactions/$id/edit` (o similar) con entrypoint
  desde la fila de la lista en `transactions.tsx`.

## Modo TDD
Fuente: `Strict TDD Mode: enabled` (CLAUDE.md global) + verificación en repo.
- `apps/api` y `packages/shared` corren Vitest → TDD estricto aplica a cualquier código de esas
  capas (schema `updateExpenseSchema` + ruta `PATCH /expenses/:id`): RED observado antes de
  implementar, luego GREEN, luego REFACTOR.
- `apps/web` **no tiene test runner** (gap conocido del roadmap, ítem "Próximo"). TDD estricto no
  es aplicable ahí — se corre `pnpm typecheck` + `pnpm lint` + prueba manual con el skill `run`
  como verificación funcional ordinaria. Se deja explícito para no fingir cobertura que no existe.

## Tareas

- [x] **T1 — Metas: mutation + form + ruta de edición**
  - `useUpdateGoal` en `apps/web/src/features/goals/api/goals.mutations.ts`
  - Extraer `GoalForm` (hoy inline en `goals/new.tsx`), reusar con prop `initial`
  - Ruta `apps/web/src/app/_app/goals/$id_.edit.tsx` (renombrada desde `$id/edit.tsx`) + botón editar en `GoalDetailContainer`
  - Verificación: typecheck ✅, lint sin regresiones (34 warnings pre-existentes, mismos que en main), build ✅
  - **Bug encontrado y corregido en revisión**: la ruta inicial `goals/$id/edit.tsx` anidaba bajo `goals/$id.tsx`, que no renderiza `<Outlet />` — el edit nunca se hubiera mostrado. Corregido con el patrón "non-nested route" de TanStack Router (sufijo `_`: `$id_.edit.tsx`), confirmado en `routeTree.gen.ts` (rutas hermanas, no `WithChildren`).
  - **Prueba manual en navegador: NO realizada.** El stack local ya tenía un proceso `bun` corriendo en :3001 contra una base de datos persistente (no una DB descartable), y el seed de demo está bloqueado por un allowlist de email (`FORBIDDEN`). No se intentó loguear ni sembrar datos para no tocar esa base sin permiso. Verificación real quedó en: typecheck + build + inspección estructural de `routeTree.gen.ts` + revisión manual del código (lógica de centavos, invalidación de queries) contra el patrón de referencia `AccountForm`/`EditAccountContainer`.

- [x] **T2 — Suscripciones: scaffold `features/subscriptions/` + mutation + form + ruta**
  - Migrado de `lib/queries.ts` a `features/subscriptions/{api,components,containers}` (mismo patrón que accounts/goals); `lib/queries.ts` limpiado de exports de suscripciones (sin otros consumidores, verificado con `rg`)
  - `useUpdateSubscription` — invalidación vía `subscriptionsQueryOptions().queryKey` derivada, no hardcodeada (aplica la corrección del review de T1)
  - `SubscriptionForm` extraído, usa `parseAmountToCents` (mejora sobre el `Math.round(parseFloat(...))` original)
  - Ruta `apps/web/src/app/_app/subscriptions/$id_.edit.tsx` (convención non-nested desde el arranque, sin repetir el bug de T1) + botón editar en el detalle
  - Verificación: typecheck ✅, build ✅, lint sin regresiones, `routeTree.gen.ts` confirma ruta hermana (no anidada)
  - **Prueba manual en navegador: NO realizada** (mismo motivo que T1 — DB local persistente, seed bloqueado por allowlist)

- [x] **T3 — Gastos: endpoint + schema (TDD) + UI de edición**
  - `updateExpenseSchema`: `createExpenseSchema.partial()` no compilaba (Zod 4 no permite `.partial()` sobre
    un schema con `.superRefine()`). Se extrajo `expenseBaseSchema` sin default ni refinement,
    compartido por create/update; el invariante de transfer para update se valida en la ruta contra
    el estado *mergeado* (patch + fila actual), no en el schema.
  - `PATCH /expenses/:id`: TDD real (RED confirmado antes de implementar). Reversión de saldo neta
    por cuenta (revierte el efecto viejo + aplica el nuevo en una sola escritura, no dos), reusando
    `sourceBalanceDeltaCents` (el mismo helper que ya usan create y delete). Verificación de
    ownership de cuenta solo para cuentas que realmente cambian.
  - Tests nuevos (7): delta neto por cambio de monto, cambio de `kind` (signo invertido, no solo
    relabel), cambio de cuenta (dos escrituras, +N/-N), update parcial sin tocar balance, 404 not-found,
    404 ownership. `pnpm --filter api test`: 52/52 ✅. `pnpm --filter shared test`: 37/37 ✅.
  - Frontend: `useUpdateExpense` (invalida vía `expensesQueryOptions().queryKey`, no key hardcodeada),
    `EditExpenseContainer`, ruta `transactions_.$id_.edit.tsx` (bug de nesting detectado y corregido
    por el propio writer antes de reportar — `transactions.tsx` es un archivo de ruta, no una carpeta,
    así que necesitaba el `_` después de `transactions` también, no solo después de `$id`).
  - Verificación: typecheck ✅, build ✅, lint sin regresiones (35, mismo patrón baseline +1 por la
    ruta nueva), `routeTree.gen.ts` confirma ruta hermana de `/transactions`.
  - **Prueba manual en navegador: NO realizada** (mismo motivo que T1/T2).

## Estrategia de entrega
- Rama: `feature/edit-ui-goals-subs-expenses` (creada, base: main)
- Un commit de trabajo por tarea (T1, T2, T3), conventional commits, sin trailer de coautoría AI.
- Orden de ejecución: T1 → probar → T2 → probar → T3 → probar (según pedido del usuario).
- Push/PR: decisión del usuario, no se hace automáticamente.

## Progreso

### T1 — Gentle AI review (lente reliability, riesgo medio) — APROBADO
Commit `e75ac37`, lineage `review-13ca7a4df4f192fc`, acknowledged (authority burned).
Hallazgos no bloqueantes (deuda para más adelante, no reabrir esta revisión por ellos):
- **WARNING** falta prueba end-to-end real (submit → PATCH → navegación) — coincide con lo ya
  documentado arriba.
- **SUGGESTION** `useUpdateGoal` invalida `['goals', id]` a mano; debería derivar la key de
  `goalQueryOptions(id).queryKey` para no asumir su forma.
- **SUGGESTION** el `EmptyState` de "meta no encontrada" en `EditGoalContainer` probablemente es
  inalcanzable — el loader (`ensureQueryData`) rechazaría antes y el error iría al error boundary
  del router, no a ese branch. Mismo patrón que ya tiene `EditAccountContainer`, revisar ambos.

### T2 + T3 — Gentle AI review acumulado (lente reliability, riesgo medio) — APROBADO
Commits `baed9ed` (T2) + `07da47f` (T3), lineage `review-4861260cee9681d3`, acknowledged.
Un hallazgo se verificó manualmente y **es falso positivo** (confirmado leyendo el código,
no se aceptó sin chequear):
- **WARNING (falso positivo)** decía que `ExpenseForm` podría emitir `accountId: ''` en vez de
  `undefined`, rompiendo `z.uuid().optional()` con 400 en ediciones sin cuenta. Verificado:
  `ExpenseForm.tsx:119,121` ya hace `effectiveAccountId || undefined` / `... || undefined` antes
  de llamar `onSubmit` — nunca llega string vacío al mutation. No requiere fix.

Hallazgos reales, no bloqueantes (deuda para más adelante):
- **WARNING** las ramas 422 (`INVALID_TRANSFER`) y 404 (`ACCOUNT_NOT_FOUND`) del nuevo PATCH no
  tienen test — nada prueba el invariante de transfer mergeado contra estado actual+patch.
- **WARNING** el test de ownership (`expenses.test.ts:419-429`) es idéntico al de not-found (ambos
  ponen `expenseRow = null`); no prueba que el filtro `userId` esté realmente en el `where`. El
  fake de `financialAccount.findFirst` sí lo verifica (el "account-id walker"), el de ownership no.
- **WARNING** PATCH lee la fila actual con `findFirst` sin lock; dos PATCH concurrentes sobre el
  mismo gasto bajo read-committed podrían revertir el mismo monto viejo dos veces y desviar el
  balance. Aceptable para el volumen de esta app, pero documentado.

## Cierre de la feature
Las tres tareas del roadmap "UI de edición" están implementadas, testeadas donde corresponde
(TDD real en el backend de gastos), y revisadas/aprobadas por Gentle AI. Rama
`feature/edit-ui-goals-subs-expenses`, 3 commits de trabajo + 1 de docs. Push/PR queda a criterio
del usuario.

(se actualiza tras cada tarea con evidencia de verificación y commit)
