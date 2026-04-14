import type { CheckResult, Fetcher } from '../types.ts'

const AI_BOTS = ['GPTBot', 'Claude-Web', 'ClaudeBot', 'anthropic-ai', 'Bard', 'PerplexityBot', 'CCBot']

function blocksAIBots(text: string): boolean {
  // robots.txt groups rules by blank lines
  const groups = text.split(/\n\s*\n/)
  for (const group of groups) {
    const lines = group.split('\n').map(l => l.trim()).filter(Boolean)
    const agents: string[] = []
    const disallows: string[] = []

    for (const line of lines) {
      if (line.toLowerCase().startsWith('user-agent:')) {
        agents.push(line.split(':').slice(1).join(':').trim())
      } else if (line.toLowerCase().startsWith('disallow:')) {
        disallows.push(line.split(':').slice(1).join(':').trim())
      }
    }

    const blocksRoot = disallows.includes('/')
    if (!blocksRoot) continue

    // User-agent: * with Disallow: / blocks everyone, including AI bots
    if (agents.includes('*')) return true
    // Specific AI bot is blocked
    if (agents.some(a => AI_BOTS.includes(a))) return true
  }
  return false
}

export async function checkRobots(baseUrl: string, fetcher: Fetcher = fetch): Promise<CheckResult> {
  let text: string
  try {
    const res = await fetcher(`${baseUrl}/robots.txt`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) {
      return { name: 'robots.txt', status: 'fail', detail: `No encontrado (HTTP ${res.status})`, recommendation: 'Crea robots.txt en la raíz del dominio con "User-agent: *\\nAllow: /"', score: 0, maxScore: 10 }
    }
    text = await res.text()
  } catch {
    return { name: 'robots.txt', status: 'fail', detail: 'No accesible', recommendation: 'Crea robots.txt en la raíz del dominio.', score: 0, maxScore: 10 }
  }

  if (!/User-agent:/i.test(text)) {
    return { name: 'robots.txt', status: 'warn', detail: 'Existe pero sin directivas User-agent', recommendation: 'Agrega "User-agent: *\\nAllow: /" para indicar acceso general.', score: 5, maxScore: 10 }
  }

  if (blocksAIBots(text)) {
    return { name: 'robots.txt', status: 'warn', detail: `Bloquea bots de IA (${AI_BOTS.join(', ')})`, recommendation: 'Considera permitir bots de IA para mejorar visibilidad en búsquedas con IA.', score: 5, maxScore: 10 }
  }

  return { name: 'robots.txt', status: 'pass', detail: 'Existe, tiene User-agent y no bloquea bots de IA', score: 10, maxScore: 10 }
}
