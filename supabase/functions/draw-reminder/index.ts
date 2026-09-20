import { adminClient, writeAuditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  const db = adminClient()

  // 1. Find all active subscribers
  const { data: activeSubs, error } = await db
    .from('subscriptions')
    .select('user_id, profiles(display_name)')
    .eq('status', 'active')

  if (error) return new Response(`Failed to query subscriptions: ${error.message}`, { status: 500 })

  const reminders: { userId: string; scoreCount: number; needed: number }[] = []

  for (const sub of activeSubs || []) {
    const { count } = await db
      .from('golf_scores')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', sub.user_id)

    const scoreCount = count ?? 0
    if (scoreCount < 5) {
      reminders.push({
        userId: sub.user_id,
        scoreCount,
        needed: 5 - scoreCount,
      })
    }
  }

  await writeAuditLog(
    db,
    'cron',
    'draw_reminder.generated',
    'subscriptions',
    null,
    null,
    { totalSubscribers: activeSubs?.length ?? 0, remindersSent: reminders.length, reminders }
  )

  return Response.json({
    ok: true,
    totalActiveSubscribers: activeSubs?.length ?? 0,
    remindersCount: reminders.length,
    reminders,
  })
})
