import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { adminClient, writeAuditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || ''
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event: Stripe.Event
  if (webhookSecret && !webhookSecret.includes('placeholder') && sig) {
    try {
      const stripe = new Stripe(stripeKey, { apiVersion: '2025-06-30.basil' })
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret)
    } catch {
      return new Response('Invalid signature', { status: 400 })
    }
  } else {
    // In sandbox/testing with placeholder keys, parse body directly
    try {
      event = JSON.parse(body) as Stripe.Event
    } catch {
      return new Response('Invalid JSON payload', { status: 400 })
    }
  }

  const db = adminClient()

  // Idempotency guard
  const { data: existing } = await db
    .from('webhook_events')
    .select('id')
    .eq('provider', 'stripe')
    .eq('provider_event_id', event.id)
    .maybeSingle()

  if (existing) return new Response('Already processed', { status: 200 })

  await db.from('webhook_events').insert({
    provider: 'stripe',
    provider_event_id: event.id,
    payload: event as never,
  })

  try {
    await handleEvent(db, event, stripeKey)
    await db.from('webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('provider_event_id', event.id)
  } catch (err) {
    console.error('Webhook handler error', err)
    return new Response('Handler error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
})

const STATUS_MAP: Record<string, string> = {
  active: 'active', past_due: 'past_due', canceled: 'cancelled',
  unpaid: 'lapsed', incomplete: 'inactive', incomplete_expired: 'inactive',
  trialing: 'active', paused: 'inactive',
}

async function handleEvent(
  db: ReturnType<typeof adminClient>,
  event: Stripe.Event,
  stripeKey: string,
) {
  const now = new Date()
  const nowIso = now.toISOString()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  switch (event.type) {
    // -------------------------------------------------------------------------
    // 1. Checkout Session Completed
    //    Handles both subscriptions and direct one-off donations
    // -------------------------------------------------------------------------
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const metadata = session.metadata ?? {}

      // Case A: Direct one-off donation
      if (session.mode === 'payment' || metadata.kind === 'donation') {
        const charityId = metadata.charityId
        const userId = metadata.userId || null
        const donationId = metadata.donationId || null
        const amountPaise = session.amount_total ?? 0
        const currency = (session.currency ?? 'inr').toLowerCase()
        const paymentIntentId = (session.payment_intent as string) || session.id

        if (!charityId || amountPaise <= 0) break

        // Record payment transaction
        const { data: txn } = await db
          .from('payment_transactions')
          .insert({
            user_id: userId,
            payment_kind: 'direct_donation',
            amount_paise: amountPaise,
            currency,
            provider: 'stripe',
            provider_payment_id: paymentIntentId,
            provider_order_id: session.id,
            status: 'paid',
            paid_at: nowIso,
          })
          .select('id')
          .single()

        // Update pre-created direct donation or insert if not existing
        if (donationId) {
          await db
            .from('direct_donations')
            .update({
              status: 'paid',
              payment_transaction_id: txn?.id ?? null,
            })
            .eq('id', donationId)
        } else {
          await db
            .from('direct_donations')
            .update({
              status: 'paid',
              payment_transaction_id: txn?.id ?? null,
            })
            .eq('charity_id', charityId)
            .eq('status', 'pending')
        }

        // 100% of direct donation is allocated to the charity
        if (txn) {
          await db.from('payment_allocations').insert({
            payment_transaction_id: txn.id,
            user_id: userId,
            charity_id: charityId,
            allocation_type: 'charity',
            amount_paise: amountPaise,
            contribution_percentage: 100,
            recognition_month: currentMonth,
          })
        }

        await writeAuditLog(db, userId || 'system', 'donation.paid', 'direct_donations', donationId || txn?.id || null, null, {
          charityId,
          amountPaise,
          provider: 'stripe',
          paymentIntentId,
        })

        // CRITICAL REQUIREMENT: Direct donations must NOT affect golf scores,
        // membership entitlement, or reward eligibility.
        break
      }

      // Case B: Subscription checkout
      if (session.mode === 'subscription') {
        const { userId, planId } = metadata
        if (!userId || !planId) break

        let stripeSub: Stripe.Subscription | null = null
        if (stripeKey && !stripeKey.includes('placeholder')) {
          const stripe = new Stripe(stripeKey, { apiVersion: '2025-06-30.basil' })
          stripeSub = await stripe.subscriptions.retrieve(session.subscription as string)
        }

        const periodStart = stripeSub ? new Date(stripeSub.current_period_start * 1000).toISOString() : nowIso
        const periodEnd = stripeSub ? new Date(stripeSub.current_period_end * 1000).toISOString() : new Date(now.getTime() + 30 * 86400000).toISOString()

        const payload = {
          user_id: userId,
          plan_id: planId,
          provider: 'stripe',
          provider_customer_id: session.customer as string,
          provider_subscription_id: (session.subscription as string) || session.id,
          provider_checkout_session_id: session.id,
          status: 'active' as const,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: stripeSub?.cancel_at_period_end ?? false,
          last_verified_at: nowIso,
        }

        // Verified Stripe subscriptions take precedence over any existing/test subscriptions
        const { data: existingSub } = await db.from('subscriptions').select('id, provider').eq('user_id', userId).maybeSingle()
        if (existingSub) {
          await db.from('subscriptions').update(payload).eq('id', existingSub.id)
        } else {
          await db.from('subscriptions').insert(payload)
        }
        await writeAuditLog(db, userId, 'subscription.activated', 'subscriptions', (session.subscription as string) || session.id, null, payload)
        break
      }

      break
    }

    case 'customer.subscription.updated': {
      const s = event.data.object as Stripe.Subscription
      const userId = s.metadata?.userId
      if (!userId) break
      const update = {
        status: (STATUS_MAP[s.status] ?? 'inactive') as never,
        current_period_start: new Date(s.current_period_start * 1000).toISOString(),
        current_period_end: new Date(s.current_period_end * 1000).toISOString(),
        cancel_at_period_end: s.cancel_at_period_end,
        last_verified_at: nowIso,
      }
      await db.from('subscriptions').update(update).eq('provider_subscription_id', s.id)
      await writeAuditLog(db, userId, 'subscription.updated', 'subscriptions', s.id, event.data.previous_attributes, update)
      break
    }

    case 'customer.subscription.deleted': {
      const s = event.data.object as Stripe.Subscription
      const userId = s.metadata?.userId
      if (!userId) break
      const update = { status: 'cancelled' as const, cancel_at_period_end: false, last_verified_at: nowIso }
      await db.from('subscriptions').update(update).eq('provider_subscription_id', s.id)
      await writeAuditLog(db, userId, 'subscription.cancelled', 'subscriptions', s.id, null, update)
      break
    }

    // -------------------------------------------------------------------------
    // 2. Invoice Payment Succeeded (Subscription billing event)
    //    Calculates allocations, freezes charity preference, handles 12-month split
    // -------------------------------------------------------------------------
    case 'invoice.payment_succeeded': {
      const inv = event.data.object as Stripe.Invoice
      if (!inv.subscription) break

      const { data: sub } = await db
        .from('subscriptions')
        .select('id, user_id, plan_id, membership_plans(interval_months)')
        .eq('provider_subscription_id', inv.subscription as string)
        .maybeSingle()

      if (!sub) break

      const amountPaise = inv.amount_paid
      const currency = (inv.currency ?? 'inr').toLowerCase()

      // Record payment transaction
      const { data: txn } = await db
        .from('payment_transactions')
        .insert({
          user_id: sub.user_id,
          subscription_id: sub.id,
          provider: 'stripe',
          payment_kind: 'subscription',
          amount_paise: amountPaise,
          currency,
          status: 'paid',
          provider_payment_id: (inv.payment_intent as string) || inv.id,
          provider_order_id: inv.id,
          paid_at: nowIso,
        })
        .select('id')
        .single()

      if (!txn) break

      // Save exact charity preference active at the time of payment
      const { data: pref } = await db
        .from('charity_preferences')
        .select('charity_id, contribution_percentage')
        .eq('user_id', sub.user_id)
        .is('effective_to', null)
        .maybeSingle()

      const charityPct = pref?.contribution_percentage ?? 10
      const chosenCharityId = pref?.charity_id ?? null

      // Reward pool percentage from app settings
      const { data: rewardSetting } = await db
        .from('app_settings')
        .select('value')
        .eq('key', 'rewardPoolPct')
        .single()
      const rewardPoolPct = Number(rewardSetting?.value ?? 25)

      // Calculate annual 12-month split vs monthly single allocation
      const intervalMonths = (sub.membership_plans as unknown as { interval_months: number })?.interval_months ?? 1
      const monthsToSplit = intervalMonths >= 12 ? 12 : 1
      const baseMonthlyAmount = Math.floor(amountPaise / monthsToSplit)
      const remainder = amountPaise - (baseMonthlyAmount * monthsToSplit)

      const allocationsToInsert: {
        payment_transaction_id: string
        user_id: string
        charity_id: string | null
        allocation_type: 'charity' | 'reward_pool' | 'platform'
        amount_paise: number
        contribution_percentage: number | null
        recognition_month: string
      }[] = []

      for (let i = 0; i < monthsToSplit; i++) {
        const recDate = new Date(now)
        recDate.setMonth(recDate.getMonth() + i)
        const recMonthStr = `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-01`

        // Add remainder to month 0
        const monthAmount = i === 0 ? baseMonthlyAmount + remainder : baseMonthlyAmount

        const charityAmount = Math.floor((monthAmount * charityPct) / 100)
        const rewardAmount = Math.floor((monthAmount * rewardPoolPct) / 100)
        const platformAmount = monthAmount - charityAmount - rewardAmount

        allocationsToInsert.push(
          {
            payment_transaction_id: txn.id,
            user_id: sub.user_id,
            charity_id: chosenCharityId,
            allocation_type: 'charity',
            amount_paise: charityAmount,
            contribution_percentage: charityPct,
            recognition_month: recMonthStr,
          },
          {
            payment_transaction_id: txn.id,
            user_id: sub.user_id,
            charity_id: null,
            allocation_type: 'reward_pool',
            amount_paise: rewardAmount,
            contribution_percentage: rewardPoolPct,
            recognition_month: recMonthStr,
          },
          {
            payment_transaction_id: txn.id,
            user_id: sub.user_id,
            charity_id: null,
            allocation_type: 'platform',
            amount_paise: platformAmount,
            contribution_percentage: 100 - charityPct - rewardPoolPct,
            recognition_month: recMonthStr,
          }
        )
      }

      await db.from('payment_allocations').insert(allocationsToInsert)

      await writeAuditLog(db, sub.user_id, 'payment.allocated', 'payment_allocations', txn.id, null, {
        provider: 'stripe',
        amountPaise,
        charityPct,
        chosenCharityId,
        monthsToSplit,
        allocationsCount: allocationsToInsert.length,
      })

      break
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice
      if (!inv.subscription) break
      await db.from('subscriptions')
        .update({ status: 'past_due', last_verified_at: nowIso })
        .eq('provider_subscription_id', inv.subscription as string)
      break
    }
  }
}

