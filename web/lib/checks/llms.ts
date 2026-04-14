import type { CheckResult, Fetcher } from '../types'

export async function checkLlms(baseUrl: string, fetcher: Fetcher = fetch): Promise<CheckResult> {
  let text: string
  try {
    const res = await fetcher(`${baseUrl}/llms.txt`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) {
      return { name: 'llms.txt', status: 'fail', detail: 'No encontrado', recommendation: 'Crea /llms.txt siguiendo el estándar llmstxt.org. Estructura mínima: "# Nombre\\n\\n> Descripción\\n\\n## Sección\\n\\n- [Recurso](url)"', score: 0, maxScore: 15 }
    }
    text = await res.text()
  } catch {
    return { name: 'llms.txt', status: 'fail', detail: 'No accesible', recommendation: 'Crea /llms.txt en la raíz del dominio.', score: 0, maxScore: 15 }
  }
  const hasH1 = /^#\s+.+/m.test(text)
  const hasSection = /^##\s+.+/m.test(text)
  const hasLink = /\[.+\]\(https?:\/\/.+\)/.test(text)
  if (!hasH1 || !hasSection) {
    return { name: 'llms.txt', status: 'warn', detail: 'Existe pero sin estructura de headings (# Título, ## Sección)', recommendation: 'Agrega un "# Título" y al menos una "## Sección" con links a documentación.', score: 8, maxScore: 15 }
  }
  if (!hasLink) {
    return { name: 'llms.txt', status: 'warn', detail: 'Existe con headings pero sin links a recursos', recommendation: 'Agrega links a documentación, APIs o páginas clave: "- [Docs](https://...)"', score: 10, maxScore: 15 }
  }
  return { name: 'llms.txt', status: 'pass', detail: 'Existe con título, secciones y links a recursos', score: 15, maxScore: 15 }
}
