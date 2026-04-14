import { checkRobots } from './checks/robots'
import { checkLlms } from './checks/llms'
import { checkSitemap } from './checks/sitemap'
import { checkMeta } from './checks/meta'
import { checkContent } from './checks/content'
import { checkPerformance } from './checks/performance'
import { checkGeo } from './checks/geo'
import type { DomainAudit, PageAudit, RecommendationItem, CheckResult } from './types'

export interface AuditProgressEvent {
  type: 'domain' | 'page'
  name: string
  status: 'pass' | 'warn' | 'fail'
  detail?: string
}

function buildRecommendations(domainChecks: CheckResult[], pages: PageAudit[]): RecommendationItem[] {
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
  return recs.sort((a, b) => ({ fail: 0, warn: 1, pass: 2 }[a.status] - { fail: 0, warn: 1, pass: 2 }[b.status]))
}

export async function runAudit(
  baseUrl: string,
  maxPages: number,
  onProgress?: (event: AuditProgressEvent) => void
): Promise<DomainAudit> {
  const domain = new URL(baseUrl).hostname

  const robotsCheck = await checkRobots(baseUrl)
  onProgress?.({ type: 'domain', name: 'robots.txt', status: robotsCheck.status })

  const llmsCheck = await checkLlms(baseUrl)
  onProgress?.({ type: 'domain', name: 'llms.txt', status: llmsCheck.status })

  const { check: sitemapCheck, urls: sitemapUrls } = await checkSitemap(baseUrl, maxPages)
  onProgress?.({ type: 'domain', name: 'sitemap.xml', status: sitemapCheck.status })

  const domainChecks = [robotsCheck, llmsCheck, sitemapCheck]
  const pageUrls = sitemapUrls.length > 0 ? sitemapUrls : [baseUrl]

  const pages: PageAudit[] = []
  for (const url of pageUrls) {
    let html = ''
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
      html = await res.text()
    } catch {
      onProgress?.({ type: 'page', name: url, status: 'fail', detail: 'no accesible' })
      continue
    }

    const metaChecks = checkMeta(html)
    const contentChecks = checkContent(html)
    const { responseTime, checks: perfChecks } = await checkPerformance(url)
    const geoChecks = checkGeo(html)

    const allChecks = [...metaChecks, ...contentChecks, ...perfChecks, ...geoChecks]
    const score = allChecks.reduce((sum, c) => sum + c.score, 0)
    const maxScore = allChecks.reduce((sum, c) => sum + c.maxScore, 0)
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

    pages.push({ url, score, maxScore, responseTime, checks: allChecks })
    const pageStatus = pct >= 80 ? 'pass' : pct >= 60 ? 'warn' : 'fail'
    onProgress?.({ type: 'page', name: url, status: pageStatus, detail: `${pct}/100` })
  }

  const domainScore = domainChecks.reduce((sum, c) => sum + c.score, 0)
  const domainMaxScore = domainChecks.reduce((sum, c) => sum + c.maxScore, 0)
  const avgPageScore = pages.length > 0 ? pages.reduce((sum, p) => sum + p.score, 0) / pages.length : 0
  const avgPageMaxScore = pages.length > 0 ? pages.reduce((sum, p) => sum + p.maxScore, 0) / pages.length : 0
  const globalScore = Math.round(domainScore + avgPageScore)
  const globalMaxScore = domainMaxScore + Math.round(avgPageMaxScore)

  return {
    domain,
    inputUrl: baseUrl,
    date: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    globalScore,
    globalMaxScore,
    domainChecks,
    pages,
    recommendations: buildRecommendations(domainChecks, pages),
  }
}
