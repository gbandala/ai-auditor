import * as cheerio from 'cheerio'
import type { CheckResult } from '../types'

function checkCitableContent($: cheerio.CheerioAPI): CheckResult {
  $('script, style, nav, footer').remove()
  const text = $('body').text()
  const percentages = (text.match(/\d+[\.,]?\d*\s*%/g) ?? []).length
  const years = (text.match(/\b20\d{2}\b/g) ?? []).length
  const parenSources = (text.match(/\([A-Z][^)]{3,40}\)/g) ?? []).length
  const factualNumbers = (text.match(/\b\d+[\.,]?\d*\s*(millones?|mil|usuarios?|clientes?|estudios?|países|empresas?|USD|EUR)\b/gi) ?? []).length
  const signals = percentages + years + parenSources + factualNumbers
  if (signals === 0) {
    return { name: 'contenido citable', status: 'fail', detail: 'Sin estadísticas, fechas, fuentes ni datos factuales detectados', recommendation: 'Incluye datos cuantificables: porcentajes, años, fuentes entre paréntesis, cifras con contexto.', score: 0, maxScore: 8 }
  } else if (signals < 3) {
    return { name: 'contenido citable', status: 'warn', detail: `Señales citables escasas: ${signals} (${percentages} %, ${years} años, ${parenSources} fuentes)`, recommendation: 'Agrega más datos verificables: estadísticas con fuente, años de referencia, cifras de impacto.', score: 4, maxScore: 8 }
  } else {
    return { name: 'contenido citable', status: 'pass', detail: `Buenas señales citables: ${signals} (${percentages} %, ${years} años, ${parenSources} fuentes)`, score: 8, maxScore: 8 }
  }
}

function checkQaDensity($: cheerio.CheerioAPI): CheckResult {
  const QUESTION_RE = /(\?|¿|^(how|what|why|when|where|which|who|does|is|are|can|should|will)\s)/i
  const headings = $('h1, h2, h3, h4').toArray()
  const questionHeadings = headings.filter(el => QUESTION_RE.test($(el).text().trim()))
  const hasFaqSchema = $('script[type="application/ld+json"]').toArray().some(el => {
    try { return JSON.stringify(JSON.parse($(el).html() ?? '')).includes('FAQPage') } catch { return false }
  })
  const hasDetailsSummary = $('details').length > 0
  const hasFaqClass = $('[class*="faq" i], [id*="faq" i]').length > 0
  const faqSignals = (hasFaqSchema ? 1 : 0) + (hasDetailsSummary ? 1 : 0) + (hasFaqClass ? 1 : 0)
  const total = questionHeadings.length + faqSignals
  if (total === 0) {
    return { name: 'q&a density', status: 'fail', detail: 'Sin preguntas en headings ni estructuras FAQ detectadas', recommendation: 'Agrega secciones FAQ: headings interrogativos, details/summary o FAQPage en JSON-LD.', score: 0, maxScore: 8 }
  } else if (questionHeadings.length === 0) {
    return { name: 'q&a density', status: 'warn', detail: `Estructura FAQ detectada (${faqSignals} señal/es) pero sin headings interrogativos`, recommendation: 'Complementa las estructuras FAQ con headings que sean preguntas explícitas.', score: 4, maxScore: 8 }
  } else if (faqSignals === 0) {
    return { name: 'q&a density', status: 'warn', detail: `${questionHeadings.length} heading(s) interrogativo(s) pero sin estructura FAQ`, recommendation: 'Refuerza con details/summary o schema FAQPage para estructura Q&A explícita.', score: 5, maxScore: 8 }
  } else {
    return { name: 'q&a density', status: 'pass', detail: `${questionHeadings.length} headings interrogativos + ${faqSignals} señal(es) FAQ`, score: 8, maxScore: 8 }
  }
}

function checkEeat($: cheerio.CheerioAPI): CheckResult {
  const AUTHORITY_DOMAINS = /\.(gov|edu|org)\b|wikipedia\.org|pubmed\.ncbi|nature\.com|forbes\.com|reuters\.com|bbc\.com|harvard\.edu|mit\.edu/i
  const externalLinks = $('a[href]').toArray()
    .map(el => $(el).attr('href') ?? '')
    .filter(href => href.startsWith('http') && AUTHORITY_DOMAINS.test(href))
  const hasAuthorMeta = $('meta[name="author"]').length > 0
  const hasAuthorRel = $('[rel="author"]').length > 0
  const hasJsonldAuthor = $('script[type="application/ld+json"]').toArray().some(el => {
    try { return JSON.stringify(JSON.parse($(el).html() ?? '')).includes('"author"') } catch { return false }
  })
  const hasAuthorText = /\b(por|by)\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/.test($('body').text())
  const authorSignals = (hasAuthorMeta ? 1 : 0) + (hasAuthorRel ? 1 : 0) + (hasJsonldAuthor ? 1 : 0) + (hasAuthorText ? 1 : 0)
  const hasTimeTag = $('time[datetime]').length > 0
  const hasDatePublished = $('script[type="application/ld+json"]').toArray().some(el => {
    try { return JSON.stringify(JSON.parse($(el).html() ?? '')).includes('datePublished') } catch { return false }
  })
  const dateSignals = (hasTimeTag ? 1 : 0) + (hasDatePublished ? 1 : 0)
  const total = externalLinks.length + authorSignals + dateSignals
  if (total === 0) {
    return { name: 'e-e-a-t', status: 'fail', detail: 'Sin señales de autoridad, autoría ni fecha detectadas', recommendation: 'Agrega links a fuentes autoritativas, autoría visible y fecha de publicación en JSON-LD.', score: 0, maxScore: 10 }
  } else if (total < 3) {
    return { name: 'e-e-a-t', status: 'warn', detail: `Señales E-E-A-T escasas: ${externalLinks.length} links autoritativos, ${authorSignals} autoría, ${dateSignals} fecha`, recommendation: 'Fortalece las señales: cita fuentes externas reconocidas, muestra autoría explícita y fecha de actualización.', score: 5, maxScore: 10 }
  } else {
    return { name: 'e-e-a-t', status: 'pass', detail: `E-E-A-T OK: ${externalLinks.length} links autoritativos, ${authorSignals} señal/es autoría, ${dateSignals} señal/es fecha`, score: 10, maxScore: 10 }
  }
}

function tokenize(text: string): Set<string> {
  const STOPWORDS = new Set(['de', 'la', 'el', 'en', 'y', 'a', 'que', 'es', 'the', 'of', 'and', 'in', 'to', 'is', 'for', 'on', 'with', 'by'])
  return new Set(text.toLowerCase().replace(/[^a-záéíóúñüa-z0-9\s]/gi, ' ').split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w)))
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  const intersection = [...a].filter(x => b.has(x)).length
  return intersection / new Set([...a, ...b]).size
}

function checkSemanticDensity($: cheerio.CheerioAPI): CheckResult {
  const h1Text = $('h1').first().text().trim()
  $('script, style, nav, footer, header').remove()
  const bodyText = $('body').text()
  if (!h1Text) {
    return { name: 'densidad semántica', status: 'fail', detail: 'Sin H1 — no se puede calcular densidad semántica', recommendation: 'Agrega un H1 con los términos clave del contenido para maximizar coherencia semántica.', score: 0, maxScore: 6 }
  }
  const similarity = jaccard(tokenize(h1Text), tokenize(bodyText))
  if (similarity < 0.04) {
    return { name: 'densidad semántica', status: 'fail', detail: `Baja coherencia semántica H1↔cuerpo: Jaccard=${similarity.toFixed(3)}`, recommendation: 'Los términos del H1 aparecen poco en el cuerpo. Desarrolla el contenido alrededor de los conceptos del título principal.', score: 0, maxScore: 6 }
  } else if (similarity < 0.08) {
    return { name: 'densidad semántica', status: 'warn', detail: `Coherencia semántica moderada: Jaccard=${similarity.toFixed(3)}`, recommendation: 'Refuerza la presencia de los términos clave del H1 en subtítulos, párrafos de apertura y conclusiones.', score: 3, maxScore: 6 }
  } else {
    return { name: 'densidad semántica', status: 'pass', detail: `Buena coherencia semántica H1↔cuerpo: Jaccard=${similarity.toFixed(3)}`, score: 6, maxScore: 6 }
  }
}

export function checkGeo(html: string): CheckResult[] {
  return [
    checkCitableContent(cheerio.load(html)),
    checkQaDensity(cheerio.load(html)),
    checkEeat(cheerio.load(html)),
    checkSemanticDensity(cheerio.load(html)),
  ]
}
