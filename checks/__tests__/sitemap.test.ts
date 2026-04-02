import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkSitemap } from '../sitemap.ts'

const makeFetcher = (status: number, body: string) =>
  async (_url: string) => new Response(body, { status })

const validSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc><lastmod>2026-01-01</lastmod></url>
  <url><loc>https://example.com/about</loc><lastmod>2026-01-01</lastmod></url>
  <url><loc>https://example.com/pricing</loc><lastmod>2026-01-01</lastmod></url>
</urlset>`

const sitemapNoLastmod = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/about</loc></url>
</urlset>`

describe('checkSitemap', () => {
  it('returns fail when sitemap not found', async () => {
    const { check, urls } = await checkSitemap('https://example.com', 10, makeFetcher(404, ''))
    assert.equal(check.status, 'fail')
    assert.equal(check.score, 0)
    assert.equal(check.maxScore, 10)
    assert.deepEqual(urls, [])
  })

  it('returns warn when sitemap exists but some URLs lack lastmod', async () => {
    const { check, urls } = await checkSitemap('https://example.com', 10, makeFetcher(200, sitemapNoLastmod))
    assert.equal(check.status, 'warn')
    assert.equal(urls.length, 2)
  })

  it('returns pass for valid sitemap with lastmod on all URLs', async () => {
    const { check, urls } = await checkSitemap('https://example.com', 10, makeFetcher(200, validSitemap))
    assert.equal(check.status, 'pass')
    assert.equal(check.score, 10)
    assert.equal(urls.length, 3)
  })

  it('respects maxPages limit', async () => {
    const { urls } = await checkSitemap('https://example.com', 2, makeFetcher(200, validSitemap))
    assert.equal(urls.length, 2)
  })
})
