'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Banknote, Loader2, AlertCircle, CheckCircle2, RotateCcw, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  winnerId: string
  amountPaise: number
  payoutStatus?: 'pending' | 'paid' | null
  currentPayoutRef?: string | null
}

export default function WinnerPayoutAction({
  winnerId,
  amountPaise,
  payoutStatus,
  currentPayoutRef,
}: Props) {
  const router = useRouter()
  const [openModal, setOpenModal] = useState(false)
  const [payoutRef, setPayoutRef] = useState(currentPayoutRef || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpdatePayout(targetStatus: 'pending' | 'paid') {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payout-record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          winnerId,
          providerPayoutId: payoutRef || (targetStatus === 'paid' ? `po_${Date.now()}` : null),
          status: targetStatus,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to update payout')

      setOpenModal(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payout operation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {payoutStatus === 'paid' ? (
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
            Paid
          </span>
          <button
            type="button"
            onClick={() => setOpenModal(true)}
            title="Edit Payout Details"
            className="text-[11px] text-neutral-400 hover:text-white underline"
          >
            Edit Ref
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpenModal(true)}
          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Banknote size={13} /> Record Payout
        </button>
      )}

      {openModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass rounded-3xl p-6 space-y-4 border border-white/10 relative">
            <button
              onClick={() => setOpenModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"
            >
              <X size={16} />
            </button>

            <div>
              <h3 className="text-base font-bold text-white">Prize Payout Management</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Amount: <strong className="text-emerald-400">₹{(amountPaise / 100).toLocaleString('en-IN')}</strong>
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-xs text-neutral-300 font-semibold block">
                Stripe Payout Reference or Bank UTR
              </label>
              <input
                type="text"
                placeholder="e.g. po_123456789 or UTR987654321"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                Store Stripe payout ID (`po_...`) or manual bank transfer reference.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              {payoutStatus === 'paid' && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleUpdatePayout('pending')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1.5"
                >
                  <RotateCcw size={12} /> Set to Pending
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleUpdatePayout('paid')}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  Mark as Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
