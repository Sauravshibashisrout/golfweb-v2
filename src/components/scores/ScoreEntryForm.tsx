'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlusCircle, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function ScoreEntryForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [score, setScore] = useState<string>('')
  const [playedOn, setPlayedOn] = useState<string>(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const scoreNum = parseInt(score, 10)
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 45) {
      setError('Stableford score must be between 1 and 45 points.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: insertError } = await supabase.from('golf_scores').insert({
      user_id: userId,
      stableford_score: scoreNum,
      played_on: playedOn,
    })

    if (insertError) {
      if (insertError.message.includes('unique') || insertError.code === '23505') {
        setError('You have already logged a score for this date. Please pick a different date or edit the existing score.')
      } else {
        setError(insertError.message)
      }
      setLoading(false)
      return
    }

    setSuccess(`Score of ${scoreNum} logged successfully for ${playedOn}!`)
    setScore('')
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-3xl p-6 sm:p-8 space-y-4">
      <div className="flex items-center gap-2 text-white font-bold text-lg">
        <PlusCircle size={20} className="text-emerald-400" />
        Log a Stableford Score
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-neutral-400 uppercase font-semibold">Date Played</label>
          <input
            type="date"
            required
            max={new Date().toISOString().split('T')[0]}
            value={playedOn}
            onChange={(e) => setPlayedOn(e.target.value)}
            className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-400 uppercase font-semibold">Stableford Points (1 – 45)</label>
          <input
            type="number"
            required
            min="1"
            max="45"
            placeholder="e.g. 36"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Score'}
      </button>
    </form>
  )
}
