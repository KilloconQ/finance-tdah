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
```

## Notas
- `BETTER_AUTH_SECRET`: cambialo siempre antes de prod. Tirá una variable distinta entre `staging` y `prod`.
- `PUBLIC_URL`: tiene que matchear el hostname público del tunnel.
- `CLOUDFLARE_TUNNEL_TOKEN`: ver `infra/cloudflared/README.md`.
- En dev sin docker, sumá un Postgres local (`brew install postgresql@17 && brew services start postgresql@17`) o levantá solo `postgres` con `docker compose up -d postgres`.
