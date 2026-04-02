import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkMeta } from '../meta.ts'

const fullHtml = `<!DOCTYPE html><html><head>
  <title>My SaaS App</title>
  <meta name="description" content="The best SaaS app for your business needs">
  <meta property="og:title" content="My SaaS App">
  <meta property="og:description" content="Description here">
  <meta property="og:image" content="https://example.com/og.jpg">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"My App"}</script>
</head><body></body></html>`

const noMetaHtml = `<!DOCTYPE html><html><head>
  <title>A Very Long Title That Exceeds The Recommended Sixty Character Limit For SEO</title>
</head><body></body></html>`

describe('checkMeta', () => {
  it('returns all pass for complete meta tags', () => {
    const results = checkMeta(fullHtml)
    assert.equal(results.length, 4)
    assert.ok(results.every(r => r.status === 'pass'), `Expected all pass but got: ${JSON.stringify(results.map(r => ({ name: r.name, status: r.status })))}`)
    assert.equal(results.reduce((sum, r) => sum + r.score, 0), 38)
  })

  it('returns fail for missing description, OG, JSON-LD; warn for long title', () => {
    const results = checkMeta(noMetaHtml)
    const title = results.find(r => r.name === 'title')
    const desc = results.find(r => r.name === 'meta description')
    const og = results.find(r => r.name === 'open graph')
    const jsonld = results.find(r => r.name === 'json-ld')
    assert.equal(title?.status, 'warn')
    assert.equal(desc?.status, 'fail')
    assert.equal(og?.status, 'fail')
    assert.equal(jsonld?.status, 'fail')
  })
})
