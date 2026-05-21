# Cloudflare Tunnel

Este proyecto usa un **token tunnel** (más simple, sin credentials.json local).

## Setup (una vez)

1. En el dashboard de Cloudflare → **Zero Trust** → **Networks** → **Tunnels** → **Create a tunnel**.
2. Tipo: **Cloudflared**. Nombre: `finance-tdah`.
3. Cloudflare te muestra un **token largo** (`eyJ...`). Copialo a `.env`:
   ```
   CLOUDFLARE_TUNNEL_TOKEN=eyJ...
   ```
4. En **Public Hostnames** del tunnel, agregá:
   - **Subdomain**: `finance` (o el que quieras)
   - **Domain**: tu dominio de Cloudflare
   - **Service**: `http://caddy:80`
   - Path: vacío

5. Levantá todo:
   ```bash
   pnpm docker:up
   ```

6. Tu app va a estar en `https://finance.tu-dominio.com` con TLS gestionado por Cloudflare. El tunnel evita abrir puertos en tu router.

## Notas
- Caddy escucha en `:80` solo dentro de la red interna `ft-internal`.
- Cloudflared se conecta a `caddy:80` y expone públicamente vía el tunnel.
- No hay puertos publicados al host; todo va por el tunnel.
- Para dev local sin tunnel, podés agregar `ports: ["8080:80"]` al servicio `caddy` temporalmente.
