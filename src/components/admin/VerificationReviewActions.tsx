'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2, AlertCircle, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  verificationId: string
  winnerId: string
  proofPath: string
  currentStatus: string
}

export default function VerificationReviewActions({
  verificationId,
  winnerId,
  proofPath,
  currentStatus,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [userExplanation, setUserExplanation] = useState('')
  const [internalReason, setInternalReason] = useState('')

  // View proof via trusted server-side signed URL endpoint
  async function handleViewProof() {
    try {
      const res = await fetch(`/api/admin/verifications/${verificationId}/proof-url`)
      const data = await res.json()
      if (!res.ok || !data.signedUrl) {
        throw new Error(data.error || 'Failed to retrieve proof URL')
      }
      window.open(data.signedUrl, '_blank')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to view proof')
    }
  }

  async function handleReview(approved: boolean) {
    if (!approved && (!userExplanation.trim() || !internalReason.trim())) {
      setError('Both user-facing explanation and internal audit reason are required for rejection.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/proof-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          verificationId,
          approved,
          rejectionReason: approved ? null : userExplanation.trim(),
          internalAuditReason: approved ? null : internalReason.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to review verification')

      setShowRejectModal(false)
      setUserExplanation('')
      setInternalReason('')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Review failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-2 bg-red-500/10 border border-red-500/25 rounded-lg text-red-400 text-xs flex items-center gap-1.5">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {proofPath && (
          <button
            type="button"
            onClick={handleViewProof}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Eye size={14} /> View Scorecard Proof
          </button>
        )}

        {currentStatus === 'proof_submitted' && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleReview(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Approve Proof
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setShowRejectModal(true)
                setError(null)
              }}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <X size={14} /> Reject Proof
            </button>
          </>
        )}
      </div>

      {/* Dual Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass rounded-3xl p-6 space-y-4 border border-white/10">
            <h3 className="text-base font-bold text-white">Reject Winner Verification</h3>
            <p className="text-xs text-neutral-400">
              Provide both an internal reason for audit logs and a clear explanation shown to the subscriber.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-neutral-300 font-semibold block">
                  User-Facing Explanation (Visible on Subscriber Dashboard)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. The scorecard photo is blurry and the round date does not match your entry. Please upload a clear photo."
                  value={userExplanation}
                  onChange={(e) => setUserExplanation(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-300 font-semibold block">
                  Internal Audit Reason (Stored in Compliance Audit Logs)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Unclear signature from club marker; stableford points mismatch with handicap index."
                  value={internalReason}
                  onChange={(e) => setInternalReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || !userExplanation.trim() || !internalReason.trim()}
                onClick={() => handleReview(false)}
                className="px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading && <Loader2 size={12} className="animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
