import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'
import RecordPayoutButton from '@/components/admin/RecordPayoutButton'
import { ArrowLeft, CheckCircle2, Banknote } from 'lucide-react'

export const metadata = {
  title: 'Manage Payouts — Admin Console',
}

export default async function AdminPayoutsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  const db = createAdminClient()

  // Load approved and paid winners
  const { data: winners } = await db
    .from('draw_winners')
    .select(`
      id,
      match_count,
      prize_amount_paise,
      status,
      created_at,
      profiles (
        id,
        display_name,
        phone
      ),
      draws (
        title,
        cycle_month
      ),
      payouts (
        id,
        status,
        provider_payout_id,
        paid_at
      )
    `)
    .in('status', ['approved', 'paid'])
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft size={14} /> Back to Console
        </Link>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Prize Payouts</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Disburse prizes to approved winners and record transaction references.
        </p>
      </div>

      <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
        {winners && winners.length > 0 ? (
          <div className="divide-y divide-white/5">
            {winners.map((w) => {
              const profile = w.profiles as unknown as { display_name: string | null; phone: string | null } | null
              const draw = w.draws as unknown as { title: string; cycle_month: string } | null
              const payout = (w.payouts as unknown as { status: string; provider_payout_id: string | null; paid_at: string | null }[])?.[0]

              return (
                <div key={w.id} className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">
                        {profile?.display_name || 'Golfer'}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                        {w.match_count} matches
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                          w.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}
                      >
                        {w.status}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-400">
                      Draw: {draw?.title || 'Monthly Draw'} ({draw?.cycle_month})
                    </p>

                    <p className="text-xs text-neutral-300">
                      Prize:{' '}
                      <span className="text-emerald-400 font-bold">
                        ₹{(w.prize_amount_paise / 100).toLocaleString('en-IN')}
                      </span>
                      {payout?.provider_payout_id && (
                        <> · Ref: <span className="font-mono text-neutral-400">{payout.provider_payout_id}</span></>
                      )}
                    </p>
                  </div>

                  <div>
                    {w.status === 'approved' ? (
                      <RecordPayoutButton
                        winnerId={w.id}
                        amountPaise={w.prize_amount_paise}
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                        <CheckCircle2 size={16} /> Paid on {payout?.paid_at ? new Date(payout.paid_at).toLocaleDateString('en-IN') : 'Completed'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500 text-sm">
            No approved winners awaiting payout.
          </div>
        )}
      </div>
    </div>
  )
}
