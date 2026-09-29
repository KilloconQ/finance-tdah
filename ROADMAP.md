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
- Sesión robusta (PR #9 y #10): el rate limit por IP compartida ya no desloguea a todo el hogar;
  un fallo al comprobar la sesión (429, 5xx, offline) muestra una pantalla de error con
  "Reintentar" en vez de mandar a sign-in; la sesión se cachea (5 min) en vez de pedirse en cada
  navegación, y se sincroniza entre pestañas vía `BroadcastChannel`.
- `AbortError` / `Failed to fetch` en consola del guard de auth al navegar rápido después de
  guardar: resuelto por la caché de sesión de PR #10 (el guard ya no hace fetch en cada
  navegación ni usa la señal de abort del router). Verificado con Playwright: guardar gasto +
  navegación rápida con sesión forzada a stale, y recarga a mitad del check — cero errores en
  consola.
- Suite de tests en `apps/web` (Vitest + jsdom + Testing Library): errores de auth, `fetchValidated`
  y el 401, caché de sesión, reset de caché entre usuarios, `auth-client`, el guard `_app` y las
  reglas de `ExpenseForm`. Verificada rompiendo a propósito 11 comportamientos clave: todos hacen fallar algún test.
- Cajitas (envelope budgeting): dinero apartado dentro de una cuenta para algo (tabla `envelope`, ruta
  `/api/envelopes`, pantalla `/accounts/$id/envelopes`). Decisiones de producto: entidad aparte de los
  frascos; una cajita vive en una sola cuenta; un gasto puede salir opcionalmente de una cajita y la
  descuenta (si se pasa queda en negativo, no se bloquea); lo apartado nunca supera el saldo de la
  cuenta (bloqueado con `SELECT … FOR UPDATE` sobre la cuenta); las tarjetas de crédito no llevan cajitas.
  Si el saldo baja por gastos sin cajita o por editar la cuenta, la UI avisa "apartaste más de lo que
  tiene la cuenta" en vez de bloquear el registro.
  Lo que está en cajitas cuenta como **bloqueado**: se resta de "Tu dinero realmente disponible" y la
  barra/tarjetas lo muestran aparte (`lockedInEnvelopesCents`); el patrimonio neto no cambia.
  Y no se puede gastar (como en Nu): un gasto, transferencia, edición o borrado de ingreso que se coma
  dinero de cajitas se rechaza con 422 hasta que lo liberes (`spendsLockedMoney`). Pagar desde una cajita
  gasta su propio dinero; si se pasa, el exceso sale de lo libre, nunca de otra cajita. Las cuentas sin
  cajitas pueden seguir quedando en negativo.

## Próximo (gaps conocidos, sin trabajo iniciado)

- Ampliar los tests de `apps/web` a las pantallas y hooks de mutación (`features/*/containers`, `queries.ts`); hoy cubren la capa de sesión/API, el guard, `ExpenseForm` y `EnvelopesView`.
- CI para PRs (typecheck + test + lint, con un Postgres para los tests de integración de cajitas). Hoy el único workflow es el deploy.

## Más adelante (diferido a propósito, no por olvido)

- **Modelo de gasto compartido / partner-household**: no existe ningún concepto de "hogar" o pareja en el schema (verificado, cero referencias). Decidido como su propia feature futura, no algo a meter de contrabando en otra tarea.
- **Wrapper nativo (Capacitor)**: para widget de pantalla de inicio y voz/push más confiables que en navegador. El usuario mostró interés, pero es una fase separada.
- **Dark mode**: fuera de alcance del rediseño actual (`DESIGN.md` es light-only por decisión de diseño).

## Cómo se prioriza

1. Cerrar lo que ya está a medias (voz + push) antes de abrir features nuevas.
2. Tapar gaps de UI sobre endpoints que ya existen (edición) antes de features de negocio nuevas.
3. Decisiones de producto grandes (hogar compartido, nativo) esperan a que el usuario las confirme explícitamente — no se asumen.
