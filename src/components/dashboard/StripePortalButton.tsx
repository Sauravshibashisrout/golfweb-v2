'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

export default function StripePortalButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleOpenPortal() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to open billing portal')

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Billing portal unavailable')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleOpenPortal}
        disabled={loading}
        className={className || 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors disabled:opacity-50'}
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
        Manage Billing & Invoices
      </button>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  )
}
