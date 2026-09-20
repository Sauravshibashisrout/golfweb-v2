import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
  }

  const { userId } = await req.json().catch(() => ({}))
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const db = createAdminClient()

  // 1. Fetch existing manual_test subscription
  const { data: existingSub } = await db
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'manual_test')
    .maybeSingle()

  if (!existingSub) {
    return NextResponse.json(
      { error: 'No manual_test membership found for this user' },
      { status: 404 }
    )
  }

  // 2. Safely remove the test subscription record
  const { error: deleteErr } = await db
    .from('subscriptions')
    .delete()
    .eq('id', existingSub.id)

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 })
  }

  // 3. Write immutable audit log
  await db.from('audit_logs').insert({
    actor_id: ctx.userId,
    action: 'subscription.test_membership_revoked',
    entity_type: 'subscriptions',
    entity_id: existingSub.id,
    before_data: existingSub as never,
    after_data: null,
  })

  return NextResponse.json({
    ok: true,
    message: `Test membership for user ${userId} has been revoked successfully.`,
    revokedSubscriptionId: existingSub.id,
  })
}
