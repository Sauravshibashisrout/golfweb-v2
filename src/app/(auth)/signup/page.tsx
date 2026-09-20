'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertCircle, Heart } from 'lucide-react'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton'

type CharityOption = {
  id: string
  name: string
  slug: string
  short_description: string
  categories: string[]
}

const PERCENTAGE_OPTIONS = [10, 15, 20, 25, 30, 40]

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/pricing'

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [charities, setCharities] = useState<CharityOption[]>([])
  const [selectedCharity, setSelectedCharity] = useState<string>('')
  const [selectedPercentage, setSelectedPercentage] = useState<number>(10)
  const [loadingCharities, setLoadingCharities] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCharities() {
      const supabase = createClient()
      const { data } = await supabase
        .from('charities')
        .select('id, name, slug, short_description, categories')
        .eq('is_published', true)
        .eq('is_archived', false)
        .order('name', { ascending: true })

      if (data && data.length > 0) {
        setCharities(data)
        const paramCharity = searchParams.get('charity')
        if (paramCharity && data.some((c) => c.id === paramCharity)) {
          setSelectedCharity(paramCharity)
        } else {
          setSelectedCharity(data[0].id)
        }
      }
      setLoadingCharities(false)
    }
    loadCharities()
  }, [searchParams])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCharity) {
      setError('Please select a charity partner to support with your membership.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      // Save initial charity preference
      const now = new Date().toISOString()
      await supabase.from('charity_preferences').insert({
        user_id: authData.user.id,
        charity_id: selectedCharity,
        contribution_percentage: selectedPercentage,
        effective_from: now,
      })
    }

    router.push(next)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-neutral-950">
      <div className="w-full max-w-lg space-y-8 glass rounded-3xl p-8 sm:p-10 border border-white/10">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-white text-xl">
            <span className="text-emerald-400">⛳</span> GolfGives
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
          <p className="text-neutral-400 text-sm">Join golfers giving back across India</p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-2xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <GoogleSignInButton next={next} text="Sign up with Google" />

          <div className="relative flex items-center justify-center pt-2">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-neutral-950 px-3 text-[11px] uppercase tracking-wider text-neutral-500 font-semibold absolute">
              or register with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">Your Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Kapil Dev"
              className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

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
            <label className="text-xs text-neutral-400 uppercase font-semibold">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          {/* Charity Selection */}
          <div className="pt-2 border-t border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Heart size={16} />
              <label className="text-xs uppercase font-bold tracking-wider">Choose Your Charity Partner</label>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Every membership payment automatically supports your chosen cause. You can change this anytime from your dashboard.
            </p>

            {loadingCharities ? (
              <div className="py-4 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Loading vetted charities...
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  required
                  value={selectedCharity}
                  onChange={(e) => setSelectedCharity(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm"
                >
                  {charities.map((c) => (
                    <option key={c.id} value={c.id} className="bg-neutral-900 text-white">
                      {c.name} {c.categories?.[0] ? `(${c.categories[0]})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Contribution Percentage Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-neutral-400 uppercase font-semibold">Charity Contribution Rate</label>
              <span className="text-xs font-bold text-emerald-400">{selectedPercentage}% of fee</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {PERCENTAGE_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setSelectedPercentage(pct)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                    selectedPercentage === pct
                      ? 'bg-emerald-500 text-neutral-950 border-emerald-500'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-500">
              Default is 10%. 100% of your chosen allocation goes directly to the charity.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || loadingCharities}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create Account & Continue'}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-neutral-400 text-xs">
            Already have an account?{' '}
            <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-emerald-400 hover:text-emerald-300 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-400">Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
}

