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
  La voz quedó **congelada** (PR #16): `SpeechRecognition` no funciona en web apps de iOS (ni PWA ni Chrome en iPhone), así que no se ofrece hasta tener las apps nativas. Los componentes de voz y `/expenses/voice` siguen en el código.
- Password reset self-service vía Resend (PR #4).
- Fix de sign-in bloqueado por credenciales opcionales faltantes (PR #5).
- Dots del daily-check desbordando la card + input de días del reto reseteándose al borrar (`4d8256e`).
- UI de edición para cuentas (ya existía) / gastos / metas / suscripciones — PR #7, mergeado a main,
  rama borrada. Gastos necesitó además el endpoint `PATCH /expenses/:id` con reversión de saldo
  neta por cuenta, hecho con TDD real. Deuda que quedó (documentada en
  `odd/tasks/edit-ui-goals-subs-expenses.md`) ya cerrada: tests de las ramas de error y de ownership
  contra Postgres real, y el lock contra ediciones concurrentes — que resultó un bug real (dos
  ediciones simultáneas o editar mientras se borra desviaban el saldo), ya corregido. Descartado a propósito: "sin cuenta" en un gasto — decisión de
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
  Una cuenta nunca puede quedarse con menos dinero que sus cajitas: además de gastos y transferencias,
  editar el saldo a mano por debajo de lo apartado se rechaza (422, `PATCH /accounts` toma el mismo lock de
  la cuenta que las cajitas y los gastos). Si una cuenta ya quedó así antes de esa regla, la UI sigue
  avisando "apartaste más de lo que tiene la cuenta" y se puede editar hacia lo que sus cajitas tienen.
  Corrige de paso un bug latente: un PATCH solo con el nombre ponía el saldo en $0 (Zod 4 conserva el
  `default(0)` bajo `.partial()`); la web no lo sufría porque su formulario siempre manda el saldo.
  Lo que está en cajitas cuenta como **bloqueado**: se resta de "Tu dinero realmente disponible" y la
  barra/tarjetas lo muestran aparte (`lockedInEnvelopesCents`); el patrimonio neto no cambia.
  Y no se puede gastar (como en Nu): un gasto, transferencia, edición o borrado de ingreso que se coma
  dinero de cajitas se rechaza con 422 hasta que lo liberes (`spendsLockedMoney`). Pagar desde una cajita
  gasta su propio dinero; si se pasa, el exceso sale de lo libre, nunca de otra cajita. Las cuentas sin
  cajitas pueden seguir quedando en negativo.
- Recordatorio diario "¿gastaste algo hoy?": push a la hora que elija el usuario (default 9 pm, en su
  zona horaria) solo si ese día no anotó nada, una vez por día. Lo corre un intervalo dentro de la API
  cada 5 min (`services/daily-reminder.ts`); el día se reclama con un UPDATE condicional, así que dos
  procesos no lo mandan doble. Ajustes también explica cómo activar avisos en iPhone (pantalla de inicio).
- CI para PRs (`.github/workflows/ci.yml`): typecheck, lint y tests en cada PR y push a `main`, con un Postgres 17 de servicio para que los tests de integración (cajitas, gastos, recordatorio) corran siempre y no solo si alguien levanta una base. El lint quedó limpio: las reglas de Fast Refresh se desactivan en `src/app/**` (los archivos de ruta de TanStack exportan `Route` junto al componente por diseño) y `TABS` salió de `TabBar.tsx`. Pendiente de activar en GitHub: marcar el check `CI / check` como requerido en la protección de `main`.
- Claves VAPID a prueba de errores: una clave mal puesta (repetida, privada en la línea de la pública, con comillas, truncada o de otro par) ya no tumba la API — `web-push` lanza un error al cargar y eso dejaba a todos sin poder entrar. Ahora `lib/vapid.ts` la valida, apaga solo las notificaciones y el log dice qué revisar; Ajustes avisa en español si la clave que trae la web es inválida.
- Esquemas de actualización sin defaults heredados: un PATCH parcial reescribía campos no enviados porque Zod 4 conserva `.default()` bajo `.partial()` (el saldo de una cuenta → $0, el emoji de una meta → 🌿, la periodicidad de una suscripción → mensual). La web no lo sufría porque sus formularios mandan todo; cualquier otro cliente (las apps nativas) sí. Corregido en cuentas, metas y suscripciones, con una prueba que revisa todos los esquemas de actualización.

## Próximo (gaps conocidos, sin trabajo iniciado)

- Ampliar los tests de `apps/web`: ya cubren la capa de sesión/API, el guard, `ExpenseForm`, `EnvelopesView`, `AccountsView`, Ajustes y los containers de gastos, cuentas, cajitas y metas (con un helper que simula la API, `src/test/fake-api.ts`). Faltan los containers de suscripciones y `queries.ts`.

## Más adelante (diferido a propósito, no por olvido)

- **Modelo de gasto compartido / partner-household**: no existe ningún concepto de "hogar" o pareja en el schema (verificado, cero referencias). Decidido como su propia feature futura, no algo a meter de contrabando en otra tarea.
- **Apps nativas de verdad** (no un wrapper tipo Capacitor): para aprovechar cada plataforma — voz del sistema, widgets, Siri/Atajos y gastos automáticos con Apple Pay, notificaciones nativas, Face ID. Falta decidir entre Swift + Kotlin puro o React Native/Expo con extensiones nativas; en ambos casos hace falta otro método de login (la API usa cookies de sesión) y una Mac con cuenta de Apple Developer para iOS. Es una fase separada; hasta entonces la voz sigue congelada.
- **Dark mode**: fuera de alcance del rediseño actual (`DESIGN.md` es light-only por decisión de diseño).

## Cómo se prioriza

1. Cerrar lo que ya está a medias antes de abrir features nuevas (la voz espera a las apps nativas, no se retoma en la web).
2. Tapar gaps de UI sobre endpoints que ya existen (edición) antes de features de negocio nuevas.
3. Decisiones de producto grandes (hogar compartido, nativo) esperan a que el usuario las confirme explícitamente — no se asumen.
