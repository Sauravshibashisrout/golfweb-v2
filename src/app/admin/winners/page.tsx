import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Trophy, Filter, Eye, CheckCircle2, AlertCircle, Clock, Banknote } from 'lucide-react'
import VerificationReviewActions from '@/components/admin/VerificationReviewActions'
import WinnerPayoutAction from '@/components/admin/WinnerPayoutAction'

export const metadata = {
  title: 'Winners Management — Admin Console',
}

export default async function AdminWinnersPage({
  searchParams,
}: {
  searchParams: Promise<{
    drawId?: string
    tier?: string
    proofStatus?: string
    payoutStatus?: string
  }>
}) {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  const { drawId, tier, proofStatus, payoutStatus } = await searchParams
  const db = createAdminClient()

  // Load all draws for filter dropdown
  const { data: allDraws } = await db
    .from('draws')
    .select('id, title, cycle_month')
    .order('cycle_month', { ascending: false })

  // Build winners query
  let query = db
    .from('draw_winners')
    .select(`
      id,
      draw_id,
      match_count,
      prize_amount_paise,
      status,
      created_at,
      profiles (
        id,
        display_name
      ),
      draws (
        id,
        title,
        cycle_month
      ),
      winner_verifications (
        id,
        proof_storage_path,
        approved,
        rejection_reason,
        internal_audit_reason,
        submitted_at
      ),
      payouts (
        id,
        status,
        provider_payout_id,
        paid_at
      )
    `)
    .order('created_at', { ascending: false })

  if (drawId) {
    query = query.eq('draw_id', drawId)
  }

  if (tier) {
    query = query.eq('match_count', Number(tier))
  }

  if (proofStatus && proofStatus !== 'all') {
    query = query.eq(
      'status',
      proofStatus as 'paid' | 'pending_proof' | 'proof_submitted' | 'approved' | 'rejected'
    )
  }

  const { data: winners } = await query

  // In-memory filter for payout status if specified
  const filteredWinners = (winners || []).filter((w) => {
    if (!payoutStatus || payoutStatus === 'all') return true
    const p = Array.isArray(w.payouts) ? w.payouts[0] : w.payouts
    const status = p?.status || 'pending'
    return status === payoutStatus
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
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Winners & Payouts Console</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Filter by draw, tier, proof verification, and payout disbursement status.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <form method="GET" className="glass rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Draw filter */}
        <div>
          <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-1">Draw</label>
          <select
            name="drawId"
            defaultValue={drawId || ''}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="" className="bg-neutral-900">All Draws</option>
            {allDraws?.map((d) => (
              <option key={d.id} value={d.id} className="bg-neutral-900">
                {d.title} ({d.cycle_month})
              </option>
            ))}
          </select>
        </div>

        {/* Tier filter */}
        <div>
          <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-1">Match Tier</label>
          <select
            name="tier"
            defaultValue={tier || ''}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="" className="bg-neutral-900">All Tiers</option>
            <option value="5" className="bg-neutral-900">5-number match (40%)</option>
            <option value="4" className="bg-neutral-900">4-number match (35%)</option>
            <option value="3" className="bg-neutral-900">3-number match (25%)</option>
          </select>
        </div>

        {/* Proof status filter */}
        <div>
          <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-1">Proof Status</label>
          <select
            name="proofStatus"
            defaultValue={proofStatus || 'all'}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all" className="bg-neutral-900">All Statuses</option>
            <option value="pending_proof" className="bg-neutral-900">Pending Proof</option>
            <option value="proof_submitted" className="bg-neutral-900">Proof Submitted</option>
            <option value="approved" className="bg-neutral-900">Approved</option>
            <option value="rejected" className="bg-neutral-900">Rejected</option>
            <option value="paid" className="bg-neutral-900">Paid</option>
          </select>
        </div>

        {/* Payout status filter */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-1">Payout Status</label>
            <select
              name="payoutStatus"
              defaultValue={payoutStatus || 'all'}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all" className="bg-neutral-900">All Payouts</option>
              <option value="pending" className="bg-neutral-900">Pending</option>
              <option value="paid" className="bg-neutral-900">Paid</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl transition-colors shrink-0"
          >
            Filter
          </button>
        </div>
      </form>

      {/* Winners List */}
      <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>Showing {filteredWinners.length} winning entries</span>
        </div>

        {filteredWinners.length > 0 ? (
          <div className="divide-y divide-white/5">
            {filteredWinners.map((w) => {
              const profile = w.profiles as unknown as { id: string; display_name: string | null } | null
              const draw = w.draws as unknown as { id: string; title: string; cycle_month: string } | null
              const verif = w.winner_verifications?.[0]
              const payout = Array.isArray(w.payouts) ? w.payouts[0] : w.payouts

              return (
                <div key={w.id} className="py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left: Winner details */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">
                        {profile?.display_name || 'Golfer'}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        {w.match_count}-number match
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          w.status === 'approved' || w.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : w.status === 'rejected'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {w.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-400">
                      Draw: <strong className="text-white">{draw?.title}</strong> ({draw?.cycle_month}) · Prize:{' '}
                      <strong className="text-emerald-400">
                        ₹{(w.prize_amount_paise / 100).toLocaleString('en-IN')}
                      </strong>
                    </p>

                    {verif?.rejection_reason && (
                      <p className="text-xs text-red-400">
                        <strong>User Explanation:</strong> {verif.rejection_reason}
                      </p>
                    )}
                    {verif?.internal_audit_reason && (
                      <p className="text-xs text-neutral-400 font-mono">
                        <strong>Internal Audit:</strong> {verif.internal_audit_reason}
                      </p>
                    )}

                    {payout?.provider_payout_id && (
                      <p className="text-xs text-neutral-400">
                        Payout Reference:{' '}
                        <span className="font-mono text-white">{payout.provider_payout_id}</span>
                        {payout.paid_at && ` · Paid on ${new Date(payout.paid_at).toLocaleDateString('en-IN')}`}
                      </p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-4 shrink-0">
                    {/* Verification review (view proof, approve, reject) */}
                    {verif && (
                      <VerificationReviewActions
                        verificationId={verif.id}
                        winnerId={w.id}
                        proofPath={verif.proof_storage_path}
                        currentStatus={w.status}
                      />
                    )}

                    {/* Payout action (mark paid / pending with Stripe ref) */}
                    {(w.status === 'approved' || w.status === 'paid') && (
                      <WinnerPayoutAction
                        winnerId={w.id}
                        amountPaise={w.prize_amount_paise}
                        payoutStatus={(payout?.status as 'pending' | 'paid') || 'pending'}
                        currentPayoutRef={payout?.provider_payout_id}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500 text-sm">
            No winners found matching the current filters.
          </div>
        )}
      </div>
    </div>
  )
}
