import { adminClient, writeAuditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const targetMonth = url.searchParams.get('month') || `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`

  const db = adminClient()

  // 1. Allocations breakdown for the month
  const { data: allocations } = await db
    .from('payment_allocations')
    .select('allocation_type, amount_paise, charity_id, charities(name)')
    .eq('recognition_month', targetMonth)

  let charityTotalPaise = 0
  let rewardPoolTotalPaise = 0
  let platformTotalPaise = 0
  const charityBreakdown: Record<string, { name: string; amountPaise: number }> = {}

  for (const a of allocations || []) {
    if (a.allocation_type === 'charity') {
      charityTotalPaise += a.amount_paise
      if (a.charity_id) {
        if (!charityBreakdown[a.charity_id]) {
          const charityData = a.charities as unknown as { name: string } | null
          charityBreakdown[a.charity_id] = {
            name: charityData?.name || 'Unknown Charity',
            amountPaise: 0,
          }
        }
        charityBreakdown[a.charity_id].amountPaise += a.amount_paise
      }
    } else if (a.allocation_type === 'reward_pool') {
      rewardPoolTotalPaise += a.amount_paise
    } else if (a.allocation_type === 'platform') {
      platformTotalPaise += a.amount_paise
    }
  }

  // 2. Payouts for the month
  const { data: payouts } = await db
    .from('payouts')
    .select('amount_paise, status')
    .gte('paid_at', `${targetMonth}-01T00:00:00Z`)
    .lte('paid_at', `${targetMonth}-31T23:59:59Z`)

  const totalPaidOutPaise = (payouts || [])
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount_paise, 0)

  const report = {
    month: targetMonth,
    charityTotalPaise,
    rewardPoolTotalPaise,
    platformTotalPaise,
    totalGrossPaise: charityTotalPaise + rewardPoolTotalPaise + platformTotalPaise,
    charityBreakdown: Object.entries(charityBreakdown).map(([id, data]) => ({
      charityId: id,
      charityName: data.name,
      amountPaise: data.amountPaise,
    })),
    totalPaidOutPaise,
    generatedAt: new Date().toISOString(),
  }

  await writeAuditLog(
    db,
    'reporting',
    'monthly_report.generated',
    'reports',
    targetMonth,
    null,
    report
  )

  return Response.json({ ok: true, report })
})
