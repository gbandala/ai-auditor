import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkRobots } from '../robots.ts'

const makeFetcher = (status: number, body: string) =>
  async (_url: string) => new Response(body, { status })

describe('checkRobots', () => {
  it('returns fail when robots.txt not found', async () => {
    const result = await checkRobots('https://example.com', makeFetcher(404, ''))
    assert.equal(result.status, 'fail')
    assert.equal(result.score, 0)
    assert.equal(result.maxScore, 10)
  })

  it('returns warn when robots.txt exists but no User-agent', async () => {
    const result = await checkRobots('https://example.com', makeFetcher(200, 'Sitemap: /sitemap.xml'))
    assert.equal(result.status, 'warn')
    assert.equal(result.score, 5)
  })

  it('returns warn when robots.txt blocks AI bots', async () => {
    const body = 'User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /'
    const result = await checkRobots('https://example.com', makeFetcher(200, body))
    assert.equal(result.status, 'warn')
    assert.equal(result.score, 5)
  })

  it('returns pass for valid robots.txt without AI blocks', async () => {
    const body = 'User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml'
    const result = await checkRobots('https://example.com', makeFetcher(200, body))
    assert.equal(result.status, 'pass')
    assert.equal(result.score, 10)
  })

  it('returns warn when User-agent: * has Disallow: / (blocks all including AI)', async () => {
    const body = 'User-agent: *\nDisallow: /'
    const result = await checkRobots('https://example.com', makeFetcher(200, body))
    assert.equal(result.status, 'warn')
    assert.equal(result.score, 5)
  })
})
