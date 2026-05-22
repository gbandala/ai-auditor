import { createClient } from '@supabase/supabase-js'

// Usar placeholder en build time para que createClient no lance al importarse.
// En runtime siempre habrá vars reales — si no, las queries fallarán con error claro.
export const supabase = createClient(
  process.env.SUPABASE_URL ?? 'http://build-placeholder.invalid',
  process.env.SUPABASE_SERVICE_KEY ?? 'build-placeholder-key'
)
