import * as cheerio from 'cheerio'
import type { CheckResult } from '../types.ts'

export function checkContent(html: string): CheckResult[] {
  const $ = cheerio.load(html)
  const results: CheckResult[] = []

  // Headings structure
  const h1s = $('h1').length
  const h2s = $('h2').length
  const h3s = $('h3').length
  const hasH3WithoutH2 = h3s > 0 && h2s === 0

  if (h1s === 0) {
    results.push({ name: 'headings', status: 'fail', detail: 'Sin <h1> en la página', recommendation: 'Agrega un <h1> con el título principal — es la señal más importante de estructura para LLMs.', score: 0, maxScore: 10 })
  } else if (h1s > 1) {
    results.push({ name: 'headings', status: 'warn', detail: `${h1s} elementos <h1> (debe ser solo 1)`, recommendation: 'Usa solo un <h1> por página. El resto del contenido debe usar <h2>, <h3>, etc.', score: 5, maxScore: 10 })
  } else if (hasH3WithoutH2) {
    results.push({ name: 'headings', status: 'warn', detail: 'Jerarquía rota: hay <h3> sin <h2> intermedio', recommendation: 'Mantén la jerarquía h1→h2→h3 sin saltar niveles.', score: 6, maxScore: 10 })
  } else {
    results.push({ name: 'headings', status: 'pass', detail: `Estructura correcta: 1 h1, ${h2s} h2, ${h3s} h3`, score: 10, maxScore: 10 })
  }

  // Alt text
  const images = $('img')
  const totalImgs = images.length
  const missingAlt = images.filter((_i, el) => {
    const alt = $(el).attr('alt')
    return alt === undefined || alt.trim() === ''
  }).length

  if (totalImgs === 0) {
    results.push({ name: 'alt text', status: 'pass', detail: 'Sin imágenes — no aplica', score: 7, maxScore: 7 })
  } else if (missingAlt === 0) {
    results.push({ name: 'alt text', status: 'pass', detail: `Todas las imágenes tienen alt (${totalImgs}/${totalImgs})`, score: 7, maxScore: 7 })
  } else if (missingAlt < totalImgs) {
    results.push({ name: 'alt text', status: 'warn', detail: `${missingAlt} de ${totalImgs} imágenes sin alt text`, recommendation: 'Agrega atributo alt descriptivo a todas las imágenes — los LLMs usan alt text para entender el contenido visual.', score: 3, maxScore: 7 })
  } else {
    results.push({ name: 'alt text', status: 'fail', detail: `Todas las imágenes (${totalImgs}) sin alt text`, recommendation: 'Agrega alt text descriptivo a cada imagen.', score: 0, maxScore: 7 })
  }

  // Text ratio — exclude <script> and <style> from denominator to avoid
  // false warns on Next.js pages that embed large __NEXT_DATA__ JSON blobs
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
  $('script, style').remove()
  const strippedSize = $.html().length
  const textSize = bodyText.length
  const ratio = strippedSize > 0 ? (textSize / strippedSize) * 100 : 0

  // Semantic HTML landmarks
  const LANDMARKS = ['main', 'article', 'nav', 'header', 'section', 'aside', 'footer'] as const
  const foundLandmarks = LANDMARKS.filter(tag => $(tag).length > 0)
  const hasMain = $('main').length > 0
  const hasArticle = $('article').length > 0

  if (foundLandmarks.length === 0) {
    results.push({ name: 'semantic html', status: 'fail', detail: 'Sin landmarks semánticos (main, article, nav, header, section)', recommendation: 'Usa elementos HTML5 semánticos: <main> para el contenido principal, <article> para contenido citable, <nav> para navegación.', score: 0, maxScore: 5 })
  } else if (!hasMain && !hasArticle) {
    results.push({ name: 'semantic html', status: 'warn', detail: `Landmarks presentes (${foundLandmarks.join(', ')}) pero sin <main> ni <article>`, recommendation: 'Agrega <main> alrededor del contenido principal y <article> en contenido citable — los LLMs usan estos para delimitar texto citeable.', score: 2, maxScore: 5 })
  } else {
    results.push({ name: 'semantic html', status: 'pass', detail: `Landmarks semánticos: ${foundLandmarks.join(', ')}`, score: 5, maxScore: 5 })
  }

  if (ratio < 5) {
    results.push({ name: 'texto/html ratio', status: 'fail', detail: `Ratio texto/HTML muy bajo: ${ratio.toFixed(1)}% (mín 15%)`, recommendation: 'La página tiene poco texto legible comparado con el código. Agrega más contenido textual.', score: 0, maxScore: 5 })
  } else if (ratio < 15) {
    results.push({ name: 'texto/html ratio', status: 'warn', detail: `Ratio texto/HTML bajo: ${ratio.toFixed(1)}% (recomendado ≥15%)`, recommendation: 'Incrementa el contenido textual o reduce el HTML/scripts inline.', score: 2, maxScore: 5 })
  } else {
    results.push({ name: 'texto/html ratio', status: 'pass', detail: `Ratio texto/HTML bueno: ${ratio.toFixed(1)}%`, score: 5, maxScore: 5 })
  }

  return results
}
