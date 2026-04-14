import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkGeo } from '../geo.ts'

// ── Fixture: rich GEO-optimized page ─────────────────────────────────────────
const richHtml = `<!DOCTYPE html><html><head>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","author":{"@type":"Person","name":"Ana García"},"datePublished":"2024-01-01"}</script>
</head><body>
  <article>
    <h1>Cómo mejorar el SEO en 2024: guía completa</h1>
    <p>Por Ana García, experta en marketing digital</p>
    <time datetime="2024-01-15">15 enero 2024</time>
    <h2>¿Qué es el SEO técnico?</h2>
    <p>El SEO técnico mejora el 43% del rendimiento según estudios de 2023 (Google, 2023).
       Más de 1000 empresas han mejorado su visibilidad.</p>
    <h2>¿Cómo implementar cambios?</h2>
    <p>Ver estudios en <a href="https://developers.google.com/search">Google Search Central</a>
       y <a href="https://en.wikipedia.org/wiki/Search_engine_optimization">Wikipedia SEO</a>.</p>
    <details>
      <summary>¿Cuánto tiempo tarda?</summary>
      <p>Entre 3 y 6 meses en casos típicos.</p>
    </details>
  </article>
</body></html>`

// ── Fixture: minimal/bad page ─────────────────────────────────────────────────
const bareHtml = `<!DOCTYPE html><html><head></head><body>
  <div><p>Welcome to our website.</p></div>
</body></html>`

// ── Fixture: partial signals ──────────────────────────────────────────────────
const partialHtml = `<!DOCTYPE html><html><head></head><body>
  <main>
    <h1>Software de facturación para empresas</h1>
    <h2>¿Por qué elegirnos?</h2>
    <p>Tenemos 500 clientes satisfechos desde 2020. Nuestro software de facturación
       es usado por empresas de todos los tamaños.</p>
  </main>
</body></html>`

describe('checkGeo — rich page', () => {
  it('returns 4 checks', () => {
    const results = checkGeo(richHtml)
    assert.equal(results.length, 4)
  })

  it('citable content passes with stats and sources', () => {
    const r = checkGeo(richHtml).find(c => c.name === 'contenido citable')
    assert.equal(r?.status, 'pass')
  })

  it('q&a density passes with question headings and details', () => {
    const r = checkGeo(richHtml).find(c => c.name === 'q&a density')
    assert.equal(r?.status, 'pass')
  })

  it('e-e-a-t passes with authority links and authorship', () => {
    const r = checkGeo(richHtml).find(c => c.name === 'e-e-a-t')
    assert.equal(r?.status, 'pass')
  })
})

describe('checkGeo — bare page', () => {
  it('citable content fails with no data signals', () => {
    const r = checkGeo(bareHtml).find(c => c.name === 'contenido citable')
    assert.equal(r?.status, 'fail')
    assert.equal(r?.score, 0)
  })

  it('q&a density fails with no questions', () => {
    const r = checkGeo(bareHtml).find(c => c.name === 'q&a density')
    assert.equal(r?.status, 'fail')
    assert.equal(r?.score, 0)
  })

  it('e-e-a-t fails with no authority signals', () => {
    const r = checkGeo(bareHtml).find(c => c.name === 'e-e-a-t')
    assert.equal(r?.status, 'fail')
    assert.equal(r?.score, 0)
  })

  it('semantic density fails with no h1', () => {
    const r = checkGeo(bareHtml).find(c => c.name === 'densidad semántica')
    assert.equal(r?.status, 'fail')
    assert.equal(r?.score, 0)
  })
})

describe('checkGeo — partial page', () => {
  it('semantic density is warn or pass when h1 terms appear in body', () => {
    const r = checkGeo(partialHtml).find(c => c.name === 'densidad semántica')
    assert.notEqual(r?.status, 'fail')
  })
})
