import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('provider_customer_id')
    .eq('user_id', user.id)
    .eq('provider', 'stripe')
    .maybeSingle()

  if (!sub?.provider_customer_id) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
  }

  const origin = req.headers.get('origin') ?? ''
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.provider_customer_id,
    return_url: `${origin}/account`,
  })

  return NextResponse.json({ url: session.url })
}
