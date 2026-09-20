import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { adminClient } from '../_shared/auth.ts'
import { getPaymentProvider } from '../_shared/payment-provider.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { charityId, amountPaise, userId, provider = 'stripe', origin } = await req.json()

  // Validate amount (minimum ₹100 = 10,000 paise)
  if (!charityId || !amountPaise || typeof amountPaise !== 'number' || amountPaise < 10000) {
    return new Response('Invalid input — minimum donation is ₹100 (10,000 paise)', { status: 400 })
  }

  const db = adminClient()

  // Verify charity exists, is published, and not archived
  const { data: charity } = await db
    .from('charities')
    .select('id, name, slug, is_published, is_archived')
    .eq('id', charityId)
    .eq('is_published', true)
    .eq('is_archived', false)
    .maybeSingle()

  if (!charity) return new Response('Charity not found or inactive', { status: 404 })

  // Pre-create direct_donations row in pending status
  const { data: donation, error: donErr } = await db.from('direct_donations').insert({
    charity_id: charityId,
    user_id: userId ?? null,
    amount_paise: amountPaise,
    status: 'pending',
    payment_transaction_id: null,
  }).select('id').single()

  if (donErr) {
    return new Response(`Failed to create donation record: ${donErr.message}`, { status: 500 })
  }

  // ---------------------------------------------------------------------------
  // Case A: Stripe Checkout (payment mode)
  // ---------------------------------------------------------------------------
  if (provider === 'stripe') {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || ''
    const siteUrl = origin || Deno.env.get('SITE_URL') || 'http://localhost:3000'

    if (!stripeKey || stripeKey.includes('placeholder')) {
      // Mock session for sandbox/development environments without live Stripe keys
      const mockSessionId = `cs_mock_don_${Date.now()}`
      return Response.json({
        ok: true,
        provider: 'stripe',
        sessionId: mockSessionId,
        url: `${siteUrl}/charities/${charity.slug}?donation=success&session_id=${mockSessionId}&amount=${amountPaise}`,
        charity: { id: charity.id, name: charity.name },
      })
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-06-30.basil' })
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `Direct Donation to ${charity.name}`,
              description: '100% direct charitable contribution via GolfGives',
            },
            unit_amount: amountPaise,
          },
          quantity: 1,
        },
      ],
      metadata: {
        kind: 'donation',
        charityId,
        userId: userId ?? '',
        donationId: donation?.id ?? '',
      },
      success_url: `${siteUrl}/charities/${charity.slug}?donation=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/charities/${charity.slug}?donation=cancelled`,
    })

    return Response.json({
      ok: true,
      provider: 'stripe',
      sessionId: session.id,
      url: session.url,
      charity: { id: charity.id, name: charity.name },
    })
  }

  // ---------------------------------------------------------------------------
  // Case B: Razorpay Provider
  // ---------------------------------------------------------------------------
  const rzpProvider = getPaymentProvider('razorpay')
  const receipt = `rcpt_don_${charityId.slice(0, 6)}_${Date.now()}`

  const order = await rzpProvider.createOrder({
    amountPaise,
    currency: 'INR',
    receipt,
    notes: {
      charityId,
      userId: userId ?? '',
      kind: 'donation',
      donationId: donation?.id ?? '',
    },
  })

  return Response.json({
    ok: true,
    provider: 'razorpay',
    orderId: order.orderId,
    amountPaise: order.amountPaise,
    currency: order.currency,
    keyId: order.keyId,
    charity: {
      id: charity.id,
      name: charity.name,
    },
  })
})

