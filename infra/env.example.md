# `.env` template

Copiar a la raíz como `.env` antes de levantar `docker compose`.

```dotenv
# --- Postgres ---
POSTGRES_USER=finance
POSTGRES_PASSWORD=changeme-en-prod
POSTGRES_DB=finance_tdah

# --- API ---
# 32+ chars. Generá uno con: openssl rand -base64 48
BETTER_AUTH_SECRET=cambiame-por-uno-de-al-menos-32-caracteres

# El registro es abierto. Estos emails no pagan (por ahora), separados por coma.
ALLOWED_EMAILS=vos@ejemplo.com,tu-novia@ejemplo.com
# Quienes pueden abrir /api/admin (estadísticas).
ADMIN_EMAILS=vos@ejemplo.com

# --- RevenueCat ---
# Secreto que RevenueCat manda en el header Authorization del webhook
# (POST {PUBLIC_URL}/api/billing/webhook). Sin esto, o fuera de producción, nadie ve paywall.
REVENUECAT_WEBHOOK_AUTH=
# Entitlement que desbloquea la app (el mismo nombre que en el dashboard de RevenueCat).
REVENUECAT_ENTITLEMENT_ID=pro
# Public SDK key de la app Web Billing de RevenueCat. Va al build del web (hay que rebuildear si cambia).
REVENUECAT_WEB_KEY=

# --- Public URL ---
# El dominio público que Cloudflare Tunnel va a exponer
PUBLIC_URL=https://finance.tu-dominio.com

# --- Cloudflare Tunnel ---
# Token (Zero Trust → Networks → Tunnels → Create tunnel)
CLOUDFLARE_TUNNEL_TOKEN=eyJ...

# --- Para dev local sin docker ---
DATABASE_URL=postgres://finance:changeme-en-prod@localhost:5432/finance_tdah
BETTER_AUTH_URL=http://localhost:3001
WEB_ORIGIN=http://localhost:5173
PORT=3001

# --- Resend (password reset) --- OPCIONAL
# Si queda vacío, el reset por email queda deshabilitado (la API avisa al arrancar).
# La API arranca igual: nunca bloquea el login.
RESEND_API_KEY=
RESEND_FROM_EMAIL=onboarding@resend.dev

# --- Web Push (notificaciones) --- OPCIONAL
# Si quedan vacías, las push quedan deshabilitadas. La API arranca igual.
# Generá un par con: bun -e "console.log(JSON.stringify(require('web-push').generateVAPIDKeys()))"
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:soporte@finance-tdah.local

# --- Push nativo del iPhone (APNs) --- OPCIONAL
# Hace falta una cuenta de Apple Developer. Si quedan vacías, la app de iOS funciona igual pero sin notificaciones.
# En developer.apple.com > Keys, creá una clave con "Apple Push Notifications service (APNs)" y descargá el .p8.
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_BUNDLE_ID=app.cadaquien.ios
APNS_PRIVATE_KEY=
```

## Notas
- `BETTER_AUTH_SECRET`: cambialo siempre antes de prod. Tirá una variable distinta entre `staging` y `prod`.
- `PUBLIC_URL`: tiene que matchear el hostname público del tunnel.
- `CLOUDFLARE_TUNNEL_TOKEN`: ver `infra/cloudflared/README.md`.
- `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`: **una sola línea cada una, sin comillas**. La pública tiene 87
  caracteres y empieza con `B`; la privada, 43. Si están mal (repetidas, cambiadas de lugar, truncadas o de
  pares distintos) la API arranca igual con las notificaciones apagadas y el log dice qué línea revisar
  (`docker compose logs api | grep web_push`); la web, si trae una pública inválida, lo avisa en Ajustes.
  Cambiar la pública obliga a recompilar la web (`up -d --build`) y a reactivar las notificaciones en
  cada celular.
- `APNS_KEY_ID` y `APNS_TEAM_ID`: 10 letras y números cada uno (el key id está en el nombre del `.p8`, el team id en
  tu cuenta de Apple Developer). `APNS_PRIVATE_KEY` es el **contenido** del `.p8`; si tu hosting no admite varias
  líneas, pegalo en una sola con `\n` literal. Si están mal, la API arranca igual con las notificaciones del iPhone
  apagadas y el log dice qué revisar (`docker compose logs api | grep apns`). `APNS_BUNDLE_ID` tiene que ser el
  bundle id de la app. Cada iPhone se registra solo contra el servidor correcto: las builds de Xcode usan el
  sandbox de Apple y las de TestFlight / App Store, producción.
- `RESEND_*`, `VAPID_*` y `APNS_*` son **opcionales**: vacías sólo apagan reset-por-email y push.
  `docker-compose.yml` ya las pasa al contenedor `api`, y `VAPID_PUBLIC_KEY` también entra
  al build del web como `VITE_VAPID_PUBLIC_KEY` (hay que rebuildear el web si la cambiás).
- En dev sin docker, sumá un Postgres local (`brew install postgresql@17 && brew services start postgresql@17`) o levantá solo `postgres` con `docker compose up -d postgres`.
