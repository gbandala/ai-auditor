import * as cheerio from 'cheerio'
import type { CheckResult } from '../types.ts'

export function checkMeta(html: string): CheckResult[] {
  const $ = cheerio.load(html)
  const results: CheckResult[] = []

  // Title
  const title = $('title').text().trim()
  if (!title) {
    results.push({ name: 'title', status: 'fail', detail: 'Sin <title>', recommendation: 'Agrega un <title> descriptivo de menos de 60 caracteres.', score: 0, maxScore: 8 })
  } else if (title.length > 60) {
    results.push({ name: 'title', status: 'warn', detail: `<title> demasiado largo (${title.length} chars, máx 60): "${title.slice(0, 50)}..."`, recommendation: 'Acorta el título a menos de 60 caracteres para mejor indexación.', score: 4, maxScore: 8 })
  } else {
    results.push({ name: 'title', status: 'pass', detail: `<title> correcto (${title.length} chars): "${title}"`, score: 8, maxScore: 8 })
  }

  // Meta description
  const desc = $('meta[name="description"]').attr('content')?.trim()
  if (!desc) {
    results.push({ name: 'meta description', status: 'fail', detail: 'Sin <meta name="description">', recommendation: 'Agrega <meta name="description" content="..."> de menos de 160 caracteres.', score: 0, maxScore: 8 })
  } else if (desc.length > 160) {
    results.push({ name: 'meta description', status: 'warn', detail: `Descripción muy larga (${desc.length} chars, máx 160)`, recommendation: 'Acorta meta description a menos de 160 caracteres.', score: 4, maxScore: 8 })
  } else {
    results.push({ name: 'meta description', status: 'pass', detail: `Meta description correcta (${desc.length} chars)`, score: 8, maxScore: 8 })
  }

  // Open Graph
  const ogTitle = $('meta[property="og:title"]').attr('content')
  const ogDesc = $('meta[property="og:description"]').attr('content')
  const ogImage = $('meta[property="og:image"]').attr('content')
  const ogCount = [ogTitle, ogDesc, ogImage].filter(Boolean).length
  if (ogCount === 0) {
    results.push({ name: 'open graph', status: 'fail', detail: 'Sin meta tags Open Graph', recommendation: 'Agrega og:title, og:description y og:image para mejor presentación en redes y herramientas de IA.', score: 0, maxScore: 10 })
  } else if (ogCount < 3) {
    const missing = [!ogTitle && 'og:title', !ogDesc && 'og:description', !ogImage && 'og:image'].filter(Boolean)
    results.push({ name: 'open graph', status: 'warn', detail: `Open Graph incompleto — faltan: ${missing.join(', ')}`, recommendation: `Agrega los meta tags faltantes: ${missing.join(', ')}`, score: 5, maxScore: 10 })
  } else {
    results.push({ name: 'open graph', status: 'pass', detail: 'og:title, og:description y og:image presentes', score: 10, maxScore: 10 })
  }

  // JSON-LD
  const jsonld = $('script[type="application/ld+json"]').first().html()
  if (!jsonld) {
    results.push({ name: 'json-ld', status: 'fail', detail: 'Sin JSON-LD / Schema.org', recommendation: 'Agrega <script type="application/ld+json"> con schema.org para que las IAs entiendan el tipo de contenido.', score: 0, maxScore: 12 })
  } else {
    try {
      JSON.parse(jsonld)
      results.push({ name: 'json-ld', status: 'pass', detail: 'JSON-LD presente y válido', score: 12, maxScore: 12 })
    } catch {
      results.push({ name: 'json-ld', status: 'warn', detail: 'JSON-LD presente pero con JSON inválido', recommendation: 'Corrige el JSON en el bloque <script type="application/ld+json">.', score: 6, maxScore: 12 })
    }
  }

  // Schema.org @type validation (GEO-relevant types)
  const GEO_TYPES = ['Article', 'FAQPage', 'Organization', 'Product', 'HowTo', 'BreadcrumbList', 'WebSite', 'WebPage', 'LocalBusiness', 'BlogPosting']
  const allJsonldScripts = $('script[type="application/ld+json"]')
  const foundTypes: string[] = []

  allJsonldScripts.each((_i, el) => {
    try {
      const parsed = JSON.parse($(el).html() ?? '')
      const nodes = Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed]
      for (const node of nodes) {
        if (node['@type']) {
          const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']]
          foundTypes.push(...types)
        }
      }
    } catch { /* invalid JSON already caught by json-ld check */ }
  })

  if (foundTypes.length === 0) {
    results.push({ name: 'schema types', status: 'fail', detail: 'Sin JSON-LD o sin @type declarado', recommendation: 'Declara @type en tu JSON-LD. Para GEO usa: Article, FAQPage, Organization, Product, HowTo, WebSite.', score: 0, maxScore: 8 })
  } else {
    const geoMatches = foundTypes.filter(t => GEO_TYPES.includes(t))
    if (geoMatches.length === 0) {
      results.push({ name: 'schema types', status: 'warn', detail: `@type encontrado (${foundTypes.join(', ')}) pero ninguno es tipo GEO relevante`, recommendation: `Usa al menos uno de: ${GEO_TYPES.slice(0, 6).join(', ')}. Los LLMs priorizan estos tipos para citar contenido.`, score: 3, maxScore: 8 })
    } else {
      results.push({ name: 'schema types', status: 'pass', detail: `Tipos GEO válidos: ${geoMatches.join(', ')}`, score: 8, maxScore: 8 })
    }
  }

  return results
}
