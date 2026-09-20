'use client'

import { useState } from 'react'
import { Heart, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type Props = {
  charityId: string
  charityName: string
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000]

export default function DirectDonationModal({ charityId, charityName }: Props) {
  const [selectedAmount, setSelectedAmount] = useState<number>(1000)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  const activeAmountPaise = customAmount ? Math.round(Number(customAmount) * 100) : selectedAmount * 100

  async function handleDonate() {
    if (activeAmountPaise < 10000) {
      setError('Minimum donation amount is ₹100')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/donations/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charityId,
          amountPaise: activeAmountPaise,
          provider: 'stripe',
          origin: window.location.origin,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create donation session')

      // Stripe Checkout URL redirection (mode: 'payment')
      if (data.url) {
        window.location.href = data.url
        return
      }

      throw new Error('No checkout URL returned')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Donation failed')
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-3 text-emerald-400">
        <Heart size={24} />
        <h3 className="text-xl font-bold text-white">Make a Direct Donation</h3>
      </div>
      <p className="text-neutral-400 text-sm">
        100% of direct donations go straight to {charityName}.
      </p>

      {success ? (
        <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-2">
          <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
          <h4 className="text-lg font-bold text-white">Thank You for Your Generosity!</h4>
          <p className="text-neutral-300 text-sm">
            Your donation has been successfully processed and allocated to {charityName}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Preset Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {PRESET_AMOUNTS.map((amt) => {
              const isSelected = !customAmount && selectedAmount === amt
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amt)
                    setCustomAmount('')
                  }}
                  className={`py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    isSelected
                      ? 'bg-emerald-500 text-neutral-950 border-emerald-500'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  ₹{amt.toLocaleString('en-IN')}
                </button>
              )
            })}
          </div>

          {/* Custom Input */}
          <div>
            <label className="text-xs text-neutral-500 uppercase font-semibold">Or enter custom amount (₹)</label>
            <input
              type="number"
              min="100"
              placeholder="e.g. 10000"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleDonate}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} />}
            Donate ₹{((activeAmountPaise) / 100).toLocaleString('en-IN')}
          </button>
        </div>
      )}
    </div>
  )
}
