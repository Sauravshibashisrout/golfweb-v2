import { requireAdmin, writeAuditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let ctx
  try { ctx = await requireAdmin(req) } catch (e) { return e as Response }

  const { drawId, simulationId } = await req.json()
  if (!drawId || !simulationId) return new Response('Missing drawId or simulationId', { status: 400 })

  const db = ctx.adminClient

  // ── 1. Load draw ──────────────────────────────────────────────────────────
  const { data: draw } = await db
    .from('draws')
    .select('id, status, cash_prize_enabled, legal_approval_ref, cycle_month')
    .eq('id', drawId)
    .maybeSingle()

  if (!draw) return new Response('Draw not found', { status: 404 })
  if (draw.status === 'published') {
    return new Response('Published draw results are immutable', { status: 409 })
  }
  if (draw.status !== 'simulation_ready') {
    return new Response(`Draw must be simulation_ready to publish. Current: ${draw.status}`, { status: 409 })
  }

  // ── 2. Cash prize gate ────────────────────────────────────────────────────
  if (draw.cash_prize_enabled) {
    const { data: setting } = await db
      .from('app_settings').select('value').eq('key', 'cashPrizeDrawEnabled').single()
    if (setting?.value !== true) {
      return new Response(
        'cashPrizeDrawEnabled is false — cannot publish cash prizes',
        { status: 403 }
      )
    }
    if (!draw.legal_approval_ref) {
      return new Response('legal_approval_ref required to publish cash prizes', { status: 403 })
    }
  }

  // ── 3. Load the approved simulation ──────────────────────────────────────
  const { data: sim } = await db
    .from('draw_simulations')
    .select('projected_results, configuration_snapshot')
    .eq('id', simulationId)
    .eq('draw_id', drawId)
    .maybeSingle()

  if (!sim) return new Response('Simulation not found for this draw', { status: 404 })

  const results = sim.projected_results as {
    drawn_numbers: number[]
    sandbox_mode: boolean
    tier5: { winners: { entryId: string; userId: string }[]; prize_per_winner_paise: number; rollover_paise: number }
    tier4: { winners: { entryId: string; userId: string }[]; prize_per_winner_paise: number }
    tier3: { winners: { entryId: string; userId: string }[]; prize_per_winner_paise: number }
    jackpot_rollover_out_paise: number
  }

  if (!results.drawn_numbers?.length) {
    return new Response('Simulation has no drawn numbers', { status: 409 })
  }

  // Block publishing cash prizes from a sandbox simulation
  if (draw.cash_prize_enabled && results.sandbox_mode) {
    return new Response('Cannot publish cash prizes from a sandbox simulation', { status: 403 })
  }

  const now = new Date().toISOString()

  // ── 4. Write draw_winners + update draw_entries.matched_numbers ───────────
  const allWinners = [
    ...results.tier5.winners.map(w => ({ ...w, matchCount: 5, prizePerWinner: results.tier5.prize_per_winner_paise })),
    ...results.tier4.winners.map(w => ({ ...w, matchCount: 4, prizePerWinner: results.tier4.prize_per_winner_paise })),
    ...results.tier3.winners.map(w => ({ ...w, matchCount: 3, prizePerWinner: results.tier3.prize_per_winner_paise })),
  ]

  for (const w of allWinners) {
    // Update matched_numbers on the entry
    await db.from('draw_entries')
      .update({ matched_numbers: w.matchCount })
      .eq('id', w.entryId)

    // Create winner record
    const { data: winner } = await db.from('draw_winners').insert({
      draw_id: drawId,
      draw_entry_id: w.entryId,
      user_id: w.userId,
      match_count: w.matchCount,
      prize_amount_paise: draw.cash_prize_enabled ? w.prizePerWinner : 0,
      status: 'pending_proof',
    }).select('id').single()

    if (!winner) continue

    // Create pending verification record for each winner
    await db.from('winner_verifications').insert({
      winner_id: winner.id,
      submitted_by: w.userId,
      proof_storage_path: '', // placeholder — winner uploads via signed URL
      approved: null,
    })
  }

  // ── 5. Publish drawn_numbers to public draws table ────────────────────────
  //    This is the ONLY moment drawn_numbers becomes visible to subscribers.
  await db.from('draws').update({
    status: 'published',
    published_at: now,
    updated_at: now,
    drawn_numbers: results.drawn_numbers,
    jackpot_rollover_out_paise: results.jackpot_rollover_out_paise,
    tier_5_paise: results.tier5.prize_per_winner_paise,
    tier_4_paise: results.tier4.prize_per_winner_paise,
    tier_3_paise: results.tier3.prize_per_winner_paise,
  }).eq('id', drawId)

  // ── 6. Carry jackpot rollover into next draw if one exists ────────────────
  if (results.jackpot_rollover_out_paise > 0) {
    const nextMonth = getNextCycleMonth(draw.cycle_month)
    const { data: nextDraw } = await db
      .from('draws')
      .select('id, jackpot_rollover_in_paise')
      .eq('cycle_month', nextMonth)
      .eq('status', 'draft')
      .maybeSingle()

    if (nextDraw) {
      await db.from('draws').update({
        jackpot_rollover_in_paise: nextDraw.jackpot_rollover_in_paise + results.jackpot_rollover_out_paise,
        updated_at: now,
      }).eq('id', nextDraw.id)
    }
  }

  await writeAuditLog(db, ctx.userId, 'draw.published', 'draws', drawId,
    { status: 'simulation_ready' },
    {
      status: 'published',
      simulation_id: simulationId,
      drawn_numbers: results.drawn_numbers,
      winners: allWinners.length,
      jackpot_rollover_out_paise: results.jackpot_rollover_out_paise,
    }
  )

  return Response.json({
    ok: true,
    winnersCreated: allWinners.length,
    drawnNumbers: results.drawn_numbers,
    jackpotRolloverOutPaise: results.jackpot_rollover_out_paise,
  })
})

function getNextCycleMonth(cycleMonth: string): string {
  // Handles both "YYYY-MM" and "YYYY-MM-DD" formats
  const parts = cycleMonth.split('-').map(Number)
  const year = parts[0]
  const month = parts[1] // 1-indexed (1-12)
  const hasDay = parts.length >= 3
  const next = new Date(year, month, 1) // In JS Date, month (1-12) as 0-indexed month parameter gives next month
  const nextYear = next.getFullYear()
  const nextMonthStr = String(next.getMonth() + 1).padStart(2, '0')
  return hasDay ? `${nextYear}-${nextMonthStr}-01` : `${nextYear}-${nextMonthStr}`
}
