import { requireAdmin, writeAuditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let ctx
  try { ctx = await requireAdmin(req) } catch (e) { return e as Response }

  const { verificationId, approved, rejectionReason, internalAuditReason } = await req.json()
  if (!verificationId || typeof approved !== 'boolean') {
    return new Response('Invalid input', { status: 400 })
  }

  // Dual rejection reason validation
  if (!approved && (!rejectionReason || !internalAuditReason)) {
    return new Response('Both user-facing rejection reason and internal audit reason are required for rejection', { status: 400 })
  }

  const db = ctx.adminClient
  const now = new Date().toISOString()
  const reviewerId = ctx.userId !== '00000000-0000-0000-0000-000000000000' ? ctx.userId : null

  const { data: verification } = await db
    .from('winner_verifications')
    .select('*, draw_winners(id, status, prize_amount_paise, user_id)')
    .eq('id', verificationId)
    .maybeSingle()

  if (!verification) return new Response('Verification not found', { status: 404 })

  const winner = verification.draw_winners as unknown as {
    id: string
    status: string
    prize_amount_paise: number
    user_id: string
  } | null

  if (!winner) return new Response('Associated winner record not found', { status: 404 })

  if (approved) {
    // 1. Update verification record
    const { error: verifErr } = await db.from('winner_verifications').update({
      approved: true,
      rejection_reason: null,
      internal_audit_reason: null,
      reviewed_by: reviewerId,
      reviewed_at: now,
    }).eq('id', verificationId)

    if (verifErr) return new Response(verifErr.message, { status: 500 })

    // 2. Update winner status to approved
    const { error: winnerErr } = await db.from('draw_winners').update({ status: 'approved' }).eq('id', winner.id)
    if (winnerErr) return new Response(winnerErr.message, { status: 500 })

    // 3. Create payout task with status 'pending'
    const { data: payout, error: payoutErr } = await db.from('payouts').upsert({
      winner_id: winner.id,
      amount_paise: winner.prize_amount_paise,
      status: 'pending',
    }, { onConflict: 'winner_id' }).select().single()

    if (payoutErr) return new Response(payoutErr.message, { status: 500 })

    // 4. Audit logs: Record proof.approved and payout.created
    await writeAuditLog(
      db, ctx.userId,
      'proof.approved',
      'winner_verifications', verificationId,
      { approved: null, winner_status: winner.status },
      { approved: true, winner_status: 'approved' },
    )

    if (payout) {
      await writeAuditLog(
        db, ctx.userId,
        'payout.created',
        'payouts', payout.id,
        null,
        { winner_id: winner.id, amount_paise: winner.prize_amount_paise, status: 'pending' },
      )
    }
  } else {
    // Rejected flow:
    // Update verification record with both user-facing and internal audit reasons
    const { error: verifErr } = await db.from('winner_verifications').update({
      approved: false,
      rejection_reason: rejectionReason,
      internal_audit_reason: internalAuditReason,
      reviewed_by: reviewerId,
      reviewed_at: now,
    }).eq('id', verificationId)

    if (verifErr) return new Response(verifErr.message, { status: 500 })

    // Update winner status to rejected (allowing re-upload by user)
    const { error: winnerErr } = await db.from('draw_winners').update({ status: 'rejected' }).eq('id', winner.id)
    if (winnerErr) return new Response(winnerErr.message, { status: 500 })

    // Audit log: Record proof.rejected with both reasons, actor, and timestamp
    await writeAuditLog(
      db, ctx.userId,
      'proof.rejected',
      'winner_verifications', verificationId,
      { approved: null, winner_status: winner.status },
      {
        approved: false,
        rejection_reason: rejectionReason,
        internal_audit_reason: internalAuditReason,
        winner_status: 'rejected',
      },
    )
  }

  return Response.json({ ok: true })
})
