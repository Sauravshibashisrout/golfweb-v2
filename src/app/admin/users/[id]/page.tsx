import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, User, CreditCard, Heart, Trophy, Shield, Banknote, Calendar, CheckCircle2 } from 'lucide-react'
import UserAccessControl from '@/components/admin/UserAccessControl'
import UserScoresAdminView from '@/components/admin/UserScoresAdminView'

export const metadata = {
  title: 'User Detail — Admin Console',
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  const { id } = await params
  const db = createAdminClient()

  // 1. Profile
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!profile) notFound()

  // 2. Subscriptions
  const { data: subscriptions } = await db
    .from('subscriptions')
    .select('*, membership_plans(*)')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  const activeSub = subscriptions?.find((s) => s.status === 'active')

  // 3. Charity Preference
  const { data: pref } = await db
    .from('charity_preferences')
    .select('*, charities(*)')
    .eq('user_id', id)
    .is('effective_to', null)
    .maybeSingle()

  // 4. Lifetime charity giving
  const { data: allocs } = await db
    .from('payment_allocations')
    .select('amount_paise')
    .eq('user_id', id)
    .eq('allocation_type', 'charity')

  const { data: directDons } = await db
    .from('direct_donations')
    .select('amount_paise')
    .eq('user_id', id)
    .eq('status', 'paid')

  const totalCharityPaise =
    (allocs || []).reduce((sum, a) => sum + a.amount_paise, 0) +
    (directDons || []).reduce((sum, d) => sum + d.amount_paise, 0)

  // 5. Scores
  const { data: scores } = await db
    .from('golf_scores')
    .select('*')
    .eq('user_id', id)
    .order('played_on', { ascending: false })

  // 6. Draw entries
  const { data: entries } = await db
    .from('draw_entries')
    .select('*, draws(*)')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  // 7. Winnings
  const { data: winners } = await db
    .from('draw_winners')
    .select('*, draws(*), winner_verifications(*), payouts(*)')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft size={14} /> Back to Users
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {profile.display_name || 'Golfer'}
            </h1>
            <p className="font-mono text-xs text-neutral-400 mt-1">ID: {profile.id}</p>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-bold uppercase self-start sm:self-auto ${
              profile.role === 'admin'
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {profile.role}
          </span>
        </div>
      </div>

      {/* Access Control (Role management with Stripe integrity notice) */}
      <UserAccessControl userId={profile.id} currentRole={profile.role} />

      {/* Grid: Membership & Stripe References | Charity Choice */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Membership & Stripe References */}
        <div className="glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-400" />
              <h3 className="text-base font-bold text-white">Membership & Stripe References</h3>
            </div>
            {activeSub ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                Active
              </span>
            ) : (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
                Inactive
              </span>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-neutral-500 uppercase font-semibold text-[10px]">Plan</span>
              <p className="text-white font-medium text-sm">
                {activeSub?.membership_plans?.name || 'No Active Subscription'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
              <div>
                <span className="text-neutral-500 uppercase font-semibold text-[10px]">Stripe Customer ID</span>
                <p className="font-mono text-white text-[11px] truncate">
                  {activeSub?.provider_customer_id || '—'}
                </p>
              </div>
              <div>
                <span className="text-neutral-500 uppercase font-semibold text-[10px]">Stripe Subscription ID</span>
                <p className="font-mono text-white text-[11px] truncate">
                  {activeSub?.provider_subscription_id || '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
              <div>
                <span className="text-neutral-500 uppercase font-semibold text-[10px]">Provider</span>
                <p className="text-white capitalize font-medium">{activeSub?.provider || '—'}</p>
              </div>
              <div>
                <span className="text-neutral-500 uppercase font-semibold text-[10px]">Renewal Date</span>
                <p className="text-white font-medium">
                  {activeSub?.current_period_end
                    ? new Date(activeSub.current_period_end).toLocaleDateString('en-IN')
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charity Choice & Impact */}
        <div className="glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart size={18} className="text-emerald-400" />
              <h3 className="text-base font-bold text-white">Charity Choice & Impact</h3>
            </div>
            {pref && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                {pref.contribution_percentage}% Rate
              </span>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-neutral-500 uppercase font-semibold text-[10px]">Active Partner</span>
              <p className="text-white font-medium text-sm">
                {pref?.charities?.name || 'No Charity Selected'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
              <div>
                <span className="text-neutral-500 uppercase font-semibold text-[10px]">Selected On</span>
                <p className="text-white font-medium">
                  {pref?.effective_from
                    ? new Date(pref.effective_from).toLocaleDateString('en-IN')
                    : '—'}
                </p>
              </div>
              <div>
                <span className="text-neutral-500 uppercase font-semibold text-[10px]">Lifetime Giving</span>
                <p className="text-emerald-400 font-bold text-sm">
                  ₹{(totalCharityPaise / 100).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scores Section (with audited Score Correction Modal) */}
      <UserScoresAdminView scores={scores || []} />

      {/* Draw Entries & Winnings */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Draw Entries */}
        <div className="glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-emerald-400" />
            <h3 className="text-base font-bold text-white">Draw Entries ({entries?.length ?? 0})</h3>
          </div>

          {entries && entries.length > 0 ? (
            <div className="divide-y divide-white/5 text-xs">
              {entries.map((e) => {
                const draw = e.draws as unknown as { title: string; cycle_month: string } | null
                return (
                  <div key={e.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{draw?.title || 'Draw'} ({draw?.cycle_month})</p>
                      <p className="text-[11px] text-neutral-400 font-mono">
                        [{e.score_snapshot.join(', ')}]
                      </p>
                    </div>
                    <span className="text-neutral-300 font-medium">
                      {e.matched_numbers !== null ? `${e.matched_numbers} matches` : 'Locked'}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-neutral-500 py-4 text-center">No draw entries recorded.</p>
          )}
        </div>

        {/* Winnings & Payouts */}
        <div className="glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Banknote size={18} className="text-emerald-400" />
            <h3 className="text-base font-bold text-white">Winnings & Payouts ({winners?.length ?? 0})</h3>
          </div>

          {winners && winners.length > 0 ? (
            <div className="divide-y divide-white/5 text-xs">
              {winners.map((w) => {
                const draw = w.draws as unknown as { title: string; cycle_month: string } | null
                return (
                  <div key={w.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">
                        {w.match_count}-number match · {draw?.title || 'Draw'}
                      </p>
                      <p className="text-[11px] text-emerald-400 font-bold">
                        ₹{(w.prize_amount_paise / 100).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <span className="capitalize px-2 py-0.5 rounded-full bg-white/5 text-neutral-300 font-semibold text-[11px]">
                      {w.status.replace('_', ' ')}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-neutral-500 py-4 text-center">No winning records for this user.</p>
          )}
        </div>
      </div>
    </div>
  )
}
