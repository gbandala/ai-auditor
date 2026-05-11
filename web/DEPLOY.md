# Despliegue en VPS (Dockploy + Traefik)

## Cambios ya aplicados
- `output: 'standalone'` en `next.config.js`
- `Dockerfile` multi-stage
- `.dockerignore`
- Header `X-Accel-Buffering: no` en la ruta SSE `/api/audit` (para que Traefik no bufferice el stream)

## Checklist antes del primer deploy

### 1. Dockploy — Environment Variables
No hay vars `NEXT_PUBLIC_*`, todas son de runtime:

| Variable | Notas |
|---|---|
| `SUPABASE_URL` | Dashboard → Settings → API |
| `SUPABASE_SERVICE_KEY` | Dashboard → Settings → API → service_role |

### 2. Dockploy — General
- [ ] Build context: directorio `web/` del repo
- [ ] Puerto interno: `3000`

## Migración futura a Postgres en VPS
Cuando se abandone Supabase, el único archivo a tocar es `web/lib/supabase.ts`:
swapear `createClient` de `@supabase/supabase-js` por `postgres.js` o `pg`
apuntando a la instancia Postgres del VPS.
