import { requireAdmin, adminClient, writeAuditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let ctx
  try { ctx = await requireAdmin(req) } catch (e) { return e as Response }

  const { drawId } = await req.json()
  if (!drawId) return new Response('Missing drawId', { status: 400 })

  const db = ctx.adminClient

  // ── 1. Load draw ──────────────────────────────────────────────────────────
  const { data: draw } = await db
    .from('draws')
    .select('id, status, cash_prize_enabled, legal_approval_ref, mode, algo_formula_hash, cycle_month')
    .eq('id', drawId)
    .maybeSingle()

  if (!draw) return new Response('Draw not found', { status: 404 })
  if (draw.status !== 'draft') {
    return new Response(`Draw must be in draft to lock. Current: ${draw.status}`, { status: 409 })
  }

  // ── 2. Cash prize gate ────────────────────────────────────────────────────
  if (draw.cash_prize_enabled) {
    if (!draw.legal_approval_ref) {
      return new Response(
        'cash_prize_enabled requires a legal_approval_ref to be recorded first',
        { status: 403 }
      )
    }
    const { data: setting } = await db
      .from('app_settings').select('value').eq('key', 'cashPrizeDrawEnabled').single()
    if (setting?.value !== true) {
      return new Response(
        'cashPrizeDrawEnabled is false in app_settings — cash prizes are not permitted',
        { status: 403 }
      )
    }
  }

  // ── 3. Algorithmic mode: formula hash must be set before lock ─────────────
  if (draw.mode === 'algorithmic' && !draw.algo_formula_hash) {
    return new Response(
      'Algorithmic draws require algo_formula_hash to be set before locking',
      { status: 409 }
    )
  }

  // ── 4. Find eligible subscribers ─────────────────────────────────────────
  //    Eligible = active subscription + exactly 5 saved scores
  const { data: activeSubs } = await db
    .from('subscriptions')
    .select('user_id')
    .eq('status', 'active')

  if (!activeSubs?.length) {
    return new Response('No active subscribers to lock entries for', { status: 409 })
  }

  const eligibleUserIds: string[] = []
  const entryPayloads: {
    draw_id: string
    user_id: string
    score_snapshot: number[]
    score_date_snapshot: string[]
    entry_weight: number
    matched_numbers: number
  }[] = []

  for (const sub of activeSubs) {
    const { data: scores } = await db
      .from('golf_scores')
      .select('stableford_score, played_on')
      .eq('user_id', sub.user_id)
      .order('played_on', { ascending: false })
      .limit(5)

    // Must have exactly 5 scores to qualify
    if (!scores || scores.length < 5) continue

    const latest5 = scores.slice(0, 5)
    const scoreValues = latest5.map(s => s.stableford_score)
    const scoreDates = latest5.map(s => s.played_on)
    const distinctCount = new Set(scoreValues).size

    eligibleUserIds.push(sub.user_id)
    entryPayloads.push({
      draw_id: drawId,
      user_id: sub.user_id,
      score_snapshot: scoreValues,
      score_date_snapshot: scoreDates,
      entry_weight: 1,
      matched_numbers: 0, // calculated at publish
    })

    // Warn in audit if duplicate scores reduce distinct matching opportunities
    if (distinctCount < 5) {
      await writeAuditLog(
        db, ctx.userId,
        'draw.entry.duplicate_scores_warning',
        'draw_entries', null,
        null,
        { userId: sub.user_id, distinctCount, scoreValues }
      )
    }
  }

  if (entryPayloads.length === 0) {
    return new Response('No eligible subscribers (need 5 scores each)', { status: 409 })
  }

  // ── 5. Write immutable entry snapshots ────────────────────────────────────
  const { error: insertErr } = await db.from('draw_entries').insert(entryPayloads)
  if (insertErr) return new Response(`Entry insert failed: ${insertErr.message}`, { status: 500 })

  // ── 6. Lock the draw ──────────────────────────────────────────────────────
  const now = new Date().toISOString()
  await db.from('draws').update({
    status: 'locked',
    entry_lock_at: now,
    updated_at: now,
  }).eq('id', drawId)

  await writeAuditLog(db, ctx.userId, 'draw.locked', 'draws', drawId,
    { status: 'draft' },
    { status: 'locked', entry_count: entryPayloads.length, eligible_users: eligibleUserIds.length }
  )

  return Response.json({
    ok: true,
    entryCount: entryPayloads.length,
    eligibleUsers: eligibleUserIds.length,
  })
})
