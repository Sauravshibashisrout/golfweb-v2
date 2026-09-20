import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Users, CreditCard, Heart, Trophy, BarChart3, TrendingUp, Banknote } from 'lucide-react'
import ReportExportButtons from '@/components/admin/ReportExportButtons'

export const metadata = {
  title: 'Reports & Analytics — Admin Console',
}

export default async function AdminReportsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  const db = createAdminClient()

  // 1. Users & Active Subscribers
  const { count: totalUsers } = await db.from('profiles').select('id', { count: 'exact', head: true })

  const { data: activeSubs } = await db
    .from('subscriptions')
    .select(`
      id,
      user_id,
      status,
      current_period_end,
      membership_plans (
        id,
        name,
        interval_months
      ),
      profiles (
        display_name
      )
    `)
    .eq('status', 'active')

  const totalActiveSubscribers = activeSubs?.length ?? 0
  let monthlySubCount = 0
  let annualSubCount = 0

  for (const s of activeSubs || []) {
    const plan = s.membership_plans as unknown as { interval_months: number } | null
    if ((plan?.interval_months ?? 1) >= 12) {
      annualSubCount++
    } else {
      monthlySubCount++
    }
  }

  // 2. Stripe Subscription Revenue
  const { data: stripeTxns } = await db
    .from('payment_transactions')
    .select('amount_paise')
    .eq('provider', 'stripe')
    .eq('payment_kind', 'subscription')
    .eq('status', 'paid')

  const totalStripeRevenuePaise = (stripeTxns || []).reduce((sum, t) => sum + t.amount_paise, 0)

  // 3. Charity Contributions (Allocations)
  const { data: charityAllocations } = await db
    .from('payment_allocations')
    .select(`
      id,
      amount_paise,
      recognition_month,
      allocation_type,
      charities (
        name
      )
    `)
    .eq('allocation_type', 'charity')
    .order('recognition_month', { ascending: false })

  const totalCharityAllocatedPaise = (charityAllocations || []).reduce((sum, a) => sum + a.amount_paise, 0)

  // 4. Direct Donations
  const { data: directDonations } = await db
    .from('direct_donations')
    .select(`
      id,
      amount_paise,
      status,
      created_at,
      charities (
        name
      )
    `)
    .eq('status', 'paid')

  const totalDirectDonationsPaise = (directDonations || []).reduce((sum, d) => sum + d.amount_paise, 0)

  // 5. Draws, Reward Pools, Rollovers & Winners
  const { data: draws } = await db
    .from('draws')
    .select('*')
    .order('cycle_month', { ascending: false })

  const totalRewardPoolPaise = (draws || []).reduce((sum, d) => sum + (d.reward_pool_paise || 0), 0)
  const totalRolloverOutPaise = (draws || []).reduce((sum, d) => sum + (d.jackpot_rollover_out_paise || 0), 0)

  const { data: allWinners } = await db
    .from('draw_winners')
    .select(`
      id,
      match_count,
      prize_amount_paise,
      status,
      draws (
        title
      ),
      profiles (
        display_name
      ),
      payouts (
        status,
        provider_payout_id,
        paid_at
      )
    `)

  const totalWinnersCount = allWinners?.length ?? 0
  const winnersByTier = {
    tier5: allWinners?.filter((w) => w.match_count === 5).length ?? 0,
    tier4: allWinners?.filter((w) => w.match_count === 4).length ?? 0,
    tier3: allWinners?.filter((w) => w.match_count === 3).length ?? 0,
  }

  // 6. Payouts
  const { data: payouts } = await db.from('payouts').select('amount_paise, status')
  const paidPayouts = payouts?.filter((p) => p.status === 'paid') ?? []
  const totalPayoutsDisbursedPaise = paidPayouts.reduce((sum, p) => sum + p.amount_paise, 0)

  // 7. Draw Participation & Match Statistics
  const { data: entries } = await db.from('draw_entries').select('matched_numbers')
  const totalEntriesCount = entries?.length ?? 0
  const matchDistribution = {
    five: entries?.filter((e) => e.matched_numbers === 5).length ?? 0,
    four: entries?.filter((e) => e.matched_numbers === 4).length ?? 0,
    three: entries?.filter((e) => e.matched_numbers === 3).length ?? 0,
    twoOrLess: entries?.filter((e) => e.matched_numbers !== null && e.matched_numbers < 3).length ?? 0,
  }

  // Prepare CSV Export structures
  const subscribersCsv = (activeSubs || []).map((s) => {
    const p = s.membership_plans as unknown as { name: string } | null
    const prof = s.profiles as unknown as { display_name: string | null } | null
    return {
      displayName: prof?.display_name || 'Golfer',
      userId: s.user_id,
      planName: p?.name || 'Membership',
      status: s.status,
      renewalDate: s.current_period_end ? new Date(s.current_period_end).toLocaleDateString('en-IN') : '—',
    }
  })

  const charityCsv = (charityAllocations || []).map((a) => {
    const c = a.charities as unknown as { name: string } | null
    return {
      charityName: c?.name || 'Charity',
      month: a.recognition_month || '—',
      amountINR: a.amount_paise / 100,
      type: a.allocation_type,
    }
  })

  const payoutsCsv = (allWinners || []).map((w) => {
    const prof = w.profiles as unknown as { display_name: string | null } | null
    const dr = w.draws as unknown as { title: string } | null
    const p = Array.isArray(w.payouts) ? w.payouts[0] : w.payouts
    return {
      winnerName: prof?.display_name || 'Golfer',
      drawTitle: dr?.title || 'Draw',
      matchCount: w.match_count,
      prizeINR: w.prize_amount_paise / 100,
      status: p?.status || 'pending',
      payoutRef: p?.provider_payout_id || '—',
      paidAt: p?.paid_at ? new Date(p.paid_at).toLocaleDateString('en-IN') : '—',
    }
  })

  const drawsCsv = (draws || []).map((d) => ({
    title: d.title,
    cycleMonth: d.cycle_month,
    status: d.status,
    poolINR: d.reward_pool_paise / 100,
    drawnNumbers: d.drawn_numbers ? `[${d.drawn_numbers.join(' ')}]` : '—',
    rolloverOutINR: d.jackpot_rollover_out_paise / 100,
  }))

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft size={14} /> Back to Console
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Reports & Analytics</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Executive business metrics, subscription revenue, charity impact, and draw statistics.
            </p>
          </div>

          <ReportExportButtons
            subscribersData={subscribersCsv}
            charityData={charityCsv}
            payoutsData={payoutsCsv}
            drawsData={drawsCsv}
          />
        </div>
      </div>

      {/* ── 1. KPI Cards Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Users & Active Subs */}
        <div className="glass rounded-3xl p-6 space-y-1">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs uppercase font-semibold">Active Members</span>
            <Users size={16} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white">{totalActiveSubscribers}</p>
          <p className="text-xs text-neutral-400">
            {monthlySubCount} Monthly · {annualSubCount} Annual ({totalUsers ?? 0} registered)
          </p>
        </div>

        {/* Stripe Revenue */}
        <div className="glass rounded-3xl p-6 space-y-1">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs uppercase font-semibold">Stripe Sub Revenue</span>
            <CreditCard size={16} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400">
            ₹{(totalStripeRevenuePaise / 100).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-neutral-400">All-time verified subscription revenue</p>
        </div>

        {/* Charity Impact */}
        <div className="glass rounded-3xl p-6 space-y-1">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs uppercase font-semibold">Total Charity Impact</span>
            <Heart size={16} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white">
            ₹{((totalCharityAllocatedPaise + totalDirectDonationsPaise) / 100).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-neutral-400">
            Allocations: ₹{(totalCharityAllocatedPaise / 100).toLocaleString('en-IN')} · Donations: ₹
            {(totalDirectDonationsPaise / 100).toLocaleString('en-IN')}
          </p>
        </div>

        {/* Reward Pool & Payouts */}
        <div className="glass rounded-3xl p-6 space-y-1">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs uppercase font-semibold">Prizes Disbursed</span>
            <Trophy size={16} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white">
            ₹{(totalPayoutsDisbursedPaise / 100).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-neutral-400">
            {paidPayouts.length} paid payouts ({totalWinnersCount} total winners)
          </p>
        </div>
      </div>

      {/* ── 2. Detailed Data Sections ────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Draw & Participation Statistics */}
        <div className="glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Draw Participation & Matches</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-neutral-500 uppercase font-semibold text-[10px]">Total Tickets Entered</span>
              <p className="text-2xl font-bold text-white">{totalEntriesCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-neutral-500 uppercase font-semibold text-[10px]">Total Rollover Out</span>
              <p className="text-2xl font-bold text-emerald-400">
                ₹{(totalRolloverOutPaise / 100).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-neutral-400 uppercase">Match Distribution</span>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-300">5-number match (Jackpot Tier)</span>
                <span className="font-bold text-emerald-400">{matchDistribution.five}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-300">4-number match (Tier 4)</span>
                <span className="font-bold text-white">{matchDistribution.four}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-neutral-300">3-number match (Tier 3)</span>
                <span className="font-bold text-white">{matchDistribution.three}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">0 – 2 matches</span>
                <span className="font-bold text-neutral-500">{matchDistribution.twoOrLess}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charity Impact Breakdown */}
        <div className="glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Charity Contributions by Period</h3>
          </div>

          <div className="space-y-2 text-xs">
            {charityAllocations && charityAllocations.length > 0 ? (
              <div className="divide-y divide-white/5 max-h-[260px] overflow-y-auto">
                {charityAllocations.slice(0, 8).map((a) => {
                  const c = a.charities as unknown as { name: string } | null
                  return (
                    <div key={a.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{c?.name || 'Charity Partner'}</p>
                        <p className="text-[11px] text-neutral-500">Period: {a.recognition_month || 'Monthly'}</p>
                      </div>
                      <span className="font-bold text-emerald-400">
                        ₹{(a.amount_paise / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-neutral-500 text-center py-8">No charity allocations recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
