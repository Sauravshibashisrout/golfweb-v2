import { requireAdmin, writeAuditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let ctx
  try { ctx = await requireAdmin(req) } catch (e) { return e as Response }

  const { winnerId, providerPayoutId, status } = await req.json().catch(() => ({}))
  if (!winnerId) return new Response('Missing winnerId', { status: 400 })

  const targetStatus = status === 'pending' ? 'pending' : 'paid'
  const db = ctx.adminClient
  const paidById = ctx.userId !== '00000000-0000-0000-0000-000000000000' ? ctx.userId : null

  // Ensure winner exists
  const { data: winner } = await db
    .from('draw_winners')
    .select('id, status, prize_amount_paise')
    .eq('id', winnerId)
    .in('status', ['approved', 'paid'])
    .maybeSingle()

  if (!winner) return new Response('Winner not found or not approved for payout', { status: 404 })

  const now = new Date().toISOString()

  // 1. Update payout record
  const payoutPayload: {
    winner_id: string
    amount_paise: number
    status: 'pending' | 'paid'
    provider_payout_id: string | null
    marked_paid_by: string | null
    paid_at: string | null
  } = {
    winner_id: winnerId,
    amount_paise: winner.prize_amount_paise,
    status: targetStatus,
    provider_payout_id: providerPayoutId ?? null,
    marked_paid_by: targetStatus === 'paid' ? paidById : null,
    paid_at: targetStatus === 'paid' ? now : null,
  }

  const { data: payout, error: payoutErr } = await db
    .from('payouts')
    .upsert(payoutPayload, { onConflict: 'winner_id' })
    .select()
    .single()

  if (payoutErr) return new Response(payoutErr.message, { status: 500 })

  // 2. Update winner status
  const newWinnerStatus = targetStatus === 'paid' ? 'paid' : 'approved'
  const { error: winnerErr } = await db
    .from('draw_winners')
    .update({ status: newWinnerStatus })
    .eq('id', winnerId)

  if (winnerErr) return new Response(winnerErr.message, { status: 500 })

  // 3. Record audit log
  await writeAuditLog(
    db,
    ctx.userId,
    targetStatus === 'paid' ? 'payout.paid' : 'payout.marked_pending',
    'payouts',
    payout?.id ?? null,
    { status: winner.status },
    {
      status: targetStatus,
      provider_payout_id: providerPayoutId,
      marked_paid_by: payoutPayload.marked_paid_by,
      paid_at: payoutPayload.paid_at,
    },
  )

  return Response.json({ ok: true, payout })
})
