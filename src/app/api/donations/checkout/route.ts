import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { charityId, amountPaise } = await request.json()
  if (!charityId || !amountPaise) {
    return NextResponse.json({ error: 'Missing charityId or amountPaise' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/direct-donation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      charityId,
      amountPaise,
      userId: user?.id || null,
    }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    return NextResponse.json(
      { error: data.message || data.error || 'Failed to create donation order' },
      { status: res.status }
    )
  }

  // If sandbox / placeholder mode, auto-record the successful donation
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey || stripeKey.includes('placeholder')) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const adminDb = createAdminClient()
      const now = new Date()
      const nowIso = now.toISOString()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

      const { data: txn } = await adminDb.from('payment_transactions').insert({
        user_id: user?.id || null,
        payment_kind: 'direct_donation',
        amount_paise: amountPaise,
        currency: 'inr',
        provider: 'stripe',
        provider_payment_id: `pi_mock_don_${Date.now()}`,
        provider_order_id: data.sessionId || `cs_mock_${Date.now()}`,
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
    } catch (e) {
      console.error('Failed to auto-record sandbox donation:', e)
    }
  }

  return NextResponse.json(data)
}
