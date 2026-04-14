import type { DomainAudit, CheckResult, CheckStatus, PageAudit, RecommendationItem } from './types.ts'

const STATUS_ICON: Record<CheckStatus, string> = { pass: '✅', warn: '⚠️', fail: '❌' }

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const BUSINESS_IMPACT: Record<string, string> = {
  'robots.txt': 'Sin este archivo, crawlers de IA como ChatGPT, Perplexity y Claude no saben si pueden indexar tu sitio — quedas invisible en búsquedas generativas.',
  'llms.txt': 'Este archivo le indica directamente a los LLMs cómo presentar tu negocio cuando alguien pregunta sobre tu sector o solución.',
  'sitemap.xml': 'Sin sitemap, los crawlers solo descubren páginas por links. Muchas de tus páginas clave pueden nunca ser indexadas por motores de IA.',
  'title': 'El título es el primer criterio que Google y los LLMs usan para decidir si tu página responde una búsqueda. Uno claro y conciso aumenta el CTR y la relevancia percibida.',
  'meta description': 'Controla el texto que aparece bajo tu link en buscadores y cuando un LLM referencia tu página. Impacta directamente el CTR orgánico.',
  'open graph': 'Controla cómo aparece tu contenido al compartirse en redes y cuando un LLM lo cita. Sin OG tags, las previsualizaciones son genéricas y poco atractivas.',
  'json-ld': 'El JSON-LD es el lenguaje estructurado que los LLMs leen para entender tu negocio sin ambigüedad. Sin él, la IA infiere de qué tratas — y puede inferir mal.',
  'schema types': 'Tipos GEO como Article, FAQPage u Organization multiplican la probabilidad de aparecer en respuestas de ChatGPT, Perplexity y Google AI Overviews.',
  'headings': 'La jerarquía de headings es el índice que los LLMs usan para navegar tu contenido. Sin orden claro, el crawler no identifica qué es lo más relevante.',
  'alt text': 'Sin alt text, tus imágenes son completamente invisibles para los LLMs. Pierdes contexto semántico que refuerza el tema de tu página.',
  'texto/html ratio': 'Páginas con poco texto visible son menos probables de ser citadas como fuente. Los LLMs priorizan páginas con contenido denso y legible.',
  'semantic html': 'Elementos como main y article le dicen a los crawlers exactamente qué parte del HTML es contenido citable vs. navegación o footer.',
  'contenido citable': 'El contenido con datos, estadísticas y fuentes verificables es el que los LLMs citan como respaldo factual. Sin datos, tu contenido es opinión — no referencia.',
  'q&a density': 'Páginas con estructura Q&A tienen mayor probabilidad de aparecer en featured snippets y respuestas directas de IA, generando tráfico zero-click.',
  'e-e-a-t': 'Google y los LLMs penalizan contenido sin autoría ni respaldo externo. La autoridad y confianza (E-E-A-T) son señales directas de ranking en búsqueda generativa.',
  'densidad semántica': 'Si el H1 y el cuerpo hablan de temas distintos, el LLM no sabe de qué trata tu página y la descarta para búsquedas relacionadas con tu negocio.',
  'tiempo de respuesta': 'Páginas lentas son penalizadas en Core Web Vitals y rankings de IA. Cada segundo extra reduce conversiones y aumenta la tasa de rebote.',
  'tamaño de página': 'HTML excesivamente grande supera los límites de tokens de los crawlers de IA, que pueden procesar solo la primera parte de tu página.',
}

function scoreColor(score: number, max: number): string {
  const pct = max > 0 ? (score / max) * 100 : 0
  if (pct >= 80) return '#16a34a'
  if (pct >= 60) return '#d97706'
  return '#dc2626'
}

function scoreBar(score: number, max: number): string {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0
  const color = scoreColor(score, max)
  return `<div style="background:#e5e7eb;border-radius:4px;height:8px;margin-top:8px">
    <div style="width:${pct}%;background:${color};height:8px;border-radius:4px"></div>
  </div>`
}

// Full row for issues (fail/warn) and domain checks — 4 columns
function issueRow(c: CheckResult): string {
  return `<tr style="border-bottom:1px solid #f3f4f6">
    <td style="padding:10px 12px;font-size:13px;white-space:nowrap">${STATUS_ICON[c.status]} ${esc(c.name)}</td>
    <td style="padding:10px 12px;font-size:12px;color:#374151">${esc(c.detail)}</td>
    <td style="padding:10px 12px;font-size:12px;color:#6b7280;font-style:italic">${c.recommendation ? esc(c.recommendation) : ''}</td>
    <td style="padding:10px 12px;font-size:13px;font-weight:600;color:${scoreColor(c.score, c.maxScore)};white-space:nowrap">${c.score}/${c.maxScore}</td>
  </tr>`
}

// Compact row for passing checks — 3 columns, muted style
function passRow(c: CheckResult): string {
  return `<tr style="border-bottom:1px solid #f9fafb">
    <td style="padding:5px 12px;font-size:12px;color:#9ca3af">✅ ${esc(c.name)}</td>
    <td style="padding:5px 12px;font-size:12px;color:#9ca3af">${esc(c.detail)}</td>
    <td style="padding:5px 12px;font-size:12px;font-weight:500;color:#16a34a;white-space:nowrap">${c.score}/${c.maxScore}</td>
  </tr>`
}

function pageSection(page: PageAudit, index: number): string {
  const pct = page.maxScore > 0 ? Math.round((page.score / page.maxScore) * 100) : 0
  const color = scoreColor(page.score, page.maxScore)

  const issues = page.checks.filter(c => c.status !== 'pass')
  const passing = page.checks.filter(c => c.status === 'pass')

  const issuesHtml = issues.length > 0 ? `
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f3f4f6">
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Check</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Detalle</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Recomendación</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Score</th>
      </tr></thead>
      <tbody>${issues.map(issueRow).join('')}</tbody>
    </table>` : `<div style="padding:14px 16px;font-size:13px;color:#16a34a">Sin problemas detectados en esta página.</div>`

  const passingHtml = passing.length > 0 ? `
    <details style="border-top:1px solid #f3f4f6">
      <summary style="padding:9px 16px;cursor:pointer;font-size:12px;color:#9ca3af;list-style:none;display:flex;align-items:center;gap:6px">
        <span>▸</span> ${passing.length} checks correctos
      </summary>
      <table style="width:100%;border-collapse:collapse;background:#fafafa">
        <tbody>${passing.map(passRow).join('')}</tbody>
      </table>
    </details>` : ''

  return `<details style="margin-bottom:12px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden" ${index === 0 ? 'open' : ''}>
    <summary style="padding:14px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;background:#f9fafb;list-style:none">
      <span style="font-size:22px;font-weight:700;color:${color}">${pct}</span>
      <span style="flex:1;font-size:13px;color:#374151;word-break:break-all">${esc(page.url)}</span>
      <span style="font-size:12px;color:#9ca3af">${page.responseTime}ms</span>
    </summary>
    ${issuesHtml}
    ${passingHtml}
  </details>`
}

function recCard(r: RecommendationItem, isLast: boolean): string {
  const impact = BUSINESS_IMPACT[r.check] ?? ''
  const isFail = r.status === 'fail'
  const borderColor = isFail ? '#fca5a5' : '#fde68a'
  const bgColor = isFail ? '#fff5f5' : '#fffbeb'
  const accentColor = isFail ? '#dc2626' : '#d97706'
  return `<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:16px;${isLast ? '' : 'margin-bottom:10px'}">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:${impact ? '8px' : '0'}">
      <span style="font-size:16px">${STATUS_ICON[r.status]}</span>
      <span style="font-size:14px;font-weight:700;color:#111827">${esc(r.check)}</span>
      ${r.page ? `<span style="font-size:11px;color:#9ca3af;background:#f3f4f6;padding:2px 7px;border-radius:10px">${esc(r.page)}</span>` : ''}
    </div>
    ${impact ? `<div style="font-size:13px;color:#374151;margin-bottom:10px;line-height:1.5">💡 ${esc(impact)}</div>` : ''}
    <div style="font-size:13px;color:${accentColor};padding:8px 12px;background:white;border-radius:6px;border-left:3px solid ${accentColor};line-height:1.5">
      <strong>Acción:</strong> ${esc(r.text)}
    </div>
  </div>`
}

export function generateHtml(audit: DomainAudit): string {
  const globalPct = audit.globalMaxScore > 0 ? Math.round((audit.globalScore / audit.globalMaxScore) * 100) : 0
  const globalColor = scoreColor(audit.globalScore, audit.globalMaxScore)

  const allChecks = [...audit.domainChecks, ...audit.pages.flatMap(p => p.checks)]
  const totalPass = allChecks.filter(c => c.status === 'pass').length
  const totalWarn = allChecks.filter(c => c.status === 'warn').length
  const totalFail = allChecks.filter(c => c.status === 'fail').length

  const fails = audit.recommendations.filter(r => r.status === 'fail')
  const warns = audit.recommendations.filter(r => r.status === 'warn')

  const failsSection = fails.length > 0 ? `
    <div style="margin-bottom:${warns.length > 0 ? '24px' : '0'}">
      <div style="font-size:13px;font-weight:700;color:#dc2626;margin-bottom:10px;display:flex;align-items:center;gap:8px">
        ❌ Errores críticos
        <span style="background:#fee2e2;color:#991b1b;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px">${fails.length}</span>
      </div>
      ${fails.map((r, i) => recCard(r, i === fails.length - 1)).join('')}
    </div>` : ''

  const warnsSection = warns.length > 0 ? `
    <div>
      <div style="font-size:13px;font-weight:700;color:#d97706;margin-bottom:10px;display:flex;align-items:center;gap:8px">
        ⚠️ Advertencias
        <span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px">${warns.length}</span>
      </div>
      ${warns.map((r, i) => recCard(r, i === warns.length - 1)).join('')}
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Readability Audit — ${audit.domain}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; color: #111827; }
    .container { max-width: 960px; margin: 0 auto; padding: 32px 16px; }
    details > summary::-webkit-details-marker { display: none; }
    @media print {
      body { background: white; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div style="background:#111827;color:white;border-radius:12px;padding:32px;margin-bottom:24px">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
      <div>
        <div style="font-size:12px;color:#9ca3af;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">AI Readability Audit</div>
        <div style="font-size:28px;font-weight:700">${audit.domain}</div>
        <div style="font-size:13px;color:#9ca3af;margin-top:4px">${audit.date} · ${audit.pages.length} página(s) auditada(s)</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:56px;font-weight:800;color:${globalColor};line-height:1">${globalPct}</div>
        <div style="font-size:13px;color:#9ca3af">de 100 puntos</div>
      </div>
    </div>
    ${scoreBar(audit.globalScore, audit.globalMaxScore)}
  </div>

  <!-- Summary -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
    <div style="background:white;border-radius:8px;padding:16px;text-align:center;border:1px solid #e5e7eb">
      <div style="font-size:28px">✅</div>
      <div style="font-size:24px;font-weight:700;color:#16a34a">${totalPass}</div>
      <div style="font-size:12px;color:#6b7280">Correctos</div>
    </div>
    <div style="background:white;border-radius:8px;padding:16px;text-align:center;border:1px solid #e5e7eb">
      <div style="font-size:28px">⚠️</div>
      <div style="font-size:24px;font-weight:700;color:#d97706">${totalWarn}</div>
      <div style="font-size:12px;color:#6b7280">Advertencias</div>
    </div>
    <div style="background:white;border-radius:8px;padding:16px;text-align:center;border:1px solid #e5e7eb">
      <div style="font-size:28px">❌</div>
      <div style="font-size:24px;font-weight:700;color:#dc2626">${totalFail}</div>
      <div style="font-size:12px;color:#6b7280">Errores</div>
    </div>
  </div>

  <!-- Plan de acción (before per-page detail for visibility) -->
  ${(fails.length > 0 || warns.length > 0) ? `
  <div style="background:white;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;overflow:hidden">
    <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;font-weight:600;font-size:15px">
      Plan de acción
    </div>
    <div style="padding:16px">
      ${failsSection}
      ${warnsSection}
    </div>
  </div>` : ''}

  <!-- Domain Checks -->
  <div style="background:white;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;overflow:hidden">
    <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;font-weight:600;font-size:15px">
      Archivos de comunicación con IA
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f3f4f6">
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Check</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Detalle</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Recomendación</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Score</th>
      </tr></thead>
      <tbody>${audit.domainChecks.map(issueRow).join('')}</tbody>
    </table>
  </div>

  <!-- Per Page -->
  <div style="margin-bottom:24px">
    <div style="font-weight:600;font-size:15px;margin-bottom:12px">Resultados por página</div>
    ${audit.pages.map((p, i) => pageSection(p, i)).join('')}
  </div>

  <!-- Footer -->
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
    <div style="font-size:12px;color:#9ca3af">Generado por <strong>ai-auditor</strong> · ${audit.date}</div>
    <button class="no-print" onclick="window.print()" style="background:#111827;color:white;border:none;padding:10px 20px;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600">
      Imprimir / Exportar PDF
    </button>
  </div>

</div>
</body>
</html>`
}
