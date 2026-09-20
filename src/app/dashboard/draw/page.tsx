import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/rbac'
import DrawEntryCard from '@/components/draw/DrawEntryCard'
import SandboxBanner from '@/components/draw/SandboxBanner'
import WinnerCard from '@/components/draw/WinnerCard'

export default async function DrawPage() {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/login?next=/dashboard/draw')
  if (!ctx.hasActiveSub) redirect('/pricing?reason=subscription_required')

  const supabase = await createClient()

  // Load cashPrizeDrawEnabled setting
  const { data: setting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'cashPrizeDrawEnabled')
    .single()
  const cashEnabled = setting?.value === true

  // Load the most recent non-archived draw
  const { data: draw } = await supabase
    .from('draws')
    .select('id, title, cycle_month, status, entry_lock_at, draw_at, drawn_numbers, reward_pool_paise, tier_3_paise, tier_4_paise, tier_5_paise, cash_prize_enabled, jackpot_rollover_in_paise')
    .not('status', 'in', '("archived","cancelled")')
    .order('cycle_month', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Load user's entry for this draw
  const entry = draw ? await supabase
    .from('draw_entries')
    .select('id, score_snapshot, score_date_snapshot, matched_numbers, entry_weight')
    .eq('draw_id', draw.id)
    .eq('user_id', ctx.userId)
    .maybeSingle()
    .then(r => r.data) : null

  // Load any winner records for this user
  const { data: winners } = await supabase
    .from('draw_winners')
    .select('id, match_count, prize_amount_paise, status, draw_id')
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Score count for eligibility display
  const { count: scoreCount } = await supabase
    .from('golf_scores')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ctx.userId)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Monthly Draw</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Your five latest Stableford scores form your draw entry.
        </p>
      </div>

      {!cashEnabled && <SandboxBanner />}

      {draw ? (
        <DrawEntryCard
          draw={draw}
          entry={entry}
          scoreCount={scoreCount ?? 0}
          cashEnabled={cashEnabled}
        />
      ) : (
        <div className="glass rounded-2xl p-8 text-center text-neutral-400">
          No active draw this month. Check back soon.
        </div>
      )}

      {winners && winners.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Your Winnings</h2>
          {winners.map(w => (
            <WinnerCard key={w.id} winner={w} cashEnabled={cashEnabled} />
          ))}
        </div>
      )}
    </div>
  )
}
