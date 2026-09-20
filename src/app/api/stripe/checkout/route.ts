import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const PRICE_MAP: Record<string, string> = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || 'price_monthly_599',
  annual: process.env.STRIPE_PRICE_ANNUAL || 'price_annual_5999',
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { planId } = body

  if (!planId || !['monthly', 'annual'].includes(planId)) {
    return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Please sign in to subscribe' }, { status: 401 })
  }

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const stripeKey = process.env.STRIPE_SECRET_KEY

  // In sandbox / test environment with placeholder keys, return sandbox checkout session and auto-activate
  if (!stripeKey || stripeKey.includes('placeholder')) {
    const mockSessionId = `cs_mock_sub_${Date.now()}`
    const now = new Date()
    const nowIso = now.toISOString()
    const periodEnd = '2099-12-31T23:59:59.000Z'
    const amountPaise = planId === 'annual' ? 599900 : 59900

    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const adminDb = createAdminClient()

      const { data: existingSub } = await adminDb
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      let sub
      if (existingSub) {
        const res = await adminDb
          .from('subscriptions')
          .update({
            plan_id: planId,
            provider: 'manual_test',
            status: 'active',
            current_period_start: nowIso,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
            last_verified_at: nowIso,
          })
          .eq('id', existingSub.id)
          .select('id')
          .single()
        sub = res.data
      } else {
        const res = await adminDb
          .from('subscriptions')
          .insert({
            user_id: user.id,
            plan_id: planId,
            provider: 'manual_test',
            provider_customer_id: null,
            provider_subscription_id: `test_forever_${user.id.slice(0, 8)}`,
            provider_checkout_session_id: mockSessionId,
            status: 'active',
            current_period_start: nowIso,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
            last_verified_at: nowIso,
          })
          .select('id')
          .single()
        sub = res.data
      }

      // Record payment transaction
      const { data: txn } = await adminDb
        .from('payment_transactions')
        .insert({
          user_id: user.id,
          subscription_id: sub?.id,
          payment_kind: 'subscription_recurring',
          amount_paise: amountPaise,
          currency: 'inr',
          provider: 'stripe',
          provider_payment_id: `pi_mock_${Date.now()}`,
          provider_order_id: mockSessionId,
          status: 'paid',
          paid_at: nowIso,
        })
        .select('id')
        .single()

      // Fetch user charity preference
      const { data: pref } = await adminDb
        .from('charity_preferences')
        .select('charity_id, contribution_percentage')
        .eq('user_id', user.id)
        .is('effective_to', null)
        .maybeSingle()

      let charityId = pref?.charity_id
      const charityPct = pref?.contribution_percentage ?? 10

      if (!charityId) {
        const { data: defaultCharity } = await adminDb.from('charities').select('id').limit(1).maybeSingle()
        charityId = defaultCharity?.id
      }

      if (charityId && txn?.id) {
        const totalCharityPaise = Math.floor((amountPaise * charityPct) / 100)
        if (planId === 'annual') {
          const monthlyPaise = Math.floor(totalCharityPaise / 12)
          const remainder = totalCharityPaise - monthlyPaise * 12
          const allocs = []
          for (let m = 0; m < 12; m++) {
            const recDate = new Date(now.getFullYear(), now.getMonth() + m, 1)
            const recMonth = `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-01`
            allocs.push({
              payment_transaction_id: txn.id,
              user_id: user.id,
              charity_id: charityId,
              allocation_type: 'charity' as const,
              amount_paise: monthlyPaise + (m === 0 ? remainder : 0),
              contribution_percentage: charityPct,
              recognition_month: recMonth,
            })
          }
          await adminDb.from('payment_allocations').insert(allocs)
        } else {
          const recMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
          await adminDb.from('payment_allocations').insert({
            payment_transaction_id: txn.id,
            user_id: user.id,
            charity_id: charityId,
            allocation_type: 'charity',
            amount_paise: totalCharityPaise,
            contribution_percentage: charityPct,
            recognition_month: recMonth,
          })
        }
      }
    } catch (e) {
      console.error('Failed to auto-activate sandbox subscription:', e)
    }

    return NextResponse.json({
      url: `${origin}/dashboard?checkout=success&session_id=${mockSessionId}&plan=${planId}`,
    })
  }

  const priceId = PRICE_MAP[planId]

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-06-30.basil' as never })
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      ...(user.email && { customer_email: user.email }),
      metadata: { planId, userId: user.id },
      subscription_data: { metadata: { planId, userId: user.id } },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    console.error('Stripe Checkout session error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
