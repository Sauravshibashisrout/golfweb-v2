import { requireAuth } from '../_shared/auth.ts'
import { getPaymentProvider } from '../_shared/payment-provider.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let ctx
  try { ctx = await requireAuth(req) } catch (e) { return e as Response }

  const { planId } = await req.json()
  if (!planId) return new Response('Missing planId', { status: 400 })

  const db = ctx.adminClient

  // 1. Never trust client amounts: load plan from database
  const { data: plan } = await db
    .from('membership_plans')
    .select('id, name, amount_paise, currency, interval_months, is_active')
    .eq('id', planId)
    .eq('is_active', true)
    .maybeSingle()

  if (!plan) return new Response('Invalid or inactive plan', { status: 404 })

  // 2. Fetch user profile for metadata
  const { data: profile } = await db
    .from('profiles')
    .select('display_name')
    .eq('id', ctx.userId)
    .single()

  // 3. Create order via PaymentProvider
  const provider = getPaymentProvider('razorpay')
  const receipt = `rcpt_sub_${ctx.userId.slice(0, 8)}_${Date.now()}`

  const order = await provider.createOrder({
    amountPaise: plan.amount_paise,
    currency: plan.currency.toUpperCase(),
    receipt,
    notes: {
      userId: ctx.userId,
      planId: plan.id,
      intervalMonths: String(plan.interval_months),
      kind: 'subscription',
    },
  })

  // 4. Pre-record transaction in pending state
  await db.from('payment_transactions').insert({
    user_id: ctx.userId,
    payment_kind: 'subscription',
    amount_paise: plan.amount_paise,
    currency: plan.currency,
    provider: 'razorpay',
    provider_order_id: order.orderId,
    status: 'pending',
  })

  return Response.json({
    ok: true,
    orderId: order.orderId,
    amountPaise: order.amountPaise,
    currency: order.currency,
    keyId: order.keyId,
    plan: {
      id: plan.id,
      name: plan.name,
      intervalMonths: plan.interval_months,
    },
    user: {
      id: ctx.userId,
      name: profile?.display_name ?? '',
    },
  })
})
