'use client'

import { useState, useRef, useEffect } from 'react'
import type { DomainAudit, CheckResult, PageAudit, RecommendationItem } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const CHECK_GROUPS = [
  {
    label: 'Críticos',
    color: '#dc2626',
    bg: '#fff5f5',
    border: '#fca5a5',
    icon: '🔴',
    checks: [
      { name: 'robots.txt', why: 'Sin este archivo, los crawlers de IA no saben si pueden indexar tu sitio.' },
      { name: 'llms.txt', why: 'Le indica a los LLMs cómo presentar tu negocio en respuestas generativas.' },
      { name: 'json-ld', why: 'El lenguaje estructurado que los LLMs usan para entender tu negocio sin ambigüedad.' },
      { name: 'schema types', why: 'Tipos como FAQPage u Organization multiplican la probabilidad de ser citado.' },
      { name: 'densidad semántica', why: 'Si el H1 y el cuerpo no coinciden, la IA descarta tu página para búsquedas clave.' },
    ],
  },
  {
    label: 'Importantes',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: '🟡',
    checks: [
      { name: 'sitemap.xml', why: 'Asegura que todas tus páginas sean descubiertas por motores de IA.' },
      { name: 'title', why: 'Primer criterio para decidir si tu página responde una búsqueda.' },
      { name: 'meta description', why: 'Controla cómo los LLMs y buscadores describen tu página.' },
      { name: 'e-e-a-t', why: 'Autoridad y confianza son señales directas de ranking en búsqueda generativa.' },
      { name: 'q&a density', why: 'Páginas con Q&A aparecen en featured snippets y respuestas directas de IA.' },
      { name: 'contenido citable', why: 'Los LLMs citan contenido con datos y estadísticas verificables.' },
    ],
  },
  {
    label: 'Calidad',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: '🟢',
    checks: [
      { name: 'open graph', why: 'Controla cómo aparece tu contenido al ser compartido o referenciado.' },
      { name: 'headings', why: 'El índice que los LLMs usan para navegar y resumir tu contenido.' },
      { name: 'alt text', why: 'Sin alt text, las imágenes son invisibles para los LLMs.' },
      { name: 'semantic html', why: 'Indica exactamente qué parte del HTML es contenido citable.' },
      { name: 'texto/html ratio', why: 'Páginas con poco texto son menos probables de ser citadas.' },
      { name: 'tiempo de respuesta', why: 'Páginas lentas son penalizadas en rankings de IA y buscadores.' },
    ],
  },
]

const BUSINESS_IMPACT: Record<string, string> = {
  'robots.txt': 'Sin este archivo, crawlers de IA como ChatGPT, Perplexity y Claude no saben si pueden indexar tu sitio — quedas invisible en búsquedas generativas.',
  'llms.txt': 'Este archivo le indica directamente a los LLMs cómo presentar tu negocio cuando alguien pregunta sobre tu sector o solución.',
  'sitemap.xml': 'Sin sitemap, los crawlers solo descubren páginas por links. Muchas de tus páginas clave pueden nunca ser indexadas por motores de IA.',
  'title': 'El título es el primer criterio que Google y los LLMs usan para decidir si tu página responde una búsqueda.',
  'meta description': 'Controla el texto que aparece bajo tu link en buscadores. Afecta directamente el CTR orgánico y cómo los LLMs describen tu página.',
  'open graph': 'Controla cómo aparece tu contenido al compartirse y cuando un LLM lo referencia. Sin OG tags, las previsualizaciones son genéricas.',
  'json-ld': 'El JSON-LD es el lenguaje estructurado que los LLMs leen para entender tu negocio sin ambigüedad. Sin él, la IA infiere — y puede inferir mal.',
  'schema types': 'Tipos GEO como Article, FAQPage u Organization multiplican la probabilidad de aparecer en respuestas de ChatGPT, Perplexity y Google AI Overviews.',
  'headings': 'La jerarquía de headings es el índice que los LLMs usan para navegar tu contenido. Sin orden claro, el crawler no identifica qué es importante.',
  'alt text': 'Sin alt text, tus imágenes son completamente invisibles para los LLMs. Pierdes contexto semántico que refuerza el tema de tu página.',
  'texto/html ratio': 'Páginas con poco texto visible son menos probables de ser citadas. Los LLMs priorizan páginas con contenido denso y legible.',
  'semantic html': 'Elementos como main y article le dicen a los crawlers exactamente qué parte del HTML es contenido citable vs. navegación o footer.',
  'contenido citable': 'El contenido con datos, estadísticas y fuentes verificables es el que los LLMs citan como respaldo factual. Sin datos, tu contenido es opinión, no referencia.',
  'q&a density': 'Páginas con estructura Q&A tienen mayor probabilidad de aparecer en featured snippets y respuestas directas de IA, generando tráfico zero-click.',
  'e-e-a-t': 'Google y los LLMs penalizan contenido sin autoría ni respaldo externo. La autoridad y confianza son señales directas de ranking en búsqueda generativa.',
  'densidad semántica': 'Si el H1 y el cuerpo hablan de temas distintos, el LLM no sabe de qué trata tu página y la descarta para búsquedas relacionadas con tu negocio.',
  'tiempo de respuesta': 'Páginas lentas son penalizadas en Core Web Vitals y rankings de IA. Cada segundo extra reduce conversiones y aumenta el rebote.',
  'tamaño de página': 'HTML excesivamente grande supera los límites de tokens de los crawlers de IA, que pueden procesar solo la primera parte de tu página.',
}

const STATUS_ICON: Record<string, string> = { pass: '✅', warn: '⚠️', fail: '❌' }

function scoreColor(pct: number) {
  if (pct >= 80) return '#16a34a'
  if (pct >= 60) return '#d97706'
  return '#dc2626'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CheckPreview() {
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 15 }}>
        Qué analizamos
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 0 }}>
        {CHECK_GROUPS.map((group) => (
          <div key={group.label} style={{ padding: 20, borderRight: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: group.color, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              {group.icon} {group.label}
            </div>
            {group.checks.map((c) => (
              <div key={c.name} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.4 }}>{c.why}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

interface ProgressEvent {
  type: 'domain' | 'page'
  name: string
  status: 'pass' | 'warn' | 'fail'
  detail?: string
}

function ProgressFeed({ events }: { events: ProgressEvent[] }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16a34a', animation: 'pulse 1s infinite' }} />
        Analizando sitio…
      </div>
      <div style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: 13 }}>
        {events.map((e, i) => (
          <div key={i} style={{ padding: '4px 0', display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < events.length - 1 ? '1px solid #f9fafb' : 'none' }}>
            <span style={{ fontSize: 15 }}>{STATUS_ICON[e.status]}</span>
            <span style={{ color: '#374151', flex: 1 }}>
              {e.type === 'domain' ? e.name : new URL(e.name).pathname || '/'}
            </span>
            {e.detail && <span style={{ color: '#9ca3af', fontSize: 12 }}>{e.detail}</span>}
          </div>
        ))}
        <div style={{ padding: '8px 0', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12 }}>▸</span> ejecutando checks…
        </div>
      </div>
    </div>
  )
}

function PageSection({ page, defaultOpen }: { page: PageAudit; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [passOpen, setPassOpen] = useState(false)
  const pct = page.maxScore > 0 ? Math.round((page.score / page.maxScore) * 100) : 0
  const color = scoreColor(pct)
  const issues = page.checks.filter(c => c.status !== 'pass')
  const passing = page.checks.filter(c => c.status === 'pass')

  return (
    <div style={{ marginBottom: 12, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', userSelect: 'none' }}
      >
        <span style={{ fontSize: 22, fontWeight: 700, color }}>{pct}</span>
        <span style={{ flex: 1, fontSize: 13, color: '#374151', wordBreak: 'break-all' }}>{page.url}</span>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{page.responseTime}ms</span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <>
          {issues.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  {['Check', 'Detalle', 'Recomendación', 'Score'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issues.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13, whiteSpace: 'nowrap' }}>{STATUS_ICON[c.status]} {c.name}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151' }}>{c.detail}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>{c.recommendation ?? ''}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: scoreColor(c.maxScore > 0 ? (c.score / c.maxScore) * 100 : 0), whiteSpace: 'nowrap' }}>{c.score}/{c.maxScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '14px 16px', fontSize: 13, color: '#16a34a' }}>Sin problemas detectados en esta página.</div>
          )}

          {passing.length > 0 && (
            <div style={{ borderTop: '1px solid #f3f4f6' }}>
              <div
                onClick={() => setPassOpen(!passOpen)}
                style={{ padding: '9px 16px', cursor: 'pointer', fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}
              >
                <span>{passOpen ? '▾' : '▸'}</span> {passing.length} checks correctos
              </div>
              {passOpen && (
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fafafa' }}>
                  <tbody>
                    {passing.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={{ padding: '5px 12px', fontSize: 12, color: '#9ca3af' }}>✅ {c.name}</td>
                        <td style={{ padding: '5px 12px', fontSize: 12, color: '#9ca3af' }}>{c.detail}</td>
                        <td style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, color: '#16a34a', whiteSpace: 'nowrap' }}>{c.score}/{c.maxScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RecCard({ r }: { r: RecommendationItem }) {
  const isFail = r.status === 'fail'
  const accentColor = isFail ? '#dc2626' : '#d97706'
  const borderColor = isFail ? '#fca5a5' : '#fde68a'
  const bgColor = isFail ? '#fff5f5' : '#fffbeb'
  const impact = BUSINESS_IMPACT[r.check] ?? ''
  return (
    <div style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 8, padding: 16, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: impact ? 8 : 0 }}>
        <span style={{ fontSize: 16 }}>{STATUS_ICON[r.status]}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{r.check}</span>
        {r.page && (
          <span style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '2px 7px', borderRadius: 10 }}>{r.page}</span>
        )}
      </div>
      {impact && (
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 10, lineHeight: 1.5 }}>
          💡 {impact}
        </div>
      )}
      <div style={{ fontSize: 13, color: accentColor, padding: '8px 12px', background: 'white', borderRadius: 6, borderLeft: `3px solid ${accentColor}`, lineHeight: 1.5 }}>
        <strong>Acción:</strong> {r.text}
      </div>
    </div>
  )
}

function ResultsPanel({ audit, onReset }: { audit: DomainAudit; onReset: () => void }) {
  const globalPct = audit.globalMaxScore > 0 ? Math.round((audit.globalScore / audit.globalMaxScore) * 100) : 0
  const globalColor = scoreColor(globalPct)
  const allChecks = [...audit.domainChecks, ...audit.pages.flatMap(p => p.checks)]
  const totalPass = allChecks.filter(c => c.status === 'pass').length
  const totalWarn = allChecks.filter(c => c.status === 'warn').length
  const totalFail = allChecks.filter(c => c.status === 'fail').length
  const fails = audit.recommendations.filter(r => r.status === 'fail')
  const warns = audit.recommendations.filter(r => r.status === 'warn')

  return (
    <div>
      {/* Score header */}
      <div style={{ background: '#111827', color: 'white', borderRadius: 12, padding: 32, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>AI Readability Audit</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{audit.domain}</div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{audit.date} · {audit.pages.length} página(s) auditada(s)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, fontWeight: 800, color: globalColor, lineHeight: 1 }}>{globalPct}</div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>de 100 puntos</div>
          </div>
        </div>
        <div style={{ background: '#374151', borderRadius: 4, height: 8, marginTop: 16 }}>
          <div style={{ width: `${globalPct}%`, background: globalColor, height: 8, borderRadius: 4, transition: 'width .5s ease' }} />
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { icon: '✅', count: totalPass, label: 'Correctos', color: '#16a34a' },
          { icon: '⚠️', count: totalWarn, label: 'Advertencias', color: '#d97706' },
          { icon: '❌', count: totalFail, label: 'Errores', color: '#dc2626' },
        ].map(({ icon, count, label, color }) => (
          <div key={label} style={{ background: 'white', borderRadius: 8, padding: 16, textAlign: 'center', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 28 }}>{icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color }}>{count}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Plan de acción */}
      {(fails.length > 0 || warns.length > 0) && (
        <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 15 }}>Plan de acción</div>
          <div style={{ padding: 16 }}>
            {fails.length > 0 && (
              <div style={{ marginBottom: warns.length > 0 ? 24 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  ❌ Errores críticos
                  <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 }}>{fails.length}</span>
                </div>
                {fails.map((r, i) => <RecCard key={i} r={r} />)}
              </div>
            )}
            {warns.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#d97706', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  ⚠️ Advertencias
                  <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 }}>{warns.length}</span>
                </div>
                {warns.map((r, i) => <RecCard key={i} r={r} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Domain checks */}
      <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 15 }}>Archivos de comunicación con IA</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              {['Check', 'Detalle', 'Recomendación', 'Score'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {audit.domainChecks.map((c, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 12px', fontSize: 13, whiteSpace: 'nowrap' }}>{STATUS_ICON[c.status]} {c.name}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151' }}>{c.detail}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>{c.recommendation ?? ''}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: scoreColor(c.maxScore > 0 ? (c.score / c.maxScore) * 100 : 0), whiteSpace: 'nowrap' }}>{c.score}/{c.maxScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-page results */}
      {audit.pages.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Resultados por página</div>
          {audit.pages.map((p, i) => <PageSection key={p.url} page={p} defaultOpen={i === 0} />)}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 12, color: '#9ca3af' }}>Generado por <strong>ai-auditor</strong> · {audit.date}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onReset}
            style={{ background: 'white', color: '#374151', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
          >
            Nueva auditoría
          </button>
          <button
            onClick={() => window.print()}
            style={{ background: '#111827', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
          >
            Exportar PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Landing sections (idle only) ─────────────────────────────────────────────

function WhyItMatters() {
  const stats = [
    {
      icon: '🤖',
      title: 'La IA reemplaza al buscador',
      body: 'ChatGPT, Perplexity y Google AI Overviews responden directamente sin enviar tráfico. Solo citan sitios que entienden.',
    },
    {
      icon: '📉',
      title: 'El SEO tradicional ya no es suficiente',
      body: 'Un sitio puede tener PageRank perfecto y ser invisible para los LLMs si no tiene estructura semántica legible por IA.',
    },
    {
      icon: '🏆',
      title: 'GEO: el nuevo estándar',
      body: 'Generative Engine Optimization es la práctica de estructurar tu sitio para que los modelos de IA lo entiendan, citen y recomienden.',
    },
  ]
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Por qué importa ahora</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>El tráfico web está cambiando</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {stats.map(s => (
          <div key={s.title} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{s.title}</div>
            <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>{s.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HowItWorks() {
  const steps = [
    { n: '1', title: 'Ingresas tu URL', body: 'Pega la dirección de tu sitio y elige cuántas páginas analizar (1 a 20). Sin registro, sin instalación.' },
    { n: '2', title: 'Analizamos 17 señales', body: 'Revisamos robots.txt, llms.txt, sitemap, metadatos, estructura semántica, schema.org, rendimiento y más.' },
    { n: '3', title: 'Recibes tu plan de acción', body: 'Un reporte priorizado con errores críticos, advertencias y acciones concretas ordenadas por impacto en IA.' },
  ]
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Cómo funciona</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>Análisis completo en 30 segundos</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0, background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{ padding: 28, borderRight: i < steps.length - 1 ? '1px solid #f3f4f6' : 'none', position: 'relative' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eff6ff', border: '2px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#2563eb', marginBottom: 16 }}>{s.n}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{s.title}</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{s.body}</div>
            {i < steps.length - 1 && (
              <div style={{ position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#d1d5db', zIndex: 1 }}>→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function WhatYouGet() {
  const items = [
    { icon: '🎯', title: 'Score global /100', body: 'Una puntuación única que resume la visibilidad de tu sitio para la IA, comparable entre auditorías.' },
    { icon: '📋', title: 'Plan de acción priorizado', body: 'Errores críticos primero, advertencias después. Cada ítem incluye el impacto en negocio y la acción exacta a tomar.' },
    { icon: '🔍', title: 'Análisis por página', body: 'Desglose detallado de cada URL auditada: qué pasó, qué falló y la recomendación específica.' },
    { icon: '📄', title: 'Reporte exportable a PDF', body: 'Imprime o guarda el reporte completo con Ctrl+P. Compártelo con tu equipo o agencia.' },
  ]
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Qué obtienes</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>Un reporte accionable, no solo métricas</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {items.map(item => (
          <div key={item.title} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 28 }}>{item.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{item.title}</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{item.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CtaBanner({ onSubmit, url, setUrl, maxPages, setMaxPages, running, disabled }: {
  onSubmit: (e: React.FormEvent) => void
  url: string
  setUrl: (v: string) => void
  maxPages: number
  setMaxPages: (v: number) => void
  running: boolean
  disabled?: boolean
}) {
  return (
    <div style={{ background: '#111827', borderRadius: 16, padding: '40px 32px', marginBottom: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 8 }}>
        Audita tu sitio ahora — gratis
      </div>
      <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 28 }}>
        Sin registro. Sin tarjeta. Resultado en 30 segundos.
      </div>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://tuempresa.com"
          required
          disabled={running}
          style={{
            flex: '1 1 300px', maxWidth: 400, padding: '12px 16px', borderRadius: 8,
            border: '1px solid #374151', background: '#1f2937', color: 'white',
            fontSize: 15, outline: 'none',
          }}
        />
        <select
          value={maxPages}
          onChange={e => setMaxPages(Number(e.target.value))}
          disabled={running}
          style={{
            padding: '12px 14px', borderRadius: 8, border: '1px solid #374151',
            background: '#1f2937', color: '#9ca3af', fontSize: 14, cursor: 'pointer',
          }}
        >
          {[1, 3, 5, 10, 20].map(n => <option key={n} value={n}>{n} página{n > 1 ? 's' : ''}</option>)}
        </select>
        <button
          type="submit"
          disabled={running || disabled}
          style={{
            padding: '12px 28px', borderRadius: 8, border: 'none',
            background: running || disabled ? '#374151' : '#2563eb',
            color: 'white', fontSize: 15, fontWeight: 700,
            cursor: running || disabled ? 'not-allowed' : 'pointer',
          }}
        >
          Auditar →
        </button>
      </form>
    </div>
  )
}

// ── Email Gate ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'auditor_verified_email'

function EmailGate({ onVerified }: { onVerified: (email: string, remaining: number) => void }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'denied' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('checking')
    try {
      const res = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.authorized) {
        const verified = email.trim().toLowerCase()
        localStorage.setItem(STORAGE_KEY, verified)
        onVerified(verified, data.remaining ?? 0)
      } else {
        setStatus('denied')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 12 }}>
          GEO · Generative Engine Optimization
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 10px', lineHeight: 1.2 }}>
          AI Readability Auditor
        </h1>
        <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 36px', lineHeight: 1.6 }}>
          Herramienta de acceso restringido.<br />
          Ingresa tu usuario para verificar tu acceso.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setStatus('idle') }}
            placeholder="tu@usuario.com"
            required
            disabled={status === 'checking'}
            style={{
              padding: '13px 16px', borderRadius: 8, border: '1px solid #374151',
              background: '#1f2937', color: 'white', fontSize: 15, outline: 'none',
              textAlign: 'center',
            }}
          />
          <button
            type="submit"
            disabled={status === 'checking'}
            style={{
              padding: '13px', borderRadius: 8, border: 'none',
              background: status === 'checking' ? '#374151' : '#2563eb',
              color: 'white', fontSize: 15, fontWeight: 700,
              cursor: status === 'checking' ? 'not-allowed' : 'pointer',
            }}
          >
            {status === 'checking' ? 'Verificando…' : 'Acceder →'}
          </button>
        </form>

        {status === 'denied' && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#1f2937', borderRadius: 8, border: '1px solid #7f1d1d' }}>
            <div style={{ fontSize: 14, color: '#f87171' }}>Este usuario no tiene acceso autorizado.</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Contacta al administrador para solicitar acceso.</div>
          </div>
        )}
        {status === 'error' && (
          <div style={{ marginTop: 16, fontSize: 13, color: '#f87171' }}>
            Error de conexión — intenta de nuevo.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type AppState = 'idle' | 'running' | 'done' | 'error'

export default function Home() {
  const [verified, setVerified] = useState<boolean | null>(null)
  const [verifiedEmail, setVerifiedEmail] = useState('')
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setVerifiedEmail(saved)
      // Re-verify against Supabase to get current remaining count
      fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: saved }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.authorized) {
            setRemaining(data.remaining ?? 0)
            setVerified(true)
          } else {
            localStorage.removeItem(STORAGE_KEY)
            setVerified(false)
          }
        })
        .catch(() => setVerified(true)) // on network error, allow cached access
    } else {
      setVerified(false)
    }
  }, [])

  const [url, setUrl] = useState('')
  const [maxPages, setMaxPages] = useState(10)
  const [appState, setAppState] = useState<AppState>('idle')
  const [progress, setProgress] = useState<ProgressEvent[]>([])
  const [audit, setAudit] = useState<DomainAudit | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  if (verified === null) return null
  if (!verified) return <EmailGate onVerified={(email, rem) => { setVerifiedEmail(email); setRemaining(rem); setVerified(true) }} />

  async function startAudit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setAppState('running')
    setProgress([])
    setAudit(null)
    setErrorMsg('')

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), maxPages, email: verifiedEmail }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error desconocido')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const event = JSON.parse(line.slice(6))
          if (event.type === 'done') {
            setAudit(event.audit)
            setRemaining(event.remaining ?? 0)
            setAppState('done')
          } else if (event.type === 'error') {
            throw new Error(event.message)
          } else {
            setProgress(prev => [...prev, event as ProgressEvent])
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setAppState('error')
    }
  }

  function reset() {
    setAppState('idle')
    setProgress([])
    setAudit(null)
    setErrorMsg('')
    setUrl('')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{ background: '#111827', color: 'white', padding: appState === 'idle' ? '60px 16px 48px' : '40px 16px 32px', position: 'relative' }}>
        {/* Badge de auditorías restantes */}
        <div style={{ position: 'absolute', top: 16, right: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            background: remaining <= 1 ? '#7f1d1d' : remaining <= 2 ? '#78350f' : '#14532d',
            border: `1px solid ${remaining <= 1 ? '#dc2626' : remaining <= 2 ? '#d97706' : '#16a34a'}`,
            borderRadius: 20, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>{remaining}</span>
            <span style={{ fontSize: 11, color: '#d1d5db', fontWeight: 500 }}>
              {remaining === 1 ? 'auditoría' : 'auditorías'} restante{remaining !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 }}>
            GEO · Generative Engine Optimization
          </div>
          <h1 style={{ fontSize: appState === 'idle' ? 40 : 32, fontWeight: 800, margin: '0 0 14px', lineHeight: 1.15 }}>
            ¿Tu sitio es visible para la IA?
          </h1>
          <p style={{ fontSize: 16, color: '#9ca3af', margin: '0 0 32px', lineHeight: 1.6, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
            Analiza tu sitio y descubre qué tan bien puede ser indexado, entendido y citado por <strong style={{ color: '#e5e7eb' }}>ChatGPT, Perplexity y Google AI</strong>.
          </p>

          {/* Form */}
          <form onSubmit={startAudit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://tuempresa.com"
              required
              disabled={appState === 'running'}
              style={{
                flex: '1 1 320px', maxWidth: 420, padding: '12px 16px', borderRadius: 8,
                border: '1px solid #374151', background: '#1f2937', color: 'white',
                fontSize: 15, outline: 'none',
              }}
            />
            <select
              value={maxPages}
              onChange={e => setMaxPages(Number(e.target.value))}
              disabled={appState === 'running'}
              style={{
                padding: '12px 14px', borderRadius: 8, border: '1px solid #374151',
                background: '#1f2937', color: '#9ca3af', fontSize: 14, cursor: 'pointer',
              }}
            >
              {[1, 3, 5, 10, 20].map(n => <option key={n} value={n}>{n} página{n > 1 ? 's' : ''}</option>)}
            </select>
            <button
              type="submit"
              disabled={appState === 'running' || remaining === 0}
              style={{
                padding: '12px 28px', borderRadius: 8, border: 'none',
                background: appState === 'running' || remaining === 0 ? '#374151' : '#2563eb',
                color: 'white', fontSize: 15, fontWeight: 700,
                cursor: appState === 'running' || remaining === 0 ? 'not-allowed' : 'pointer',
                transition: 'background .2s',
              }}
            >
              {appState === 'running' ? 'Analizando…' : 'Auditar →'}
            </button>
          </form>
          {appState === 'idle' && remaining === 0 && (
            <div style={{ marginTop: 16, padding: '10px 16px', background: '#1f2937', borderRadius: 8, border: '1px solid #7f1d1d', display: 'inline-block' }}>
              <span style={{ fontSize: 13, color: '#f87171' }}>Has alcanzado el límite de auditorías. Contacta al administrador para continuar.</span>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 960, margin: '40px auto', padding: '0 16px' }}>
        {appState === 'idle' && (
          <>
            <WhyItMatters />
            <HowItWorks />
            <CheckPreview />
            <WhatYouGet />
            <CtaBanner
              onSubmit={startAudit}
              url={url}
              setUrl={setUrl}
              maxPages={maxPages}
              setMaxPages={setMaxPages}
              running={false}
              disabled={remaining === 0}
            />
          </>
        )}
        {appState === 'running' && <ProgressFeed events={progress} />}
        {appState === 'error' && (
          <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: 20, marginBottom: 24 }}>
            <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>❌ No se pudo completar la auditoría</div>
            <div style={{ fontSize: 13, color: '#374151', marginBottom: 16 }}>{errorMsg}</div>
            <button onClick={reset} style={{ background: '#111827', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              Intentar de nuevo
            </button>
          </div>
        )}
        {appState === 'done' && audit && <ResultsPanel audit={audit} onReset={reset} />}
      </div>
    </div>
  )
}
