# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run the auditor
npm run audit -- https://example.com
npm run audit -- https://example.com --pages 5
npm run audit -- https://example.com --no-verify   # skip SSL validation

# Run all tests
npm test

# Run a single test file
npx tsx --test checks/__tests__/content.test.ts
```

The auditor generates `audit-report-<domain>-<date>.html` in the working directory. Open in a browser and use Cmd+P / Ctrl+P to export as PDF.

## Architecture

The tool is a CLI that fetches a domain and produces an HTML readability report scored for LLM/AI consumption.

**Entry point:** `auditor.ts` — parses CLI args, orchestrates all checks, computes scores, writes the HTML report.

**Score model:**
- Domain-level checks (`robots.txt`, `llms.txt`, `sitemap.xml`) are run once and contribute their raw scores.
- Per-page checks (`meta`, `content`, `performance`) are run for each URL from the sitemap (up to `--pages`, default 10). The global score = domain score + average page score across all audited pages.
- `globalMaxScore` = domain max + rounded average page max (not a fixed 100 — the percentage displayed is `globalScore / globalMaxScore * 100`).

**Check modules** (`checks/*.ts`): Each exports a single function returning `CheckResult | CheckResult[]`. The `Fetcher` type alias is used for dependency injection in tests.

| Module | Function | Scope | Key checks |
|---|---|---|---|
| `robots.ts` | `checkRobots` | domain | Existence, `User-agent` directives, AI bot blocking |
| `llms.ts` | `checkLlms` | domain | `/llms.txt` presence, `#` heading, `##` sections, links |
| `sitemap.ts` | `checkSitemap` | domain | `/sitemap.xml` presence, `<loc>` entries, `<lastmod>` |
| `meta.ts` | `checkMeta` | per-page | `<title>` length, meta description, Open Graph, JSON-LD |
| `content.ts` | `checkContent` | per-page | H1 count, heading hierarchy, alt text, text/HTML ratio |
| `performance.ts` | `checkPerformance` | per-page | Response time, page size |

**Reporter:** `reporter.ts` — pure function `generateHtml(audit: DomainAudit): string` that produces a self-contained HTML report with inline CSS. No external dependencies.

**Types:** `types.ts` — all shared interfaces (`CheckResult`, `PageAudit`, `DomainAudit`, `RecommendationItem`, `Fetcher`).

**Tests** (`checks/__tests__/*.test.ts`): Use Node.js built-in test runner (`node:test`). Check functions accept an optional `fetcher` parameter for mocking HTTP calls without any mock library.

## Skill

`SKILL.md` registers this tool as a Claude Code skill (`/ai-auditor <url>`), so it can be invoked as a slash command from other projects where this skill is installed.
