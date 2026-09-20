import { requireAdmin, writeAuditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let ctx
  try { ctx = await requireAdmin(req) } catch (e) { return e as Response }

  const { scoreId, stablefordScore, playedOn, auditNote } = await req.json().catch(() => ({}))

  if (!scoreId) {
    return new Response('Missing scoreId', { status: 400 })
  }

  const scoreNum = Number(stablefordScore)
  if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 45) {
    return new Response('Stableford score must be between 1 and 45', { status: 400 })
  }

  if (!auditNote || typeof auditNote !== 'string' || auditNote.trim().length < 5) {
    return new Response('A detailed audit note (at least 5 characters) is required to correct a score', { status: 400 })
  }

  const db = ctx.adminClient
  const now = new Date().toISOString()

  // Fetch existing score
  const { data: existing, error: fetchErr } = await db
    .from('golf_scores')
    .select('*')
    .eq('id', scoreId)
    .maybeSingle()

  if (fetchErr || !existing) {
    return new Response('Score not found', { status: 404 })
  }

  const updatePayload: { stableford_score: number; played_on?: string; updated_at: string } = {
    stableford_score: scoreNum,
    updated_at: now,
  }
  if (playedOn) {
    updatePayload.played_on = playedOn
  }

  const { data: updated, error: updateErr } = await db
    .from('golf_scores')
    .update(updatePayload)
    .eq('id', scoreId)
    .select()
    .single()

  if (updateErr) {
    return new Response(updateErr.message, { status: 500 })
  }

  // Create immutable audit log
  await writeAuditLog(
    db,
    ctx.userId,
    'golf_scores.corrected',
    'golf_scores',
    scoreId,
    {
      stableford_score: existing.stableford_score,
      played_on: existing.played_on,
    },
    {
      stableford_score: updated.stableford_score,
      played_on: updated.played_on,
      audit_note: auditNote.trim(),
    },
  )

  return Response.json({ ok: true, score: updated })
})
