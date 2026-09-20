import { redirect, notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/rbac'
import { createClient } from '@/lib/supabase/server'
import DrawAdminActions from '@/components/draw/DrawAdminActions'

export default async function AdminDrawPage({ params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin() } catch { redirect('/dashboard') }

  const { id } = await params
  const supabase = await createClient()

  const { data: draw } = await supabase
    .from('draws')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!draw) notFound()

  // Load latest simulation for this draw
  const { data: simulation } = await supabase
    .from('draw_simulations')
    .select('id, created_at, projected_results, initiated_by')
    .eq('draw_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Load entry count
  const { count: entryCount } = await supabase
    .from('draw_entries')
    .select('id', { count: 'exact', head: true })
    .eq('draw_id', id)

  // Load cashPrizeDrawEnabled
  const { data: setting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'cashPrizeDrawEnabled')
    .single()
  const cashEnabled = setting?.value === true

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider">{draw.cycle_month}</p>
          <h1 className="text-2xl font-bold text-white mt-1">{draw.title}</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Mode: <span className="text-white capitalize">{draw.mode}</span>
            {' · '}Status: <span className="text-white capitalize">{draw.status}</span>
            {' · '}Entries: <span className="text-white">{entryCount ?? 0}</span>
          </p>
        </div>
        {!cashEnabled && (
          <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full">
            Sandbox
          </span>
        )}
      </div>

      {/* Draw configuration */}
      <div className="glass rounded-2xl p-5 grid grid-cols-2 gap-4 text-sm">
        {[
          ['Reward pool', `₹${(draw.reward_pool_paise / 100).toLocaleString('en-IN')}`],
          ['Jackpot rollover in', `₹${(draw.jackpot_rollover_in_paise / 100).toLocaleString('en-IN')}`],
          ['Cash prizes', draw.cash_prize_enabled ? '✓ Enabled' : '✗ Disabled'],
          ['Legal approval ref', draw.legal_approval_ref ?? '—'],
          ['Algo formula hash', draw.algo_formula_hash ? draw.algo_formula_hash.slice(0, 16) + '…' : '—'],
          ['Entry lock at', draw.entry_lock_at ? new Date(draw.entry_lock_at).toLocaleString('en-IN') : '—'],
          ['Published at', draw.published_at ? new Date(draw.published_at).toLocaleString('en-IN') : '—'],
          ['Drawn numbers', draw.drawn_numbers?.join(', ') ?? '—'],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-neutral-500">{label}</p>
            <p className="text-white font-medium mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Simulation results */}
      {simulation && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Latest Simulation</h2>
            <span className="text-xs text-neutral-500">
              {new Date(simulation.created_at).toLocaleString('en-IN')}
            </span>
          </div>
          <SimulationResults results={simulation.projected_results as SimResults} />
        </div>
      )}

      {/* Admin action buttons */}
      <DrawAdminActions
        drawId={id}
        status={draw.status}
        simulationId={simulation?.id ?? null}
        cashEnabled={cashEnabled}
        cashPrizeEnabled={draw.cash_prize_enabled}
        legalApprovalRef={draw.legal_approval_ref}
      />
    </div>
  )
}

type SimResults = {
  sandbox_mode: boolean
  drawn_numbers: number[]
  seed_hash: string
  tier5: { winners: { userId: string; scores: number[]; distinctScores: number }[]; prize_per_winner_paise: number; rollover_paise: number }
  tier4: { winners: { userId: string; scores: number[] }[]; prize_per_winner_paise: number }
  tier3: { winners: { userId: string; scores: number[] }[]; prize_per_winner_paise: number }
  jackpot_rollover_out_paise: number
  total_entries: number
}

function SimulationResults({ results }: { results: SimResults }) {
  return (
    <div className="space-y-4 text-sm">
      {results.sandbox_mode && (
        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Sandbox simulation — no real prizes
        </p>
      )}
      <div className="flex gap-2 flex-wrap">
        {results.drawn_numbers?.map(n => (
          <div key={n} className="w-9 h-9 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-sm font-bold text-green-300">
            {n}
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-600 font-mono">Seed hash: {results.seed_hash?.slice(0, 32)}…</p>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tier 5 (5 matches)', winners: results.tier5?.winners?.length ?? 0, prize: results.tier5?.prize_per_winner_paise, rollover: results.tier5?.rollover_paise },
          { label: 'Tier 4 (4 matches)', winners: results.tier4?.winners?.length ?? 0, prize: results.tier4?.prize_per_winner_paise },
          { label: 'Tier 3 (3 matches)', winners: results.tier3?.winners?.length ?? 0, prize: results.tier3?.prize_per_winner_paise },
        ].map(t => (
          <div key={t.label} className="bg-white/3 rounded-xl p-3">
            <p className="text-xs text-neutral-500">{t.label}</p>
            <p className="text-white font-semibold mt-1">{t.winners} winner{t.winners !== 1 ? 's' : ''}</p>
            <p className="text-xs text-neutral-400">₹{((t.prize ?? 0) / 100).toLocaleString('en-IN')} each</p>
            {t.rollover != null && t.rollover > 0 && (
              <p className="text-xs text-amber-400 mt-1">↩ ₹{(t.rollover / 100).toLocaleString('en-IN')} rolls over</p>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-500">Total entries: {results.total_entries}</p>
    </div>
  )
}
