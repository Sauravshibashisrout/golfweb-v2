import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { charityId, amountPaise } = await request.json()
  if (!charityId || !amountPaise) {
    return NextResponse.json({ error: 'Missing charityId or amountPaise' }, { status: 400 })
  }

  const adminDb = createAdminClient()
  const now = new Date()
  const nowIso = now.toISOString()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  try {
    const { data: txn } = await adminDb.from('payment_transactions').insert({
      user_id: user?.id || null,
      payment_kind: 'direct_donation',
      amount_paise: amountPaise,
      currency: 'inr',
      provider: 'manual_test',
      provider_payment_id: `pi_mock_don_${Date.now()}`,
      provider_order_id: `cs_mock_${Date.now()}`,
      status: 'paid',
      paid_at: nowIso,
    }).select('id').single()

    if (txn) {
      await adminDb.from('direct_donations').insert({
        user_id: user?.id || null,
        charity_id: charityId,
        amount_paise: amountPaise,
        status: 'paid',
        payment_transaction_id: txn.id,
      })

      await adminDb.from('payment_allocations').insert({
        payment_transaction_id: txn.id,
        user_id: user?.id || null,
        charity_id: charityId,
        allocation_type: 'charity',
        amount_paise: amountPaise,
        contribution_percentage: 100,
        recognition_month: currentMonth,
      })
    }

    return NextResponse.json({ ok: true, sessionId: txn?.id })
  } catch (e) {
    console.error('Failed to record donation:', e)
    return NextResponse.json({ error: 'Failed to process donation' }, { status: 500 })
  }
}
