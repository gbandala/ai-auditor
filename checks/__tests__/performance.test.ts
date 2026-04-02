import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkPerformance } from '../performance.ts'

const makeTimedFetcher = (delayMs: number, bodySize: number) =>
  async (_url: string) => {
    await new Promise(r => setTimeout(r, delayMs))
    return new Response('x'.repeat(bodySize), { status: 200 })
  }

describe('checkPerformance', () => {
  it('returns pass for fast small page', async () => {
    const { responseTime, checks } = await checkPerformance('https://example.com', makeTimedFetcher(100, 1000))
    assert.ok(responseTime < 500)
    assert.ok(checks.every(c => c.status === 'pass'))
  })

  it('returns warn for slow response', async () => {
    const { checks } = await checkPerformance('https://example.com', makeTimedFetcher(2500, 1000))
    const timeCheck = checks.find(c => c.name === 'tiempo de respuesta')
    assert.equal(timeCheck?.status, 'warn')
  })

  it('returns warn for large page', async () => {
    const { checks } = await checkPerformance('https://example.com', makeTimedFetcher(100, 600_000))
    const sizeCheck = checks.find(c => c.name === 'tamaño de página')
    assert.equal(sizeCheck?.status, 'warn')
  })
})
