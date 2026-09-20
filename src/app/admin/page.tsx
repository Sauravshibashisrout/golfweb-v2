import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  Trophy,
  Heart,
  Users,
  CheckCircle,
  Shield,
  ArrowRight,
  BarChart3,
  Award,
  FileSpreadsheet,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

export const metadata = {
  title: 'Admin Console — GolfGives',
}

export default async function AdminDashboardPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  const db = createAdminClient()

  // 1. KPI Counts
  const { count: totalUsersCount } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  const { count: subscriberCount } = await db
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  const { data: allocations } = await db
    .from('payment_allocations')
    .select('amount_paise')
    .eq('allocation_type', 'charity')

  const totalCharityPaise = (allocations || []).reduce((sum, a) => sum + a.amount_paise, 0)

  const { count: pendingVerificationsCount } = await db
    .from('draw_winners')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'proof_submitted')

  const { count: pendingPayoutsCount } = await db
    .from('payouts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  // 2. Latest Draws
  const { data: draws } = await db
    .from('draws')
    .select('*')
    .order('cycle_month', { ascending: false })
    .limit(5)

  // 3. Recent Audit Logs
  const { data: auditLogs } = await db
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(8)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2">
            <Shield size={14} /> Admin Operations
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System Control Console</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Centralized administration across users, draws, charities, winner verifications, and analytics.
          </p>
        </div>

        {/* Quick Access Links */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/users"
            className="px-3.5 py-2 rounded-full border border-white/10 hover:border-white/20 text-white text-xs font-semibold transition-colors"
          >
            Users
          </Link>
          <Link
            href="/admin/draws"
            className="px-3.5 py-2 rounded-full border border-white/10 hover:border-white/20 text-white text-xs font-semibold transition-colors"
          >
            Draws
          </Link>
          <Link
            href="/admin/charities"
            className="px-3.5 py-2 rounded-full border border-white/10 hover:border-white/20 text-white text-xs font-semibold transition-colors"
          >
            Charities
          </Link>
          <Link
            href="/admin/winners"
            className="px-3.5 py-2 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/20 transition-colors"
          >
            Winners ({pendingVerificationsCount ?? 0})
          </Link>
          <Link
            href="/admin/reports"
            className="px-3.5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-colors"
          >
            Reports
          </Link>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="glass rounded-3xl p-5 sm:p-6 space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] sm:text-xs uppercase font-semibold">Active Members</span>
            <Users size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white">{subscriberCount ?? 0}</p>
          <p className="text-[11px] sm:text-xs text-neutral-400">
            Of {totalUsersCount ?? 0} total registered users
          </p>
        </div>

        <div className="glass rounded-3xl p-5 sm:p-6 space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] sm:text-xs uppercase font-semibold">Charity Allocated</span>
            <Heart size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
            ₹{((totalCharityPaise) / 100).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] sm:text-xs text-neutral-400">Verified payment allocations</p>
        </div>

        <div className="glass rounded-3xl p-5 sm:p-6 space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] sm:text-xs uppercase font-semibold">Pending Proofs</span>
            <CheckCircle size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-400">
            {pendingVerificationsCount ?? 0}
          </p>
          <p className="text-[11px] sm:text-xs text-neutral-400">Scorecards awaiting review</p>
        </div>

        <div className="glass rounded-3xl p-5 sm:p-6 space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] sm:text-xs uppercase font-semibold">Pending Payouts</span>
            <Award size={16} className="text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-purple-400">
            {pendingPayoutsCount ?? 0}
          </p>
          <p className="text-[11px] sm:text-xs text-neutral-400">Approved winners awaiting payout</p>
        </div>
      </div>

      {/* Five Control Areas Command Center */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Administrative Control Areas</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Area 1: User Management */}
          <Link
            href="/admin/users"
            className="glass rounded-3xl p-6 hover:border-emerald-500/30 transition-all group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center justify-between">
                  <span>1. User Management</span>
                  <ArrowRight size={16} className="text-neutral-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Search and inspect subscribers, view Stripe customer & subscription refs, charity choice, scores, draws, and winnings. Correct scores with mandatory audit notes.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400">Score Corrections</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400">Stripe Integrity</span>
            </div>
          </Link>

          {/* Area 2: Draw Management */}
          <Link
            href="/admin/draws"
            className="glass rounded-3xl p-6 hover:border-emerald-500/30 transition-all group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                <Trophy size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors flex items-center justify-between">
                  <span>2. Draw Management</span>
                  <ArrowRight size={16} className="text-neutral-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Configure draw periods, eligibility, reward pool, simulation mode, and rollovers. Lock entries, run simulations, and publish immutable winning results.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400">Immutable Results</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400">Cash Prize Gate</span>
            </div>
          </Link>

          {/* Area 3: Charity Management */}
          <Link
            href="/admin/charities"
            className="glass rounded-3xl p-6 hover:border-emerald-500/30 transition-all group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                <Heart size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-rose-400 transition-colors flex items-center justify-between">
                  <span>3. Charity Management</span>
                  <ArrowRight size={16} className="text-neutral-500 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Add, edit, publish, archive, or remove charity listings. Manage descriptions, logos, hero images, upcoming charity golf days, and homepage spotlights.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400">Golf Days & Events</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400">Archive Protection</span>
            </div>
          </Link>

          {/* Area 4: Winners Management */}
          <Link
            href="/admin/winners"
            className="glass rounded-3xl p-6 hover:border-emerald-500/30 transition-all group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Award size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors flex items-center justify-between">
                  <span>4. Winners Management</span>
                  <ArrowRight size={16} className="text-neutral-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Review qualifying golf scorecards via secure signed URLs. Enforce dual rejection reasons, approve winners, and mark payouts paid with Stripe or UTR references.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400">Signed S3 URLs</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400">Dual Rejection Notes</span>
            </div>
          </Link>

          {/* Area 5: Reports and Analytics */}
          <Link
            href="/admin/reports"
            className="glass rounded-3xl p-6 hover:border-emerald-500/30 transition-all group flex flex-col justify-between space-y-4 md:col-span-2 lg:col-span-2"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors flex items-center justify-between">
                  <span>5. Reports & Financial Analytics</span>
                  <ArrowRight size={16} className="text-neutral-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Real-time analytics for active subscribers, monthly vs annual breakdowns, Stripe subscription revenue, charity impact by cause, direct donations, and prize tier distributions. Includes 4 one-click CSV export options.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400">subscribers.csv</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400">charity_contributions.csv</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400">payouts.csv</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400">draw_results.csv</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Draws Overview */}
      <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Monthly Draws</h2>
          <Link href="/admin/draws" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
            View all draws →
          </Link>
        </div>

        <div className="divide-y divide-white/5">
          {draws?.map((d) => (
            <div key={d.id} className="py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{d.title}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Cycle: {d.cycle_month} · Mode: <span className="capitalize">{d.mode}</span> · Status:{' '}
                  <span className="text-emerald-400 font-semibold capitalize">{d.status}</span>
                </p>
              </div>
              <Link
                href={`/admin/draws/${d.id}`}
                className="text-xs px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
              >
                Manage Draw
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Audit Logs */}
      <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Recent Immutable Audit Activity</h2>
          <span className="text-xs text-neutral-500">public.audit_logs</span>
        </div>
        <div className="space-y-3">
          {auditLogs?.map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
            >
              <div className="space-y-0.5">
                <span className="font-mono text-emerald-400 font-semibold">{log.action}</span>
                <p className="text-neutral-500">
                  Target: {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}…)` : ''}
                </p>
              </div>
              <span className="text-neutral-500">
                {new Date(log.created_at).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
