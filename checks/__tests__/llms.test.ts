import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkLlms } from '../llms.ts'

const makeFetcher = (status: number, body: string) =>
  async (_url: string) => new Response(body, { status })

describe('checkLlms', () => {
  it('returns fail when llms.txt not found', async () => {
    const result = await checkLlms('https://example.com', makeFetcher(404, ''))
    assert.equal(result.status, 'fail')
    assert.equal(result.score, 0)
    assert.equal(result.maxScore, 15)
  })

  it('returns warn when llms.txt exists but missing sections', async () => {
    const result = await checkLlms('https://example.com', makeFetcher(200, 'Some content without headings'))
    assert.equal(result.status, 'warn')
    assert.equal(result.score, 8)
  })

  it('returns pass for valid llms.txt with title and sections', async () => {
    const body = '# My App\n\n> A brief description\n\n## Docs\n\n- [API](https://example.com/docs)\n\n## About\n\nMore info here.'
    const result = await checkLlms('https://example.com', makeFetcher(200, body))
    assert.equal(result.status, 'pass')
    assert.equal(result.score, 15)
  })

  it('returns warn when only h2 present without h1', async () => {
    const body = '## Section\n\n- [Docs](https://example.com/docs)'
    const result = await checkLlms('https://example.com', makeFetcher(200, body))
    assert.equal(result.status, 'warn')
    assert.equal(result.score, 8)
  })

  it('returns warn when h1 and h2 present but no links', async () => {
    const body = '# My App\n\n## Section\n\nSome text without links.'
    const result = await checkLlms('https://example.com', makeFetcher(200, body))
    assert.equal(result.status, 'warn')
    assert.equal(result.score, 10)
  })
})
