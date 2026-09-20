import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'
import VerificationReviewActions from '@/components/admin/VerificationReviewActions'
import { ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react'

export const metadata = {
  title: 'Winner Proof Verifications — Admin Console',
}

export default async function AdminVerificationsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  const db = createAdminClient()

  // Load verifications with winner and profile details
  const { data: verifications } = await db
    .from('winner_verifications')
    .select(`
      id,
      winner_id,
      proof_storage_path,
      submitted_at,
      approved,
      rejection_reason,
      internal_audit_reason,
      draw_winners (
        id,
        match_count,
        prize_amount_paise,
        status,
        profiles (
          id,
          display_name
        )
      )
    `)
    .order('submitted_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft size={14} /> Back to Console
        </Link>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Scorecard Verifications</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Verify uploaded score proof before authorizing prize disbursements.
        </p>
      </div>

      <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
        {verifications && verifications.length > 0 ? (
          <div className="divide-y divide-white/5">
            {verifications.map((v) => {
              const winner = v.draw_winners as unknown as {
                id: string
                match_count: number
                prize_amount_paise: number
                status: string
                profiles: { display_name: string | null } | null
              } | null

              return (
                <div key={v.id} className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {winner?.profiles?.display_name || 'Golfer'}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                        {winner?.match_count}-number match
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full capitalize font-semibold ${
                          winner?.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : winner?.status === 'rejected'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {winner?.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-400">
                      Prize: <span className="text-white font-semibold">₹{((winner?.prize_amount_paise ?? 0) / 100).toLocaleString('en-IN')}</span>
                      {v.submitted_at && <> · Submitted on {new Date(v.submitted_at).toLocaleDateString('en-IN')}</>}
                    </p>

                    {v.rejection_reason && (
                      <p className="text-xs text-red-400 mt-1">
                        <strong>User Explanation:</strong> {v.rejection_reason}
                      </p>
                    )}
                    {v.internal_audit_reason && (
                      <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                        <strong>Internal Audit Note:</strong> {v.internal_audit_reason}
                      </p>
                    )}
                  </div>

                  <VerificationReviewActions
                    verificationId={v.id}
                    winnerId={v.winner_id}
                    proofPath={v.proof_storage_path}
                    currentStatus={winner?.status || 'pending_proof'}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500 text-sm">
            No winner verifications submitted yet.
          </div>
        )}
      </div>
    </div>
  )
}
