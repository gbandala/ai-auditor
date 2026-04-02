import type { DomainAudit, CheckResult, CheckStatus, PageAudit } from './types.ts'

const STATUS_ICON: Record<CheckStatus, string> = { pass: '✅', warn: '⚠️', fail: '❌' }

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

function checkRow(c: CheckResult): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px">${STATUS_ICON[c.status]} ${c.name}</td>
    <td style="padding:8px 12px;font-size:12px;color:#374151">${c.detail}</td>
    <td style="padding:8px 12px;font-size:12px;color:#6b7280;font-style:italic">${c.recommendation ?? ''}</td>
    <td style="padding:8px 12px;font-size:13px;font-weight:600;color:${scoreColor(c.score, c.maxScore)};white-space:nowrap">${c.score}/${c.maxScore}</td>
  </tr>`
}

function pageSection(page: PageAudit, index: number): string {
  const pct = page.maxScore > 0 ? Math.round((page.score / page.maxScore) * 100) : 0
  const color = scoreColor(page.score, page.maxScore)
  return `<details style="margin-bottom:12px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden" ${index === 0 ? 'open' : ''}>
    <summary style="padding:14px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;background:#f9fafb;list-style:none">
      <span style="font-size:22px;font-weight:700;color:${color}">${pct}</span>
      <span style="flex:1;font-size:13px;color:#374151;word-break:break-all">${page.url}</span>
      <span style="font-size:12px;color:#9ca3af">${page.responseTime}ms</span>
    </summary>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f3f4f6">
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Check</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Detalle</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Recomendación</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Score</th>
      </tr></thead>
      <tbody>${page.checks.map(checkRow).join('')}</tbody>
    </table>
  </details>`
}

export function generateHtml(audit: DomainAudit): string {
  const globalPct = audit.globalMaxScore > 0 ? Math.round((audit.globalScore / audit.globalMaxScore) * 100) : 0
  const globalColor = scoreColor(audit.globalScore, audit.globalMaxScore)

  const allChecks = [...audit.domainChecks, ...audit.pages.flatMap(p => p.checks)]
  const totalPass = allChecks.filter(c => c.status === 'pass').length
  const totalWarn = allChecks.filter(c => c.status === 'warn').length
  const totalFail = allChecks.filter(c => c.status === 'fail').length

  const priorityBadge = (p: string) => {
    const colors: Record<string, string> = { high: '#fee2e2', medium: '#fef3c7', low: '#d1fae5' }
    const textColors: Record<string, string> = { high: '#991b1b', medium: '#92400e', low: '#065f46' }
    return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:${colors[p]};color:${textColors[p]}">${p.toUpperCase()}</span>`
  }

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
      <div style="font-size:12px;color:#6b7280">Pasados</div>
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
      <tbody>${audit.domainChecks.map(checkRow).join('')}</tbody>
    </table>
  </div>

  <!-- Per Page -->
  <div style="margin-bottom:24px">
    <div style="font-weight:600;font-size:15px;margin-bottom:12px">Resultados por página</div>
    ${audit.pages.map((p, i) => pageSection(p, i)).join('')}
  </div>

  <!-- Recommendations -->
  ${audit.recommendations.length > 0 ? `
  <div style="background:white;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;overflow:hidden">
    <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;font-weight:600;font-size:15px">
      Recomendaciones prioritarias
    </div>
    <div style="padding:12px 16px">
      ${audit.recommendations.map((r, i) => `
      <div style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:${i < audit.recommendations.length - 1 ? '1px solid #f3f4f6' : 'none'}">
        <span style="font-size:18px;line-height:1.4">${STATUS_ICON[r.status]}</span>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            ${priorityBadge(r.priority)}
            <span style="font-size:13px;font-weight:600">${r.check}</span>
            ${r.page ? `<span style="font-size:12px;color:#9ca3af">${r.page}</span>` : ''}
          </div>
          <div style="font-size:13px;color:#374151">${r.text}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>` : ''}

  <!-- Footer -->
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
    <div style="font-size:12px;color:#9ca3af">Generado con <strong>SaaS Factory</strong> · ${audit.date}</div>
    <button class="no-print" onclick="window.print()" style="background:#111827;color:white;border:none;padding:10px 20px;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600">
      Imprimir / Exportar PDF
    </button>
  </div>

</div>
</body>
</html>`
}
