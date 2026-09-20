'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'

type Plan = {
  id: string
  name: string
  amount_paise: number
  interval_months: number
}

const FEATURES = [
  'Log Stableford scores from real rounds',
  'Choose a verified charity to support',
  'Monthly charity allocation from your membership',
  'Score-based reward draw entry (where available)',
  'Full score history & progress tracking',
]

function formatINR(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export default function PricingCards({
  plans,
  preselectedCharityId,
}: {
  plans: Plan[]
  preselectedCharityId?: string
}) {
  const router = useRouter()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const monthly = plans.find(p => p.id === 'monthly') || {
    id: 'monthly',
    name: 'Monthly Membership',
    amount_paise: 59900,
    interval_months: 1,
  }

  const annual = plans.find(p => p.id === 'annual') || {
    id: 'annual',
    name: 'Annual Membership',
    amount_paise: 599900,
    interval_months: 12,
  }

  async function handleCheckout(planId: string) {
    setLoadingPlan(planId)
    setError(null)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })

      if (res.status === 401) {
        const charityParam = preselectedCharityId ? `&charity=${preselectedCharityId}` : ''
        router.push(`/signup?next=/pricing&plan=${planId}${charityParam}`)
        return
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout session')

      if (data.url) {
        window.location.href = data.url
        return
      }

      throw new Error('No checkout URL returned')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setLoadingPlan(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1-Click Testing Mode Notice */}
      <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
          <span>⚡</span> Free Testing Mode Active
        </div>
        <p className="text-xs text-neutral-300">
          All memberships are unlocked with <strong>1-Click Instant Activation</strong>. No credit card or payments required — full access granted forever.
        </p>
      </div>

      {error && (
        <div className="max-w-md mx-auto p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Monthly */}
        <div className="glass rounded-2xl p-8 flex flex-col">
          <p className="text-sm text-neutral-400 mb-1">{monthly.name}</p>
          <div className="flex items-end gap-1 mb-6">
            <span className="text-4xl font-bold text-white">{formatINR(monthly.amount_paise)}</span>
            <span className="text-neutral-400 mb-1">/month (Free in Test)</span>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            {FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-neutral-300">
                <Check size={16} className="text-green-400 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => handleCheckout('monthly')}
            disabled={loadingPlan !== null}
            className="w-full py-3.5 rounded-xl border border-emerald-500/30 bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:border-emerald-400"
          >
            {loadingPlan === 'monthly' && <Loader2 size={16} className="animate-spin" />}
            Activate Monthly (1-Click Free)
          </button>
        </div>

        {/* Annual */}
        <div className="relative rounded-2xl p-8 flex flex-col bg-emerald-500/10 border border-emerald-500/30">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full">
            RECOMMENDED — FOREVER ACCESS
          </div>
          <p className="text-sm text-neutral-400 mb-1">{annual.name}</p>
          <div className="flex items-end gap-1 mb-1">
            <span className="text-4xl font-bold text-white">{formatINR(annual.amount_paise)}</span>
            <span className="text-neutral-400 mb-1">/year (Free in Test)</span>
          </div>
          <p className="text-xs text-emerald-400 mb-6">
            Full testing access unlocked forever
          </p>
          <ul className="space-y-3 mb-8 flex-1">
            {FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-neutral-300">
                <Check size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
            <li className="flex items-start gap-2 text-sm text-emerald-300 font-medium">
              <Check size={16} className="text-emerald-400 mt-0.5 shrink-0" />
              Charity allocation spread across all 12 months
            </li>
          </ul>
          <button
            onClick={() => handleCheckout('annual')}
            disabled={loadingPlan !== null}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
          >
            {loadingPlan === 'annual' && <Loader2 size={16} className="animate-spin" />}
            Activate Annual (1-Click Free)
          </button>
        </div>
      </div>
    </div>
  )
}
