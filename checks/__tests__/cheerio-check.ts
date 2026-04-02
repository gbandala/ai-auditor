import * as cheerio from 'cheerio'

console.log('Testing Cheerio selectors for og: tags')
console.log()

// Test: meta[property="og:title"] vs meta[name="og:title"]
const html = `<html><head>
  <meta property="og:title" content="Title 1">
  <meta name="og:title" content="Title 2">
</head></body>`

const $ = cheerio.load(html)

console.log('Test 1: Selecting meta[property="og:title"]')
const ogByProperty = $('meta[property="og:title"]').attr('content')
console.log(`  Result: "${ogByProperty}" (expected "Title 1")`)
console.log()

console.log('Test 2: Selecting meta[name="og:title"]')
const ogByName = $('meta[name="og:title"]').attr('content')
console.log(`  Result: "${ogByName}" (expected "Title 2")`)
console.log()

console.log('Test 3: Empty HTML')
const empty = `<html><head></head></body>`
const $empty = cheerio.load(empty)
const emptyOG = $empty('meta[property="og:title"]').attr('content')
console.log(`  Result: ${emptyOG === undefined ? 'undefined' : emptyOG} (expected undefined)`)
console.log()

console.log('Test 4: Whitespace handling')
const whitespace = `<html><head>
  <title>  Test  </title>
  <meta name="description" content="  Test Desc  ">
</head></body>`
const $ws = cheerio.load(whitespace)
const title = $ws('title').text().trim()
const desc = $ws('meta[name="description"]').attr('content')?.trim()
console.log(`  Title: "${title}" (trimmed correctly)`)
console.log(`  Desc: "${desc}" (attr not auto-trimmed, must be trimmed after)`)
console.log()

console.log('Test 5: First JSON-LD script selector')
const multiJsonLD = `<html><head>
  <script type="application/ld+json">{"@type":"Schema1"}</script>
  <script type="application/ld+json">{"@type":"Schema2"}</script>
</head></body>`
const $multi = cheerio.load(multiJsonLD)
const firstJsonLD = $multi('script[type="application/ld+json"]').first().html()
console.log(`  First: ${firstJsonLD}`)
console.log(`  (correctly uses .first() to get only the first one)`)
