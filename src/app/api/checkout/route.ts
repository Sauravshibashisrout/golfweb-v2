import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const body = await request.json().catch(() => ({}))

  // Route directly to Stripe Checkout
  const stripeCheckoutUrl = new URL('/api/stripe/checkout', origin)
  const res = await fetch(stripeCheckoutUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': request.headers.get('cookie') || '',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
