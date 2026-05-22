# Deploy — auditor.clariifica.com

## Estado actual

✅ Desplegado en producción vía Docker + GitHub Actions + VPS Hetzner.

Pipeline: `.github/workflows/docker-build.yml`  
Build context: `./web` (este directorio)  
URL: https://auditor.clariifica.com

## Secrets de GitHub Actions requeridos

`github.com/gbandala/ai-auditor` → Settings → Secrets → Actions:

| Secret | Valor |
|--------|-------|
| `VPS_HOST` | IP del servidor |
| `VPS_USER` | Usuario SSH |
| `VPS_SSH_KEY` | Clave SSH privada |

## Variables de entorno en el servidor

`/etc/ai-auditor.env` (chmod 600):

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
```

## Docker run (referencia)

El workflow ejecuta automáticamente:

```bash
docker run -d \
  --name ai-auditor \
  --restart unless-stopped \
  --network dokploy-network \
  --dns 8.8.8.8 --dns 8.8.4.4 \
  -e NODE_ENV=production -e PORT=3000 \
  --label "traefik.enable=true" \
  --label "traefik.http.routers.ai-auditor.rule=Host(\`auditor.clariifica.com\`)" \
  --label "traefik.http.routers.ai-auditor.entrypoints=websecure" \
  --label "traefik.http.routers.ai-auditor.tls.certresolver=letsencrypt" \
  --label "traefik.http.services.ai-auditor.loadbalancer.server.port=3000" \
  --env-file /etc/ai-auditor.env \
  ghcr.io/gbandala/ai-auditor:latest
```

## Migración futura a Postgres en VPS

Cuando se abandone Supabase, el único archivo a tocar es `web/lib/supabase.ts`:
swapear `createClient` de `@supabase/supabase-js` por `postgres.js` o `pg`
apuntando a la instancia Postgres del VPS.
