import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  let email: string

  try {
    const body = await req.json()
    email = body.email?.trim().toLowerCase()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!email || !email.includes('@')) {
    return Response.json({ error: 'Email inválido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('authorized_emails')
    .select('email, name, audit_count, max_audits')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    console.error('Supabase error:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }

  if (!data) {
    return Response.json({ authorized: false })
  }

  const remaining = Math.max(0, (data.max_audits ?? 5) - (data.audit_count ?? 0))

  return Response.json({
    authorized: true,
    name: data.name ?? null,
    remaining,
  })
}
