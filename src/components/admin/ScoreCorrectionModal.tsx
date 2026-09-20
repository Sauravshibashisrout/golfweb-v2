'use client'

import { useState } from 'react'
import { Edit3, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  score: {
    id: string
    stableford_score: number
    played_on: string
  }
  onClose: () => void
  onSuccess: () => void
}

export default function ScoreCorrectionModal({ score, onClose, onSuccess }: Props) {
  const [scoreVal, setScoreVal] = useState(String(score.stableford_score))
  const [dateVal, setDateVal] = useState(score.played_on)
  const [auditNote, setAuditNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const scoreNum = Number(scoreVal)
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 45) {
      setError('Stableford score must be between 1 and 45')
      return
    }

    if (!auditNote.trim() || auditNote.trim().length < 5) {
      setError('A mandatory audit note (at least 5 characters) is required explaining why this score was corrected.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-score-correct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          scoreId: score.id,
          stablefordScore: scoreNum,
          playedOn: dateVal,
          auditNote: auditNote.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to correct score')

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 1000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Correction failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md glass rounded-3xl p-6 sm:p-8 space-y-5 border border-white/10 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Edit3 size={18} className="text-emerald-400" />
            Correct Golf Score
          </div>
          <p className="text-neutral-400 text-xs">
            Admin corrections are permanently recorded in the immutable system audit log.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-1">
            <CheckCircle2 size={24} className="text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-white">Score Corrected & Audited</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 uppercase font-semibold">Date Played</label>
                <input
                  type="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  value={dateVal}
                  onChange={(e) => setDateVal(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 uppercase font-semibold">Score (1 – 45)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="45"
                  value={scoreVal}
                  onChange={(e) => setScoreVal(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-300 font-semibold flex items-center justify-between">
                <span>Mandatory Audit Note</span>
                <span className="text-[10px] text-emerald-400 uppercase">Required</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Club marker scorecard review confirmed hole 14 was a par rather than bogey; score updated from 34 to 36."
                value={auditNote}
                onChange={(e) => setAuditNote(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                This explanation will be written to `audit_logs` with your admin ID and timestamp.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs text-neutral-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading && <Loader2 size={13} className="animate-spin" />}
                Confirm Correction
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
