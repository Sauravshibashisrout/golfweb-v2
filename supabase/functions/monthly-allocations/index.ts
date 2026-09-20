import { adminClient, writeAuditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  // Can be called via cron or admin POST
  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')

  // Simple auth check for cron / admin
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also allow service role key
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (authHeader !== `Bearer ${serviceKey}`) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const db = adminClient()
  const now = new Date()
  const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // 1. Sum up all recognized reward_pool allocations for this month
  const { data: allocations, error: allocErr } = await db
    .from('payment_allocations')
    .select('amount_paise')
    .eq('recognition_month', cycleMonth)
    .eq('allocation_type', 'reward_pool')

  if (allocErr) return new Response(`Failed to query allocations: ${allocErr.message}`, { status: 500 })

  const totalRewardPoolPaise = (allocations || []).reduce((sum, a) => sum + a.amount_paise, 0)

  // 2. Find or create the draw for this month
  const { data: existingDraw } = await db
    .from('draws')
    .select('id, status, reward_pool_paise')
    .eq('cycle_month', `${cycleMonth}-01`)
    .maybeSingle()

  let drawId: string
  if (existingDraw) {
    drawId = existingDraw.id
    if (existingDraw.status === 'draft') {
      await db
        .from('draws')
        .update({
          reward_pool_paise: totalRewardPoolPaise,
          updated_at: new Date().toISOString(),
        })
        .eq('id', drawId)
    }
  } else {
    const { data: newDraw } = await db
      .from('draws')
      .insert({
        title: `Monthly Draw - ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        cycle_month: `${cycleMonth}-01`,
        reward_pool_paise: totalRewardPoolPaise,
        status: 'draft',
        mode: 'random',
        cash_prize_enabled: false,
      })
      .select('id')
      .single()

    drawId = newDraw!.id
  }

  await writeAuditLog(
    db,
    'cron',
    'monthly_allocations.recognized',
    'draws',
    drawId,
    null,
    { cycleMonth, totalRewardPoolPaise, allocationCount: allocations?.length ?? 0 }
  )

  return Response.json({
    ok: true,
    cycleMonth,
    drawId,
    totalRewardPoolPaise,
    allocationsRecognized: allocations?.length ?? 0,
  })
})
