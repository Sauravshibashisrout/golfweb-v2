'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-neutral-950">
      <div className="w-full max-w-md space-y-8 glass rounded-3xl p-8 sm:p-10 border border-white/10">
        <Link href="/login" className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Back to Sign in
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Reset password</h1>
          <p className="text-neutral-400 text-sm">We'll send you an email with reset instructions</p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-2xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-3">
            <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
            <h4 className="text-base font-bold text-white">Check your email</h4>
            <p className="text-xs text-neutral-300 leading-relaxed">
              If an account exists for <span className="text-white font-medium">{email}</span>, you will receive password reset instructions shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-xs text-neutral-400 uppercase font-semibold">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
