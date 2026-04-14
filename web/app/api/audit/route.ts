import { runAudit } from '@/lib/run-audit'

export async function POST(req: Request) {
  let url: string
  let maxPages: number

  try {
    const body = await req.json()
    url = body.url?.trim()
    maxPages = Number(body.maxPages) || 10
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!url || !url.startsWith('http')) {
    return Response.json({ error: 'URL inválida — debe comenzar con http:// o https://' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      try {
        const audit = await runAudit(url, maxPages, (event) => send(event))
        send({ type: 'done', audit })
      } catch (e) {
        send({ type: 'error', message: e instanceof Error ? e.message : String(e) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
