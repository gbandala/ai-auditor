import type { CheckResult, Fetcher } from '../types'

export interface PerformanceResult {
  responseTime: number
  checks: CheckResult[]
}

export async function checkPerformance(url: string, fetcher: Fetcher = fetch): Promise<PerformanceResult> {
  const start = Date.now()
  let responseTime = 0
  let bodySize = 0
  try {
    const res = await fetcher(url, { signal: AbortSignal.timeout(10000) })
    responseTime = Date.now() - start
    const text = await res.text()
    bodySize = new TextEncoder().encode(text).length
  } catch {
    responseTime = Date.now() - start
  }
  const checks: CheckResult[] = []
  if (responseTime > 3000) {
    checks.push({ name: 'tiempo de respuesta', status: 'fail', detail: `${responseTime}ms (máx recomendado: 2000ms)`, recommendation: 'Optimiza el tiempo de respuesta del servidor. Considera Vercel Edge Functions o CDN caching.', score: 0, maxScore: 3 })
  } else if (responseTime > 2000) {
    checks.push({ name: 'tiempo de respuesta', status: 'warn', detail: `${responseTime}ms (recomendado <2000ms)`, recommendation: 'El tiempo de respuesta está cerca del límite. Revisa el tiempo de renderizado servidor.', score: 1, maxScore: 3 })
  } else {
    checks.push({ name: 'tiempo de respuesta', status: 'pass', detail: `${responseTime}ms`, score: 3, maxScore: 3 })
  }
  const sizeKB = Math.round(bodySize / 1024)
  if (bodySize > 1_000_000) {
    checks.push({ name: 'tamaño de página', status: 'fail', detail: `${sizeKB}KB (máx recomendado: 500KB)`, recommendation: 'El HTML es demasiado grande. Elimina scripts/estilos inline o divide en páginas más pequeñas.', score: 0, maxScore: 2 })
  } else if (bodySize > 500_000) {
    checks.push({ name: 'tamaño de página', status: 'warn', detail: `${sizeKB}KB (recomendado <500KB)`, recommendation: 'El HTML está cerca del límite de tamaño. Considera reducir contenido inline.', score: 1, maxScore: 2 })
  } else {
    checks.push({ name: 'tamaño de página', status: 'pass', detail: `${sizeKB}KB`, score: 2, maxScore: 2 })
  }
  return { responseTime, checks }
}
