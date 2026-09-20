import { requireAdmin, writeAuditLog } from '../_shared/auth.ts'
import {
  secureDrawNumbers,
  algorithmicDrawNumbers,
  scoreEntry,
  calculateTiers,
} from '../_shared/draw-engine.ts'

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
    .select('*')
    .eq('id', drawId)
    .maybeSingle()

  if (!draw) return new Response('Draw not found', { status: 404 })
  if (draw.status !== 'locked') {
    return new Response(`Draw must be locked before simulation. Current: ${draw.status}`, { status: 409 })
  }

  // ── 2. Sandbox gate ───────────────────────────────────────────────────────
  const { data: setting } = await db
    .from('app_settings').select('value').eq('key', 'cashPrizeDrawEnabled').single()
  const cashEnabled = setting?.value === true
  const sandboxMode = !cashEnabled

  // Cash prize draws require legal approval — block if not set
  if (draw.cash_prize_enabled && sandboxMode) {
    return new Response(
      'cashPrizeDrawEnabled is false — cash prize simulation blocked',
      { status: 403 }
    )
  }

  // ── 3. Load locked entries ────────────────────────────────────────────────
  const { data: entries } = await db
    .from('draw_entries')
    .select('id, user_id, score_snapshot, score_date_snapshot')
    .eq('draw_id', drawId)

  if (!entries?.length) return new Response('No locked entries found', { status: 409 })

  // ── 4. Generate winning numbers ───────────────────────────────────────────
  //    Numbers stay in private.draw_secrets — NOT written to public draws table yet.
  let drawnNumbers: number[]

  if (draw.mode === 'algorithmic') {
    if (!draw.algo_formula_hash) {
      return new Response('algo_formula_hash missing for algorithmic draw', { status: 409 })
    }
    drawnNumbers = await algorithmicDrawNumbers(
      drawId,
      draw.cycle_month,
      draw.algo_formula_hash,
      entries.length,
    )
  } else {
    drawnNumbers = secureDrawNumbers()
  }

  // ── 5. Hash the seed for audit trail ─────────────────────────────────────
  const seedInput = `${drawId}:${drawnNumbers.join(',')}:${Date.now()}`
  const seedHash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seedInput)))
  ).map(b => b.toString(16).padStart(2, '0')).join('')

  // Store seed hash in private schema — never readable by subscribers
  await db.schema('private' as never).from('draw_secrets').upsert({
    draw_id: drawId,
    random_seed_hash: seedHash,
    encrypted_seed: seedInput, // in production: encrypt with KMS key
  }, { onConflict: 'draw_id' })

  // ── 6. Score all entries ──────────────────────────────────────────────────
  const scored = entries.map(e => scoreEntry(e, drawnNumbers))

  // ── 7. Calculate prize tiers ──────────────────────────────────────────────
  const { tier5, tier4, tier3, jackpotRolloverOut } = calculateTiers(
    scored,
    draw.reward_pool_paise,
    draw.jackpot_rollover_in_paise,
  )

  // ── 8. Build projected results (stored in draw_simulations, not draws) ────
  const projectedResults = {
    sandbox_mode: sandboxMode,
    drawn_numbers: drawnNumbers,   // stored only in draw_simulations (admin-only RLS)
    seed_hash: seedHash,
    tier5: {
      winners: tier5.winners.map(w => ({ entryId: w.entryId, userId: w.userId, scores: w.scores, distinctScores: w.distinctScores })),
      prize_per_winner_paise: tier5.prizePerWinner,
      total_prize_paise: tier5.totalPrize,
      rollover_paise: tier5.rollover,
    },
    tier4: {
      winners: tier4.winners.map(w => ({ entryId: w.entryId, userId: w.userId, scores: w.scores, distinctScores: w.distinctScores })),
      prize_per_winner_paise: tier4.prizePerWinner,
      total_prize_paise: tier4.totalPrize,
    },
    tier3: {
      winners: tier3.winners.map(w => ({ entryId: w.entryId, userId: w.userId, scores: w.scores, distinctScores: w.distinctScores })),
      prize_per_winner_paise: tier3.prizePerWinner,
      total_prize_paise: tier3.totalPrize,
    },
    jackpot_rollover_out_paise: jackpotRolloverOut,
    total_entries: entries.length,
  }

  // ── 9. Persist simulation record (admin-only table) ───────────────────────
  const { data: sim, error: simErr } = await db.from('draw_simulations').insert({
    draw_id: drawId,
    initiated_by: ctx.userId === '00000000-0000-0000-0000-000000000000' ? null : ctx.userId,
    configuration_snapshot: draw as never,
    projected_results: projectedResults as never,
  }).select('id').single()

  if (simErr) return new Response(`Simulation insert failed: ${simErr.message}`, { status: 500 })

  // ── 10. Advance draw to simulation_ready ──────────────────────────────────
  //     drawn_numbers stays NULL on public draws table until publish
  await db.from('draws').update({
    status: 'simulation_ready',
    jackpot_rollover_out_paise: jackpotRolloverOut,
    updated_at: new Date().toISOString(),
  }).eq('id', drawId)

  await writeAuditLog(db, ctx.userId, 'draw.simulated', 'draws', drawId,
    { status: 'locked' },
    {
      status: 'simulation_ready',
      simulation_id: sim?.id,
      sandbox_mode: sandboxMode,
      seed_hash: seedHash,
      tier5_winners: tier5.winners.length,
      tier4_winners: tier4.winners.length,
      tier3_winners: tier3.winners.length,
      jackpot_rollover_out_paise: jackpotRolloverOut,
    }
  )

  return Response.json({
    ok: true,
    simulationId: sim?.id,
    sandboxMode,
    summary: {
      totalEntries: entries.length,
      tier5Winners: tier5.winners.length,
      tier4Winners: tier4.winners.length,
      tier3Winners: tier3.winners.length,
      jackpotRolloverOutPaise: jackpotRolloverOut,
    },
  })
})
