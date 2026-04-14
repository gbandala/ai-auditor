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
    .select('email, name')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    console.error('Supabase error:', error)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }

  return Response.json({ authorized: !!data, name: data?.name ?? null })
}
