import { requireAdmin, writeAuditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let ctx
  try { ctx = await requireAdmin(req) } catch (e) { return e as Response }

  const body = await req.json().catch(() => ({}))
  const { title, cycleMonth, rewardPoolPaise, mode, cashPrizeEnabled, legalApprovalRef } = body

  if (!title || !cycleMonth) {
    return new Response('Missing required fields (title, cycleMonth)', { status: 400 })
  }

  const poolPaise = Number(rewardPoolPaise || 0)
  const isCash = Boolean(cashPrizeEnabled)
  const db = ctx.adminClient

  // Enforce cash prize rules:
  // "Prevent cash-draw publication unless cashPrizeDrawEnabled is true and the jurisdiction has a legal-approval record."
  if (isCash) {
    const { data: setting } = await db
      .from('app_settings')
      .select('value')
      .eq('key', 'cashPrizeDrawEnabled')
      .single()

    if (setting?.value !== true) {
      return new Response(
        JSON.stringify({ error: 'Cash prize draws are disabled in app_settings (cashPrizeDrawEnabled: false).' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (!legalApprovalRef || typeof legalApprovalRef !== 'string' || !legalApprovalRef.trim()) {
      return new Response(
        JSON.stringify({ error: 'Legal approval record reference is required for cash prize draws.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  const tier5 = Math.round(poolPaise * 0.40)
  const tier4 = Math.round(poolPaise * 0.35)
  const tier3 = Math.round(poolPaise * 0.25)

  const { data: draw, error: insertErr } = await db
    .from('draws')
    .insert({
      title: String(title).trim(),
      cycle_month: String(cycleMonth).trim(),
      reward_pool_paise: poolPaise,
      tier_5_paise: tier5,
      tier_4_paise: tier4,
      tier_3_paise: tier3,
      mode: mode === 'algorithmic' ? 'algorithmic' : 'random',
      status: 'draft',
      cash_prize_enabled: isCash,
      legal_approval_ref: isCash ? String(legalApprovalRef).trim() : null,
    })
    .select()
    .single()

  if (insertErr) {
    return new Response(insertErr.message, { status: 500 })
  }

  await writeAuditLog(db, ctx.userId, 'draw.created', 'draws', draw.id, null, draw)

  return Response.json({ ok: true, draw })
})
