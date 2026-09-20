import { adminClient, writeAuditLog } from '../_shared/auth.ts'
import { getPaymentProvider } from '../_shared/payment-provider.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const rawBody = await req.text()
  const sig = req.headers.get('x-razorpay-signature') ?? ''
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || 'placeholder'

  const provider = getPaymentProvider('razorpay')
  const isValid = await provider.verifyWebhookSignature(rawBody, sig, webhookSecret)
  if (!isValid) {
    return new Response('Invalid webhook signature', { status: 400 })
  }

  let eventData: Record<string, unknown>
  try {
    eventData = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON payload', { status: 400 })
  }

  const db = adminClient()
  const eventId = (eventData.event_id as string) || (eventData.id as string) || `rzp_evt_${Date.now()}`

  // 1. Idempotency guard via webhook_events
  const { data: existing } = await db
    .from('webhook_events')
    .select('id')
    .eq('provider', 'razorpay')
    .eq('provider_event_id', eventId)
    .maybeSingle()

  if (existing) {
    return new Response(JSON.stringify({ ok: true, message: 'Already processed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await db.from('webhook_events').insert({
    provider: 'razorpay',
    provider_event_id: eventId,
    payload: eventData as never,
  })

  try {
    await processWebhookEvent(db, eventData)

    await db
      .from('webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('provider', 'razorpay')
      .eq('provider_event_id', eventId)
  } catch (err) {
    console.error('Razorpay webhook processing error:', err)
    return new Response('Error processing event', { status: 500 })
  }

  return Response.json({ ok: true })
})

async function processWebhookEvent(db: ReturnType<typeof adminClient>, eventData: Record<string, unknown>) {
  const event = (eventData.event as string) || ''
  const payload = (eventData.payload as Record<string, unknown>) || {}
  const paymentObj = (payload.payment as Record<string, unknown>)?.entity as Record<string, unknown> || {}
  const orderObj = (payload.order as Record<string, unknown>)?.entity as Record<string, unknown> || {}

  // Accept payment.captured, order.paid, or test event
  if (event !== 'payment.captured' && event !== 'order.paid' && event !== 'test.payment') {
    return
  }

  const notes = (paymentObj.notes || orderObj.notes || {}) as Record<string, string>
  const userId = notes.userId
  const planId = notes.planId
  const kind = notes.kind || 'subscription'
  const charityId = notes.charityId
  const amountPaise = Number(paymentObj.amount || orderObj.amount || 0)
  const currency = String(paymentObj.currency || orderObj.currency || 'INR').toLowerCase()
  const paymentId = (paymentObj.id as string) || null
  const orderId = (orderObj.id || paymentObj.order_id as string) || null
  const now = new Date()
  const nowIso = now.toISOString()

  if (!userId || amountPaise <= 0) return

  // ---------------------------------------------------------------------------
  // Case A: Subscription Payment
  // ---------------------------------------------------------------------------
  if (kind === 'subscription' && planId) {
    const { data: plan } = await db
      .from('membership_plans')
      .select('id, interval_months, amount_paise')
      .eq('id', planId)
      .single()

    const intervalMonths = plan?.interval_months ?? 1
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + intervalMonths)

    // Upsert subscription
    const subPayload = {
      user_id: userId,
      plan_id: planId,
      provider: 'razorpay',
      provider_subscription_id: orderId,
      provider_checkout_session_id: orderId,
      status: 'active' as const,
      current_period_start: nowIso,
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      last_verified_at: nowIso,
    }

    const { data: sub } = await db
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'razorpay')
      .maybeSingle()

    let subscriptionId: string
    if (sub) {
      subscriptionId = sub.id
      await db.from('subscriptions').update(subPayload).eq('id', sub.id)
    } else {
      const { data: createdSub } = await db.from('subscriptions').insert(subPayload).select('id').single()
      subscriptionId = createdSub!.id
    }

    // Insert payment_transaction
    const { data: transaction } = await db
      .from('payment_transactions')
      .insert({
        user_id: userId,
        subscription_id: subscriptionId,
        provider: 'razorpay',
        payment_kind: 'subscription',
        amount_paise: amountPaise,
        currency,
        status: 'paid',
        provider_payment_id: paymentId,
        provider_order_id: orderId,
        paid_at: nowIso,
      })
      .select('id')
      .single()

    if (!transaction) return

    // Load active charity preference for user
    const { data: pref } = await db
      .from('charity_preferences')
      .select('charity_id, contribution_percentage')
      .eq('user_id', userId)
      .is('effective_to', null)
      .maybeSingle()

    const charityPct = pref?.contribution_percentage ?? 10
    const chosenCharityId = pref?.charity_id ?? null

    // Load allocation rules from app_settings
    const { data: rewardSetting } = await db.from('app_settings').select('value').eq('key', 'rewardPoolPct').single()
    const rewardPoolPct = Number(rewardSetting?.value ?? 25)

    // Annual Plan (12-month split) vs Monthly Plan (single month)
    const allocationsToInsert: {
      payment_transaction_id: string
      user_id: string
      charity_id: string | null
      allocation_type: 'charity' | 'reward_pool' | 'platform'
      amount_paise: number
      contribution_percentage: number | null
      recognition_month: string
    }[] = []

    const monthsToSplit = intervalMonths >= 12 ? 12 : 1
    const baseMonthlyAmount = Math.floor(amountPaise / monthsToSplit)
    const remainder = amountPaise - (baseMonthlyAmount * monthsToSplit)

    for (let i = 0; i < monthsToSplit; i++) {
      const recDate = new Date(now)
      recDate.setMonth(recDate.getMonth() + i)
      const recognitionMonth = `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-01`

      // Remainder added to month 0
      const monthAmount = i === 0 ? baseMonthlyAmount + remainder : baseMonthlyAmount

      const charityAmount = Math.floor((monthAmount * charityPct) / 100)
      const rewardAmount = Math.floor((monthAmount * rewardPoolPct) / 100)
      const platformAmount = monthAmount - charityAmount - rewardAmount

      allocationsToInsert.push(
        {
          payment_transaction_id: transaction.id,
          user_id: userId,
          charity_id: chosenCharityId,
          allocation_type: 'charity',
          amount_paise: charityAmount,
          contribution_percentage: charityPct,
          recognition_month: recognitionMonth,
        },
        {
          payment_transaction_id: transaction.id,
          user_id: userId,
          charity_id: null,
          allocation_type: 'reward_pool',
          amount_paise: rewardAmount,
          contribution_percentage: rewardPoolPct,
          recognition_month: recognitionMonth,
        },
        {
          payment_transaction_id: transaction.id,
          user_id: userId,
          charity_id: null,
          allocation_type: 'platform',
          amount_paise: platformAmount,
          contribution_percentage: 100 - charityPct - rewardPoolPct,
          recognition_month: recognitionMonth,
        }
      )
    }

    await db.from('payment_allocations').insert(allocationsToInsert)

    await writeAuditLog(
      db,
      userId,
      'subscription.activated',
      'subscriptions',
      subscriptionId,
      null,
      {
        planId,
        intervalMonths,
        amountPaise,
        allocationsCount: allocationsToInsert.length,
      }
    )
  }

  // ---------------------------------------------------------------------------
  // Case B: Direct Donation Payment
  // ---------------------------------------------------------------------------
  if (kind === 'donation' && charityId) {
    const { data: transaction } = await db
      .from('payment_transactions')
      .insert({
        user_id: userId,
        payment_kind: 'donation',
        amount_paise: amountPaise,
        currency,
        provider: 'razorpay',
        provider_payment_id: paymentId,
        provider_order_id: orderId,
        status: 'paid',
        paid_at: nowIso,
      })
      .select('id')
      .single()

    if (transaction) {
      // Update pending donation
      await db
        .from('direct_donations')
        .update({
          status: 'paid',
          payment_transaction_id: transaction.id,
        })
        .eq('charity_id', charityId)
        .eq('user_id', userId)
        .eq('status', 'pending')

      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      // 100% of direct donation allocated to charity
      await db.from('payment_allocations').insert({
        payment_transaction_id: transaction.id,
        user_id: userId,
        charity_id: charityId,
        allocation_type: 'charity',
        amount_paise: amountPaise,
        contribution_percentage: 100,
        recognition_month: currentMonth,
      })

      await writeAuditLog(db, userId, 'donation.paid', 'direct_donations', transaction.id, null, {
        charityId,
        amountPaise,
      })
    }
  }
}
