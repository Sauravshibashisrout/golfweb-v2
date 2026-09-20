'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertCircle } from 'lucide-react'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const urlError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(urlError)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push(next)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-neutral-950">
      <div className="w-full max-w-md space-y-6 glass rounded-3xl p-8 sm:p-10 border border-white/10">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-white text-xl">
            <span className="text-emerald-400">⛳</span> GolfGives
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
          <p className="text-neutral-400 text-sm">Sign in to your account</p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-2xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <GoogleSignInButton next={next} text="Continue with Google" />

          <div className="relative flex items-center justify-center pt-2">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-neutral-950 px-3 text-[11px] uppercase tracking-wider text-neutral-500 font-semibold absolute">
              or with email
            </span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-neutral-400 uppercase font-semibold">Password</label>
              <Link href="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign in'}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-neutral-400 text-xs">
            Don't have an account?{' '}
            <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-emerald-400 hover:text-emerald-300 font-semibold">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
