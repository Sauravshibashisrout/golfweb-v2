import Link from 'next/link'
import { Check, Shield, Lock, Calculator, Heart, Trophy, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'How It Works — GolfGives',
  description: 'Understand the mechanics of our Stableford golf tracking, charity allocations, and monthly prize draws.',
}

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-16">
      <div className="text-center space-y-4">
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">The Mechanics</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          How GolfGives Works
        </h1>
        <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
          Built on mathematical rigor, complete transparency, and genuine charity impact. Here is how your membership fuels giving and prize draws.
        </p>
      </div>

      {/* Step 1: Stableford Scoring */}
      <section className="glass rounded-3xl p-8 sm:p-10 space-y-6">
        <div className="flex items-center gap-3 text-emerald-400">
          <Calculator size={28} />
          <h2 className="text-2xl font-bold text-white">1. Real-World Golf & Stableford Scores</h2>
        </div>
        <p className="text-neutral-300 leading-relaxed text-sm sm:text-base">
          Unlike fantasy sports or virtual lotteries, GolfGives is anchored entirely in real golf played on real courses. You enter your Stableford score (ranging from 1 to 45 points) along with the date of your round.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5 space-y-2">
            <h4 className="font-semibold text-white text-sm">The 5-Score Draw Ticket</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Your official monthly draw entry is formed by your five most recent Stableford scores. Once entered, they become your chosen numbers.
            </p>
          </div>
          <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5 space-y-2">
            <h4 className="font-semibold text-white text-sm">Score Proof Verification</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Winning tickets require scorecard screenshots or club verification before prize payouts are disbursed.
            </p>
          </div>
        </div>
      </section>

      {/* Step 2: Charity Allocations */}
      <section className="glass rounded-3xl p-8 sm:p-10 space-y-6">
        <div className="flex items-center gap-3 text-emerald-400">
          <Heart size={28} />
          <h2 className="text-2xl font-bold text-white">2. Transparent Charity Allocations</h2>
        </div>
        <p className="text-neutral-300 leading-relaxed text-sm sm:text-base">
          You have full control over where your contribution goes. Every subscriber chooses their preferred charity from our vetted directory, selecting a contribution percentage between 10% and 40%.
        </p>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
          <h4 className="text-sm font-bold text-emerald-300">Annual Plan 12-Month Recognition Split</h4>
          <p className="text-xs text-neutral-300 leading-relaxed">
            When you purchase an annual membership (₹5,999/yr), we do not dump your contribution in month one. Instead, your payment is mathematically split into 12 equal monthly recognition allocations. Each month for a full year, your selected charity receives its monthly donation and your reward pool entry is funded.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2 text-center">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-neutral-400 font-medium">Charity</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">10% – 40%</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-neutral-400 font-medium">Reward Pool</p>
            <p className="text-xl font-bold text-white mt-1">25%</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-neutral-400 font-medium">Platform & Reserve</p>
            <p className="text-xl font-bold text-white mt-1">35% – 65%</p>
          </div>
        </div>
      </section>

      {/* Step 3: Draw Mechanics */}
      <section className="glass rounded-3xl p-8 sm:p-10 space-y-6">
        <div className="flex items-center gap-3 text-emerald-400">
          <Trophy size={28} />
          <h2 className="text-2xl font-bold text-white">3. Monthly Draws & Prize Tiers</h2>
        </div>
        <p className="text-neutral-300 leading-relaxed text-sm sm:text-base">
          At the end of each month, the draw entries are locked. Five numbers between 1 and 45 are generated using cryptographically secure random number generators (Web Crypto API) with rejection sampling, or via pre-published algorithmic formulas.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-sm font-semibold text-white">Tier 5 (Jackpot — 5 Matches)</p>
              <p className="text-xs text-neutral-400">40% of Reward Pool + Rollover from previous months</p>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">Rollover</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-sm font-semibold text-white">Tier 4 (4 Matches)</p>
              <p className="text-xs text-neutral-400">35% of Reward Pool split among winners</p>
            </div>
            <span className="text-xs font-medium text-neutral-400">No rollover</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-sm font-semibold text-white">Tier 3 (3 Matches)</p>
              <p className="text-xs text-neutral-400">25% of Reward Pool split among winners</p>
            </div>
            <span className="text-xs font-medium text-neutral-400">No rollover</span>
          </div>
        </div>
      </section>

      {/* Security & Immutability */}
      <section className="glass rounded-3xl p-8 sm:p-10 space-y-4 border border-emerald-500/20">
        <div className="flex items-center gap-3 text-emerald-400">
          <Shield size={24} />
          <h3 className="text-xl font-bold text-white">Strict Auditability & Immutability</h3>
        </div>
        <p className="text-neutral-300 text-sm leading-relaxed">
          Every draw transition (lock, simulate, publish) is recorded in immutable audit logs. Once a draw status reaches <code className="text-emerald-400 bg-emerald-500/10 px-1 rounded">published</code>, a database trigger permanently blocks any further updates or modifications to the results.
        </p>
      </section>

      {/* Call to action */}
      <div className="text-center pt-8">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-base transition-colors"
        >
          View Plans & Join
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  )
}
