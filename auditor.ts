import { writeFileSync } from 'node:fs'
import { checkRobots } from './checks/robots.ts'
import { checkLlms } from './checks/llms.ts'
import { checkSitemap } from './checks/sitemap.ts'
import { checkMeta } from './checks/meta.ts'
import { checkContent } from './checks/content.ts'
import { checkPerformance } from './checks/performance.ts'
import { checkGeo } from './checks/geo.ts'
import { generateHtml } from './reporter.ts'
import type { DomainAudit, PageAudit, RecommendationItem, CheckResult } from './types.ts'

// --- CLI args ---
const args = process.argv.slice(2)
const rawUrl = args.find(a => a.startsWith('http'))
const pagesFlag = args.indexOf('--pages')
const maxPages = pagesFlag !== -1 ? (parseInt(args[pagesFlag + 1]) || 10) : 10
const noVerify = args.includes('--no-verify')

// Bypass SSL certificate validation for sites with self-signed or invalid certs
if (noVerify) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

if (!rawUrl) {
  console.error('Uso: npx tsx auditor.ts <url> [--pages N]')
  console.error('Ejemplo: npx tsx auditor.ts https://clariifica.com --pages 5')
  process.exit(1)
}

// Normalize URL
const baseUrl = rawUrl.replace(/\/$/, '')
let domain: string
try {
  domain = new URL(baseUrl).hostname
} catch {
  console.error(`URL inválida: ${rawUrl}`)
  process.exit(1)
}

// --- Helpers ---
function buildRecommendations(
  domainChecks: CheckResult[],
  pages: PageAudit[]
): RecommendationItem[] {
  const recs: RecommendationItem[] = []

  for (const c of domainChecks) {
    if (c.status !== 'pass' && c.recommendation) {
      recs.push({ priority: c.status === 'fail' ? 'high' : 'medium', status: c.status, check: c.name, text: c.recommendation })
    }
  }

  const seen = new Set<string>()
  for (const page of pages) {
    for (const c of page.checks) {
      if (c.status !== 'pass' && c.recommendation) {
        const key = `${c.name}:${page.url}`
        if (!seen.has(key)) {
          seen.add(key)
          recs.push({ priority: c.status === 'fail' ? 'high' : 'medium', status: c.status, check: c.name, page: new URL(page.url).pathname, text: c.recommendation })
        }
      }
    }
  }

  return recs.sort((a, b) => {
    const order = { fail: 0, warn: 1, pass: 2 }
    return order[a.status] - order[b.status]
  })
}

// --- Main ---
async function main() {
  console.log(`\n🔍 AI Readability Audit — ${domain}`)
  console.log(`   URL: ${baseUrl}`)
  console.log(`   Máx páginas: ${maxPages}\n`)

  // Domain-level checks
  process.stdout.write('   Verificando robots.txt...')
  const robotsCheck = await checkRobots(baseUrl)
  console.log(` ${robotsCheck.status === 'pass' ? '✅' : robotsCheck.status === 'warn' ? '⚠️' : '❌'}`)

  process.stdout.write('   Verificando llms.txt...')
  const llmsCheck = await checkLlms(baseUrl)
  console.log(` ${llmsCheck.status === 'pass' ? '✅' : llmsCheck.status === 'warn' ? '⚠️' : '❌'}`)

  process.stdout.write('   Verificando sitemap.xml...')
  const { check: sitemapCheck, urls: sitemapUrls } = await checkSitemap(baseUrl, maxPages)
  console.log(` ${sitemapCheck.status === 'pass' ? '✅' : sitemapCheck.status === 'warn' ? '⚠️' : '❌'}`)

  const domainChecks = [robotsCheck, llmsCheck, sitemapCheck]

  // Page URLs: from sitemap or fallback to homepage
  const pageUrls = sitemapUrls.length > 0 ? sitemapUrls : [baseUrl]
  console.log(`\n   Auditando ${pageUrls.length} página(s)...`)

  const pages: PageAudit[] = []
  for (const url of pageUrls) {
    process.stdout.write(`   ${url.replace(baseUrl, '') || '/'} ...`)
    let html = ''
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
      html = await res.text()
    } catch {
      console.log(' (no accesible, omitida)')
      continue
    }

    const metaChecks = checkMeta(html)
    const contentChecks = checkContent(html)
    const { responseTime, checks: perfChecks } = await checkPerformance(url)

    const geoChecks = checkGeo(html)
    const allChecks = [...metaChecks, ...contentChecks, ...perfChecks, ...geoChecks]
    const score = allChecks.reduce((sum, c) => sum + c.score, 0)
    const maxScore = allChecks.reduce((sum, c) => sum + c.maxScore, 0)

    pages.push({ url, score, maxScore, responseTime, checks: allChecks })
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
    console.log(` ${pct}/100`)
  }

  // Global score calculation
  const domainScore = domainChecks.reduce((sum, c) => sum + c.score, 0)
  const domainMaxScore = domainChecks.reduce((sum, c) => sum + c.maxScore, 0)

  const avgPageScore = pages.length > 0
    ? pages.reduce((sum, p) => sum + p.score, 0) / pages.length
    : 0
  const avgPageMaxScore = pages.length > 0
    ? pages.reduce((sum, p) => sum + p.maxScore, 0) / pages.length
    : 0

  const globalScore = Math.round(domainScore + avgPageScore)
  const globalMaxScore = domainMaxScore + Math.round(avgPageMaxScore)

  const recommendations = buildRecommendations(domainChecks, pages)

  const audit: DomainAudit = {
    domain,
    inputUrl: baseUrl,
    date: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    globalScore,
    globalMaxScore,
    domainChecks,
    pages,
    recommendations
  }

  // Write report
  const safeDomain = domain.replace(/\./g, '-')
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `audit-report-${safeDomain}-${dateStr}.html`

  const html = generateHtml(audit)
  writeFileSync(filename, html, 'utf-8')

  const globalPct = globalMaxScore > 0 ? Math.round((globalScore / globalMaxScore) * 100) : 0
  console.log(`\n✨ Reporte generado: ${filename}`)
  console.log(`   Score global: ${globalPct}/100`)
  console.log(`   Abre el archivo en tu browser y usa Cmd+P para exportar a PDF.\n`)
}

main().catch(e => {
  console.error('Error:', e)
  process.exit(1)
})
