import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, ArrowRight, Users, Search, Shield, Heart, Trophy, CreditCard } from 'lucide-react'

export const metadata = {
  title: 'User Management — Admin Console',
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; role?: string }>
}) {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  const { q, status, role } = await searchParams
  const db = createAdminClient()

  // Build query
  let query = db
    .from('profiles')
    .select(`
      id,
      display_name,
      role,
      created_at,
      subscriptions (
        id,
        status,
        plan_id,
        current_period_end,
        membership_plans (
          name
        )
      ),
      charity_preferences (
        id,
        contribution_percentage,
        effective_to,
        charities (
          name
        )
      ),
      golf_scores (
        id
      )
    `)
    .order('created_at', { ascending: false })

  if (role && ['subscriber', 'admin'].includes(role)) {
    query = query.eq('role', role as 'subscriber' | 'admin')
  }

  if (q) {
    query = query.ilike('display_name', `%${q}%`)
  }

  const { data: users } = await query

  // Filter by subscription status in memory if requested
  const filteredUsers = (users || []).filter((u) => {
    if (!status || status === 'all') return true
    const activeSub = (u.subscriptions as unknown as { status: string }[])?.find((s) => s.status === 'active')
    if (status === 'active') return !!activeSub
    if (status === 'inactive') return !activeSub
    return true
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft size={14} /> Back to Console
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">User Management</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Search profiles, inspect Stripe subscriptions, charity preferences, and manage audited score corrections.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
        <form method="GET" className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            name="q"
            defaultValue={q || ''}
            placeholder="Search by golfer name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <Link
            href="/admin/users"
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              !status && !role ? 'bg-emerald-500 text-neutral-950' : 'bg-white/5 text-neutral-400 hover:text-white'
            }`}
          >
            All Users
          </Link>
          <Link
            href="/admin/users?status=active"
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              status === 'active' ? 'bg-emerald-500 text-neutral-950' : 'bg-white/5 text-neutral-400 hover:text-white'
            }`}
          >
            Active Subscribers
          </Link>
          <Link
            href="/admin/users?role=admin"
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              role === 'admin' ? 'bg-purple-500 text-white' : 'bg-white/5 text-neutral-400 hover:text-white'
            }`}
          >
            Admins
          </Link>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>Showing {filteredUsers.length} users</span>
        </div>

        {filteredUsers.length > 0 ? (
          <div className="divide-y divide-white/5">
            {filteredUsers.map((u) => {
              const activeSub = (u.subscriptions as unknown as { status: string; current_period_end: string | null; membership_plans: { name: string } | null }[])?.find(
                (s) => s.status === 'active'
              )
              const activePref = (u.charity_preferences as unknown as { contribution_percentage: number; effective_to: string | null; charities: { name: string } | null }[])?.find(
                (p) => !p.effective_to
              )
              const scoreCount = (u.golf_scores as unknown as { id: string }[])?.length ?? 0

              return (
                <div key={u.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">
                        {u.display_name || 'Golfer'}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          u.role === 'admin'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {u.role}
                      </span>
                      {activeSub ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {activeSub.membership_plans?.name || 'Active Subscriber'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
                          No Active Plan
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                      <span className="font-mono text-neutral-500 text-[11px]">ID: {u.id}</span>
                      {activePref?.charities?.name && (
                        <span className="flex items-center gap-1 text-emerald-300">
                          <Heart size={11} /> {activePref.charities.name} ({activePref.contribution_percentage}%)
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-neutral-300">
                        <Trophy size={11} /> {scoreCount} scores logged
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/admin/users/${u.id}`}
                    className="inline-flex items-center gap-1 text-xs px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors shrink-0"
                  >
                    View Details <ArrowRight size={14} />
                  </Link>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500 text-sm">
            No users found matching the filter criteria.
          </div>
        )}
      </div>
    </div>
  )
}
