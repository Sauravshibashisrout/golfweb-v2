'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Banknote, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  winnerId: string
  amountPaise: number
}

export default function RecordPayoutButton({ winnerId, amountPaise }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [providerPayoutId, setProviderPayoutId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRecordPayout(e: React.FormEvent) {
    e.preventDefault()
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
          providerPayoutId: providerPayoutId || `payout_${Date.now()}`,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to record payout')

      setOpen(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Record payout failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
      >
        <Banknote size={14} /> Record Payout
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass rounded-3xl p-6 sm:p-8 space-y-5 border border-white/10">
            <h3 className="text-lg font-bold text-white">Record Prize Payout</h3>

            <p className="text-xs text-neutral-400">
              Amount to disburse:{' '}
              <span className="text-emerald-400 font-bold text-sm">
                ₹{(amountPaise / 100).toLocaleString('en-IN')}
              </span>
            </p>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRecordPayout} className="space-y-4">
              <div>
                <label className="text-xs text-neutral-400 uppercase font-semibold">Bank / UPI Transfer Ref</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR123456789 or UPI Ref"
                  value={providerPayoutId}
                  onChange={(e) => setProviderPayoutId(e.target.value)}
                  className="w-full mt-1.5 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-white text-xs hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  Confirm Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
