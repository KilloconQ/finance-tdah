# Roadmap — finance-tdah

Ordenado por prioridad, no por fecha. Basado en lo que ya existe en el repo (código, `odd/tasks/`, `AVANCE-2026-07-19.md`, `DESIGN.md`) y en decisiones ya tomadas con el usuario. Se actualiza a mano cuando cambia el foco.

## Hecho

- Auth (better-auth) + rate limiting en endpoints sensibles + logging estructurado con request IDs.
- Modelo de dinero en centavos, con `expense.kind` (expense/income/transfer) y reversión de balance correcta.
- CRUD de cuentas, gastos, metas ("frascos"), suscripciones, retos ("challenges"), con borrado (soft-archive en metas, hard delete + reversión en gastos).
- Backend refactorizado a vertical slices (casos de uso separados de las rutas HTTP).
- Rediseño mobile-first + responsive (contrato en `DESIGN.md`), con Cuentas y Pánico ya conectados a datos reales.
- Docker dual-mode: `docker compose up -d` local, perfil aparte para exponer vía Cloudflare Tunnel.
- Voz + notificaciones push: `SpeechRecognition` real reemplazó el stub de voz, Web Push con umbral semanal de presupuesto y meta alcanzada (PR #3, mergeado a main).
- Password reset self-service vía Resend (PR #4).
- Fix de sign-in bloqueado por credenciales opcionales faltantes (PR #5).
- Dots del daily-check desbordando la card + input de días del reto reseteándose al borrar (`4d8256e`).
- UI de edición para cuentas (ya existía) / gastos / metas / suscripciones — PR #7, mergeado a main,
  rama borrada. Gastos necesitó además el endpoint `PATCH /expenses/:id` con reversión de saldo
  neta por cuenta, hecho con TDD real. Deuda pendiente (documentada en
  `odd/tasks/edit-ui-goals-subs-expenses.md`): falta test de las ramas de error del PATCH de gastos,
  el test de ownership no prueba de verdad el filtro `userId`, y no hay lock contra ediciones
  concurrentes del mismo gasto. Descartado a propósito: "sin cuenta" en un gasto — decisión de
  producto, todo gasto trackea una cuenta (efectivo = cuenta de efectivo dedicada), no bug.

## Próximo (gaps conocidos, sin trabajo iniciado)

- Arreglar el `AbortError` benigno en consola del guard de auth (`_app.tsx` `beforeLoad`) al navegar rápido después de guardar. No bloquea nada, pero ensucia el log.
- Suite de tests en `apps/web` — hoy no hay test script ahí; API y `packages/shared` sí corren Vitest.

## Más adelante (diferido a propósito, no por olvido)

- **Modelo de gasto compartido / partner-household**: no existe ningún concepto de "hogar" o pareja en el schema (verificado, cero referencias). Decidido como su propia feature futura, no algo a meter de contrabando en otra tarea.
- **Wrapper nativo (Capacitor)**: para widget de pantalla de inicio y voz/push más confiables que en navegador. El usuario mostró interés, pero es una fase separada.
- **Dark mode**: fuera de alcance del rediseño actual (`DESIGN.md` es light-only por decisión de diseño).

## Cómo se prioriza

1. Cerrar lo que ya está a medias (voz + push) antes de abrir features nuevas.
2. Tapar gaps de UI sobre endpoints que ya existen (edición) antes de features de negocio nuevas.
3. Decisiones de producto grandes (hogar compartido, nativo) esperan a que el usuario las confirme explícitamente — no se asumen.
