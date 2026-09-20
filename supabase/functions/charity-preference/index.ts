import { requireActiveSub, writeAuditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let ctx
  try { ctx = await requireActiveSub(req) } catch (e) { return e as Response }

  const { charityId, contributionPercentage } = await req.json()

  const ALLOWED_PCTS = [10, 15, 20, 25, 30, 40]
  if (!charityId || !ALLOWED_PCTS.includes(contributionPercentage)) {
    return new Response('Invalid input', { status: 400 })
  }

  const db = ctx.adminClient
  const now = new Date().toISOString()

  // Verify charity is published
  const { data: charity } = await db.from('charities').select('id').eq('id', charityId).eq('is_published', true).maybeSingle()
  if (!charity) return new Response('Charity not found', { status: 404 })

  // Close current active preference
  const { data: current } = await db
    .from('charity_preferences')
    .select('id, charity_id, contribution_percentage')
    .eq('user_id', ctx.userId)
    .is('effective_to', null)
    .maybeSingle()

  if (current) {
    await db.from('charity_preferences').update({ effective_to: now }).eq('id', current.id)
  }

  // Open new preference
  const { data: next } = await db.from('charity_preferences').insert({
    user_id: ctx.userId,
    charity_id: charityId,
    contribution_percentage: contributionPercentage,
    effective_from: now,
  }).select().single()

  await writeAuditLog(db, ctx.userId, 'charity_preference.changed', 'charity_preferences', next?.id ?? null, current, next)

  return Response.json({ ok: true, preference: next })
})
