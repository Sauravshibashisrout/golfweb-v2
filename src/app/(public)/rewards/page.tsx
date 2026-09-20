import Link from 'next/link'
import { Trophy, ArrowRight, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import SandboxBanner from '@/components/draw/SandboxBanner'

export const metadata = {
  title: 'Monthly Rewards & Draws — GolfGives',
}

export default async function RewardsPage() {
  const supabase = await createClient()

  // Load latest draws
  const { data: draws } = await supabase
    .from('draws')
    .select('*')
    .in('status', ['published', 'locked'])
    .order('cycle_month', { ascending: false })
    .limit(5)

  // Load cashPrizeDrawEnabled
  const { data: setting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'cashPrizeDrawEnabled')
    .single()
  const cashEnabled = setting?.value === true

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Draw Results & Rewards</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Monthly Reward Draws
        </h1>
        <p className="text-neutral-400 text-base">
          Transparent, verifiable results for active members.
        </p>
      </div>

      {!cashEnabled && <SandboxBanner />}

      {/* Tiers Breakdown Card */}
      <div className="glass rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-3 text-emerald-400">
          <Trophy size={28} />
          <h2 className="text-2xl font-bold text-white">Prize Tier Distribution</h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
              40% Pool
            </span>
            <h4 className="font-bold text-white text-base">Tier 5 (Jackpot)</h4>
            <p className="text-xs text-neutral-400">
              Match all 5 numbers. Unclaimed funds roll over to the next month's jackpot.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <span className="text-xs font-bold text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full">
              35% Pool
            </span>
            <h4 className="font-bold text-white text-base">Tier 4</h4>
            <p className="text-xs text-neutral-400">
              Match 4 out of 5 numbers. Split equally among all Tier 4 winners.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
              25% Pool
            </span>
            <h4 className="font-bold text-white text-base">Tier 3</h4>
            <p className="text-xs text-neutral-400">
              Match 3 out of 5 numbers. Split equally among all Tier 3 winners.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Draws List */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white">Recent Draws</h3>

        {draws && draws.length > 0 ? (
          <div className="space-y-4">
            {draws.map((d) => (
              <div key={d.id} className="glass rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-neutral-500 uppercase">{d.cycle_month}</span>
                  <h4 className="text-lg font-bold text-white">{d.title}</h4>
                  <p className="text-xs text-neutral-400">
                    Status: <span className="capitalize text-white">{d.status}</span>
                    {d.drawn_numbers && (
                      <> · Drawn: <span className="text-emerald-400 font-mono font-bold">{d.drawn_numbers.join(', ')}</span></>
                    )}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-neutral-500">Reward Pool</p>
                  <p className="text-lg font-bold text-white">₹{((d.reward_pool_paise + d.jackpot_rollover_in_paise) / 100).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 text-center text-neutral-400">
            No published draws yet. Active draws will appear here once finalized.
          </div>
        )}
      </div>
    </div>
  )
}
