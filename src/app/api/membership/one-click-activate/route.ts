import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const planId = body.planId === 'monthly' ? 'monthly' : 'annual'

    const adminDb = createAdminClient()
    const now = new Date()
    const foreverDate = '2099-12-31T23:59:59.000Z'

    // 1. Activate membership forever (no payments, 1-click testing mode)
    const { data: existingSub } = await adminDb
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    let sub
    let subErr
    if (existingSub) {
      const res = await adminDb
        .from('subscriptions')
        .update({
          plan_id: planId,
          provider: 'manual_test',
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: foreverDate,
          cancel_at_period_end: false,
          last_verified_at: now.toISOString(),
        })
        .eq('id', existingSub.id)
        .select('*, membership_plans(*)')
        .single()
      sub = res.data
      subErr = res.error
    } else {
      const res = await adminDb
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          provider: 'manual_test',
          provider_customer_id: null,
          provider_subscription_id: `test_forever_${user.id.slice(0, 8)}`,
          provider_checkout_session_id: null,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: foreverDate,
          cancel_at_period_end: false,
          last_verified_at: now.toISOString(),
        })
        .select('*, membership_plans(*)')
        .single()
      sub = res.data
      subErr = res.error
    }

    if (subErr) {
      console.error('Failed to activate test membership:', subErr)
      return NextResponse.json({ error: subErr.message }, { status: 500 })
    }

    // 2. Ensure user has an active charity preference
    const { data: existingPref } = await adminDb
      .from('charity_preferences')
      .select('id')
      .eq('user_id', user.id)
      .is('effective_to', null)
      .maybeSingle()

    if (!existingPref) {
      const { data: defaultCharity } = await adminDb
        .from('charities')
        .select('id')
        .eq('is_published', true)
        .eq('is_archived', false)
        .limit(1)
        .maybeSingle()

      if (defaultCharity) {
        await adminDb.from('charity_preferences').insert({
          user_id: user.id,
          charity_id: defaultCharity.id,
          contribution_percentage: 10,
          effective_from: now.toISOString(),
        })
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Membership activated with forever access!',
      subscription: sub,
      url: '/dashboard?membership=activated',
    })
  } catch (err: unknown) {
    console.error('One-click activation error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Activation failed' },
      { status: 500 }
    )
  }
}
