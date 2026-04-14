import type { CheckResult, Fetcher } from '../types'

export interface SitemapResult {
  check: CheckResult
  urls: string[]
}

function parseUrls(xml: string): { url: string; hasLastmod: boolean }[] {
  const entries: { url: string; hasLastmod: boolean }[] = []
  const urlBlocks = xml.match(/<url>([\s\S]*?)<\/url>/g) ?? []
  for (const block of urlBlocks) {
    const locMatch = block.match(/<loc>(.*?)<\/loc>/)
    if (!locMatch) continue
    entries.push({ url: locMatch[1].trim(), hasLastmod: /<lastmod>/.test(block) })
  }
  return entries
}

export async function checkSitemap(baseUrl: string, maxPages: number, fetcher: Fetcher = fetch): Promise<SitemapResult> {
  let xml: string
  try {
    const res = await fetcher(`${baseUrl}/sitemap.xml`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) {
      return { check: { name: 'sitemap.xml', status: 'fail', detail: 'No encontrado', recommendation: 'Crea /sitemap.xml con todas las URLs del sitio.', score: 0, maxScore: 10 }, urls: [] }
    }
    xml = await res.text()
  } catch {
    return { check: { name: 'sitemap.xml', status: 'fail', detail: 'No accesible', recommendation: 'Crea /sitemap.xml en tu sitio.', score: 0, maxScore: 10 }, urls: [] }
  }
  const entries = parseUrls(xml)
  if (entries.length === 0) {
    return { check: { name: 'sitemap.xml', status: 'warn', detail: 'Existe pero sin URLs válidas (<loc>)', recommendation: 'Agrega entradas <url><loc>...</loc></url> al sitemap.', score: 5, maxScore: 10 }, urls: [] }
  }
  const allHaveLastmod = entries.every(e => e.hasLastmod)
  const urls = entries.slice(0, maxPages).map(e => e.url)
  if (!allHaveLastmod) {
    return { check: { name: 'sitemap.xml', status: 'warn', detail: `Existe con ${entries.length} URLs pero algunas sin <lastmod>`, recommendation: 'Agrega <lastmod> a cada URL para indicar cuándo fue actualizada.', score: 7, maxScore: 10 }, urls }
  }
  return { check: { name: 'sitemap.xml', status: 'pass', detail: `Válido con ${entries.length} URLs y <lastmod> en todas`, score: 10, maxScore: 10 }, urls }
}
