'use client'

import { useState } from 'react'
import { Shield, ShieldAlert, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  userId: string
  currentRole: 'subscriber' | 'admin'
}

export default function UserAccessControl({ userId, currentRole }: Props) {
  const [role, setRole] = useState<'subscriber' | 'admin'>(currentRole)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleRoleChange(newRole: 'subscriber' | 'admin') {
    if (newRole === role) return
    if (!confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-user-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          userId,
          role: newRole,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to update user access')

      setRole(newRole)
      setSuccess(`User role updated to ${newRole}. Recorded in audit log.`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-emerald-400" />
          <h3 className="text-base font-bold text-white">Access & Permissions</h3>
        </div>
        <span
          className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
            role === 'admin'
              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}
        >
          {role}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-xs text-neutral-400">
        <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white">Stripe Integrity Notice: </strong>
          Subscription entitlements, draw qualifications, and billing cycles are strictly governed by verified Stripe & Razorpay payment transactions. Changing an account role does not bypass or forge verified payment records.
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 size={15} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <span className="text-xs text-neutral-400 font-medium">Assign System Role:</span>
        <button
          type="button"
          disabled={loading || role === 'subscriber'}
          onClick={() => handleRoleChange('subscriber')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            role === 'subscriber'
              ? 'bg-emerald-500 text-neutral-950 opacity-100 cursor-default'
              : 'bg-white/5 hover:bg-white/10 text-white'
          }`}
        >
          Subscriber
        </button>

        <button
          type="button"
          disabled={loading || role === 'admin'}
          onClick={() => handleRoleChange('admin')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            role === 'admin'
              ? 'bg-purple-500 text-white opacity-100 cursor-default'
              : 'bg-white/5 hover:bg-white/10 text-white'
          }`}
        >
          Administrator
        </button>

        {loading && <Loader2 size={14} className="animate-spin text-neutral-400" />}
      </div>
    </div>
  )
}
