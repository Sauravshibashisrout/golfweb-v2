import { requireAdmin, writeAuditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let ctx
  try { ctx = await requireAdmin(req) } catch (e) { return e as Response }

  const { userId, role } = await req.json().catch(() => ({}))

  if (!userId) {
    return new Response('Missing userId', { status: 400 })
  }

  if (!['subscriber', 'admin'].includes(role)) {
    return new Response('Invalid role: must be subscriber or admin', { status: 400 })
  }

  const db = ctx.adminClient
  const now = new Date().toISOString()

  const { data: existing, error: fetchErr } = await db
    .from('profiles')
    .select('id, role, display_name')
    .eq('id', userId)
    .maybeSingle()

  if (fetchErr || !existing) {
    return new Response('User profile not found', { status: 404 })
  }

  const { data: updated, error: updateErr } = await db
    .from('profiles')
    .update({
      role,
      updated_at: now,
    })
    .eq('id', userId)
    .select()
    .single()

  if (updateErr) {
    return new Response(updateErr.message, { status: 500 })
  }

  // Create immutable audit log
  await writeAuditLog(
    db,
    ctx.userId,
    'user.role_changed',
    'profiles',
    userId,
    { role: existing.role },
    { role: updated.role },
  )

  return Response.json({ ok: true, user: updated })
})
