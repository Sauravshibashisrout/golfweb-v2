import { adminClient, writeAuditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  const db = adminClient()
  const now = new Date().toISOString()

  // Find all active subscriptions whose current_period_end has passed
  const { data: expiredSubs, error } = await db
    .from('subscriptions')
    .select('id, user_id, current_period_end, status')
    .eq('status', 'active')
    .not('current_period_end', 'is', null)
    .lt('current_period_end', now)

  if (error) return new Response(`Failed to query expired subscriptions: ${error.message}`, { status: 500 })

  const sweptIds: string[] = []

  for (const sub of expiredSubs || []) {
    await db
      .from('subscriptions')
      .update({
        status: 'past_due',
        last_verified_at: now,
        updated_at: now,
      })
      .eq('id', sub.id)

    sweptIds.push(sub.id)

    await writeAuditLog(
      db,
      'cron',
      'subscription.expired',
      'subscriptions',
      sub.id,
      { status: 'active' },
      { status: 'past_due', periodEnd: sub.current_period_end }
    )
  }

  return Response.json({
    ok: true,
    sweptCount: sweptIds.length,
    sweptIds,
  })
})
