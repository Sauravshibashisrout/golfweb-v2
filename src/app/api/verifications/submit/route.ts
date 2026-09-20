import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { winnerId, proofPath } = await req.json().catch(() => ({}))
  if (!winnerId || !proofPath) {
    return NextResponse.json({ error: 'Missing winnerId or proofPath' }, { status: 400 })
  }

  const db = createAdminClient()

  // Verify winner record ownership and eligibility
  const { data: winner, error: winnerErr } = await db
    .from('draw_winners')
    .select('id, status, user_id')
    .eq('id', winnerId)
    .eq('user_id', user.id)
    .in('status', ['pending_proof', 'rejected'])
    .maybeSingle()

  if (winnerErr || !winner) {
    return NextResponse.json(
      { error: 'Winner record not found or not eligible for proof submission' },
      { status: 403 }
    )
  }

  const now = new Date().toISOString()

  // 1. Update or create winner_verifications record
  const { data: verification, error: verifErr } = await db
    .from('winner_verifications')
    .upsert({
      winner_id: winnerId,
      submitted_by: user.id,
      proof_storage_path: proofPath,
      submitted_at: now,
      approved: null,
      rejection_reason: null,
      internal_audit_reason: null,
    }, { onConflict: 'winner_id' })
    .select()
    .single()

  if (verifErr) {
    return NextResponse.json({ error: verifErr.message }, { status: 500 })
  }

  // 2. Update draw_winners status to proof_submitted
  const { error: updateWinnerErr } = await db
    .from('draw_winners')
    .update({ status: 'proof_submitted' })
    .eq('id', winnerId)

  if (updateWinnerErr) {
    return NextResponse.json({ error: updateWinnerErr.message }, { status: 500 })
  }

  // 3. Record audit log for proof upload
  await db.from('audit_logs').insert({
    actor_id: user.id,
    action: 'proof.uploaded',
    entity_type: 'winner_verifications',
    entity_id: verification.id,
    before_data: { winner_status: winner.status },
    after_data: {
      winner_status: 'proof_submitted',
      proof_storage_path: proofPath,
      submitted_at: now,
    },
  })

  return NextResponse.json({ ok: true, verificationId: verification.id })
}
