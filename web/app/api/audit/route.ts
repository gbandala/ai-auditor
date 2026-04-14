import { runAudit } from '@/lib/run-audit'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  let url: string
  let maxPages: number
  let email: string

  try {
    const body = await req.json()
    url = body.url?.trim()
    maxPages = Number(body.maxPages) || 10
    email = body.email?.trim().toLowerCase() ?? ''
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!url || !url.startsWith('http')) {
    return Response.json({ error: 'URL inválida — debe comenzar con http:// o https://' }, { status: 400 })
  }

  // Verificar límite de auditorías
  const { data: user, error: dbError } = await supabase
    .from('authorized_emails')
    .select('audit_count, max_audits')
    .eq('email', email)
    .maybeSingle()

  if (dbError) {
    console.error('Supabase error:', dbError)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }

  if (!user) {
    return Response.json({ error: 'Acceso no autorizado' }, { status: 403 })
  }

  const auditCount = user.audit_count ?? 0
  const maxAudits = user.max_audits ?? 5

  if (auditCount >= maxAudits) {
    return Response.json({ error: `Límite de ${maxAudits} auditorías alcanzado. Contacta al administrador para resetear tu contador.` }, { status: 403 })
  }

  // Incrementar contador antes de iniciar
  await supabase
    .from('authorized_emails')
    .update({ audit_count: auditCount + 1 })
    .eq('email', email)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      try {
        const audit = await runAudit(url, maxPages, (event) => send(event))
        send({ type: 'done', audit, remaining: maxAudits - (auditCount + 1) })
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
