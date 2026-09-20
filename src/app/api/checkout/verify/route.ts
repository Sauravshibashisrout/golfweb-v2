import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderId, paymentId, signature, planId } = await request.json()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // Forward event to razorpay-webhook to process subscription activation and 12-month split
  const webhookPayload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
          amount: planId === 'annual' ? 599900 : 59900,
          currency: 'INR',
          notes: {
            userId: user.id,
            planId: planId || 'monthly',
            kind: 'subscription',
          },
        },
      },
    },
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/razorpay-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': signature || 'verified_via_client',
    },
    body: JSON.stringify(webhookPayload),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok && !data.ok) {
    return NextResponse.json(
      { error: data.message || 'Webhook processing failed' },
      { status: res.status }
    )
  }

  return NextResponse.json({ ok: true })
}
