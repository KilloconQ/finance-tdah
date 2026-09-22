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

- [ ] **T2 — Suscripciones: scaffold `features/subscriptions/` + mutation + form + ruta**
  - Migrar de `lib/queries.ts` a `features/subscriptions/{api,components,containers}` (mismo patrón que accounts/goals)
  - `useUpdateSubscription`
  - Extraer `SubscriptionForm` (hoy inline en `subscriptions/new.tsx`)
  - Ruta `apps/web/src/app/_app/subscriptions/$id/edit.tsx` + botón editar en el detalle
  - Verificación: typecheck, lint, prueba manual

- [ ] **T3 — Gastos: endpoint + schema (TDD) + UI de edición**
  - `updateExpenseSchema` en `packages/shared/src/schemas/expense.ts` (partial de `createExpenseSchema`)
  - `PATCH /expenses/:id` en `apps/api/src/routes/expenses.ts` — RED (test primero) → GREEN → REFACTOR
  - `useUpdateExpense` en `apps/web/src/features/expenses/api/expenses.mutations.ts`
  - Ruta edición + entrypoint desde `transactions.tsx`
  - Verificación: `pnpm --filter api test` (nuevo test pasa), typecheck web, prueba manual

## Estrategia de entrega
- Rama: `feature/edit-ui-goals-subs-expenses` (creada, base: main)
- Un commit de trabajo por tarea (T1, T2, T3), conventional commits, sin trailer de coautoría AI.
- Orden de ejecución: T1 → probar → T2 → probar → T3 → probar (según pedido del usuario).
- Push/PR: decisión del usuario, no se hace automáticamente.

## Progreso
(se actualiza tras cada tarea con evidencia de verificación y commit)
