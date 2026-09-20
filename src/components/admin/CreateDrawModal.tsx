'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function CreateDrawModal({ cashEnabled }: { cashEnabled: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [cycleMonth, setCycleMonth] = useState('')
  const [mode, setMode] = useState<'random' | 'algorithmic'>('random')
  const [cashPrize, setCashPrize] = useState(false)
  const [legalRef, setLegalRef] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (cashPrize && !cashEnabled) {
      setError('Cash prize draws are currently disabled in app settings.')
      setLoading(false)
      return
    }

    if (cashPrize && !legalRef) {
      setError('Legal approval reference is required when enabling cash prizes.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/draw-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          title,
          cycleMonth: `${cycleMonth}-01`,
          mode,
          cashPrizeEnabled: cashPrize,
          legalApprovalRef: legalRef || null,
          rewardPoolPaise: 0,
        }),
      })

      const text = await res.text()
      let data: any = {}
      try {
        data = JSON.parse(text)
      } catch {
        data = { error: text }
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to create draw')
      }

      setOpen(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create draw')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors"
      >
        <Plus size={16} /> Create Draw
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
            <h3 className="text-xl font-bold text-white">Create New Draw</h3>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-neutral-400 uppercase font-semibold">Draw Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October 2026 Monthly Draw"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 uppercase font-semibold">Cycle Month (YYYY-MM)</label>
                <input
                  type="month"
                  required
                  value={cycleMonth}
                  onChange={(e) => setCycleMonth(e.target.value)}
                  className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 uppercase font-semibold">Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'random' | 'algorithmic')}
                  className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="random" className="bg-neutral-900">Random (Web Crypto Rejection Sampling)</option>
                  <option value="algorithmic" className="bg-neutral-900">Algorithmic (Pre-published SHA-256)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-xs text-neutral-400 uppercase font-semibold">Enable Cash Prizes</label>
                <input
                  type="checkbox"
                  checked={cashPrize}
                  onChange={(e) => setCashPrize(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
                />
              </div>

              {cashPrize && (
                <div>
                  <label className="text-xs text-neutral-400 uppercase font-semibold">Legal Approval Reference</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LGL-2026-IN-001"
                    value={legalRef}
                    onChange={(e) => setLegalRef(e.target.value)}
                    className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-white text-xs font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  Create Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
