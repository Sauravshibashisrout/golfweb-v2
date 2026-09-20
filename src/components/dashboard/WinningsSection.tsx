'use client'

import { useState } from 'react'
import { Trophy, Upload, CheckCircle2, AlertCircle, Clock, Banknote, ShieldAlert, X } from 'lucide-react'
import WinnerProofUploadForm from '@/components/draw/WinnerProofUploadForm'

type WinnerRecord = {
  id: string
  draw_id: string
  match_count: number
  prize_amount_paise: number
  status: string
  created_at: string
  draws?: {
    title: string
    cycle_month: string
  } | null
  winner_verifications?: {
    id: string
    proof_storage_path: string
    approved: boolean | null
    rejection_reason: string | null
    submitted_at: string | null
  }[] | null
  payouts?: {
    id: string
    status: string
    provider_payout_id: string | null
    paid_at: string | null
  } | {
    id: string
    status: string
    provider_payout_id: string | null
    paid_at: string | null
  }[] | null
}

type Props = {
  winners: WinnerRecord[]
  cashPrizeDrawEnabled: boolean
  userId: string
}

export default function WinningsSection({ winners, cashPrizeDrawEnabled, userId }: Props) {
  const [activeUploadWinner, setActiveUploadWinner] = useState<WinnerRecord | null>(null)

  // Total winnings in paise
  const totalWinningsPaise = winners.reduce((sum, w) => sum + (w.prize_amount_paise || 0), 0)

  return (
    <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
      {/* Header & Total */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Your Winnings & Payouts</h2>
            {!cashPrizeDrawEnabled && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                Demo / Sandbox Mode
              </span>
            )}
          </div>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            {cashPrizeDrawEnabled
              ? 'Track prize claims, scorecard verification, and disbursements.'
              : 'Simulated demo rewards for performance tracking. Cash prizes currently disabled.'}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs text-neutral-500 uppercase font-semibold">
            {cashPrizeDrawEnabled ? 'Total Winnings' : 'Simulated Rewards'}
          </span>
          <p className="text-2xl font-black text-emerald-400 mt-0.5">
            ₹{(totalWinningsPaise / 100).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Transparent Sandbox Warning Banner */}
      {!cashPrizeDrawEnabled && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-300 leading-relaxed">
          <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold text-white">Transparent Reward Notice: </strong>
            Cash prize draws are currently disabled under local jurisdiction guidelines (`cashPrizeDrawEnabled: false`). All score draws and prize amounts shown are simulated demo experiences for testing and performance tracking. No real money prizes are collected or disbursed.
          </div>
        </div>
      )}

      {/* Winning Records List */}
      {winners.length > 0 ? (
        <div className="divide-y divide-white/5">
          {winners.map((w) => {
            const verification = w.winner_verifications?.[0]
            const payout = Array.isArray(w.payouts) ? w.payouts[0] : w.payouts
            const isPendingProof = w.status === 'pending_proof'
            const isUnderReview = w.status === 'proof_submitted'
            const isRejected = w.status === 'rejected'
            const isApproved = w.status === 'approved'
            const isPaid = w.status === 'paid'

            return (
              <div key={w.id} className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {w.match_count}-Number Match
                    </span>
                    <span className="text-xs text-neutral-400">
                      · {w.draws?.title || 'Monthly Draw'} ({w.draws?.cycle_month || 'Cycle'})
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300">
                    Prize:{' '}
                    <span className="text-emerald-400 font-bold">
                      ₹{((w.prize_amount_paise || 0) / 100).toLocaleString('en-IN')}
                    </span>
                    {!cashPrizeDrawEnabled && (
                      <span className="text-neutral-500 text-[11px] ml-1.5">(Simulated)</span>
                    )}
                  </p>

                  {/* Status Badges & Alerts */}
                  {isPendingProof && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 font-medium mt-1">
                      <Clock size={12} /> Scorecard verification required to claim prize
                    </div>
                  )}

                  {isUnderReview && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 font-medium mt-1">
                      <Clock size={12} /> Scorecard proof under admin review
                    </div>
                  )}

                  {isRejected && (
                    <div className="space-y-1 mt-1">
                      <div className="inline-flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20 font-medium">
                        <AlertCircle size={12} /> Proof Rejected
                      </div>
                      {verification?.rejection_reason && (
                        <p className="text-xs text-red-300 bg-red-500/5 p-2 rounded-xl border border-red-500/15">
                          <strong>Explanation from Admin:</strong> {verification.rejection_reason}
                        </p>
                      )}
                    </div>
                  )}

                  {isApproved && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium mt-1">
                      <CheckCircle2 size={12} /> Scorecard Verified · Payout task scheduled
                    </div>
                  )}

                  {isPaid && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium mt-1">
                      <Banknote size={12} /> Disbursed{' '}
                      {payout?.paid_at ? `on ${new Date(payout.paid_at).toLocaleDateString('en-IN')}` : 'Completed'}
                      {payout?.provider_payout_id && (
                        <span className="font-mono text-neutral-400"> (Ref: {payout.provider_payout_id})</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0">
                  {isPendingProof && (
                    <button
                      onClick={() => setActiveUploadWinner(w)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors"
                    >
                      <Upload size={13} /> Upload Proof
                    </button>
                  )}

                  {isRejected && (
                    <button
                      onClick={() => setActiveUploadWinner(w)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors"
                    >
                      <Upload size={13} /> Re-upload Proof
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-neutral-500 text-xs">
          No winning records yet. Keep playing and logging scores to win in the monthly draw!
        </div>
      )}

      {/* Proof Upload Modal */}
      {activeUploadWinner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg relative">
            <button
              onClick={() => setActiveUploadWinner(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={16} />
            </button>
            <WinnerProofUploadForm
              winnerId={activeUploadWinner.id}
              matchCount={activeUploadWinner.match_count}
              prizePaise={activeUploadWinner.prize_amount_paise}
              cashEnabled={cashPrizeDrawEnabled}
              onSuccess={() => {
                setActiveUploadWinner(null)
                window.location.reload()
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
