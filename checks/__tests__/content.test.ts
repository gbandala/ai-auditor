import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkContent } from '../content.ts'

const goodHtml = `<html><body>
  <h1>Main Title</h1>
  <h2>Section One</h2>
  <p>This is a paragraph with plenty of text content to make a good ratio. Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor.</p>
  <h2>Section Two</h2>
  <p>Another paragraph with content. More text here to ensure good ratio.</p>
  <img src="hero.jpg" alt="Hero image showing the product dashboard">
  <img src="team.jpg" alt="Our team of experts">
</body></html>`

const badHtml = `<html><body>
  <h1>First Title</h1>
  <h1>Second Title (duplicate h1)</h1>
  <h3>Skipped h2 goes straight to h3</h3>
  <img src="a.jpg">
  <img src="b.jpg" alt="">
  <div class="code">${'<div>'.repeat(100)}</div>
</body></html>`

describe('checkContent', () => {
  it('returns all pass for well-structured content', () => {
    const results = checkContent(goodHtml)
    assert.ok(results.every(r => r.status === 'pass'), `Expected all pass but got: ${JSON.stringify(results.map(r => ({ name: r.name, status: r.status })))}`)
  })

  it('detects duplicate h1, skipped heading level, missing alt, low text ratio', () => {
    const results = checkContent(badHtml)
    const headings = results.find(r => r.name === 'headings')
    const altText = results.find(r => r.name === 'alt text')
    assert.notEqual(headings?.status, 'pass')
    assert.notEqual(altText?.status, 'pass')
  })
})
