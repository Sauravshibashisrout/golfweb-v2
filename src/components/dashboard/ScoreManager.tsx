'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, Edit3, Trash2, CheckCircle2, AlertCircle, Loader2, Calendar, Sparkles } from 'lucide-react'

type Score = {
  id: string
  stableford_score: number
  played_on: string
  created_at: string
}

type Props = {
  initialScores: Score[]
  userId: string
}

export default function ScoreManager({ initialScores, userId }: Props) {
  const router = useRouter()
  const [scores, setScores] = useState<Score[]>(initialScores)
  const [isAdding, setIsAdding] = useState(false)
  const [editingScore, setEditingScore] = useState<Score | null>(null)

  // Form states
  const [addScoreVal, setAddScoreVal] = useState('')
  const [addDateVal, setAddDateVal] = useState(new Date().toISOString().split('T')[0])
  const [editScoreVal, setEditScoreVal] = useState('')
  const [editDateVal, setEditDateVal] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const latestFive = scores.slice(0, 5)
  const isQualified = latestFive.length >= 5

  // Check for duplicate score values
  const scoreValues = latestFive.map(s => s.stableford_score)
  const uniqueScoreCount = new Set(scoreValues).size
  const hasDuplicates = uniqueScoreCount < scoreValues.length

  async function handleAddScore(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const scoreNum = parseInt(addScoreVal, 10)
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 45) {
      setError('Stableford score must be between 1 and 45 points.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stableford_score: scoreNum,
          played_on: addDateVal,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add score')
      }

      if (data.score) {
        setScores(prev => [data.score, ...prev.filter(s => s.id !== data.score.id)].sort((a, b) => b.played_on.localeCompare(a.played_on)).slice(0, 5))
      }

      setSuccess(`Score of ${scoreNum} logged!`)
      setAddScoreVal('')
      setIsAdding(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add score')
    } finally {
      setLoading(false)
    }
  }

  async function handleEditScore(e: React.FormEvent) {
    e.preventDefault()
    if (!editingScore) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const scoreNum = parseInt(editScoreVal, 10)
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 45) {
      setError('Stableford score must be between 1 and 45 points.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/scores/${editingScore.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stableford_score: scoreNum,
          played_on: editDateVal,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update score')

      setScores(prev => prev.map(s => s.id === editingScore.id ? data.score : s))
      setSuccess('Score updated successfully!')
      setEditingScore(null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update score')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteScore(scoreId: string) {
    if (!confirm('Are you sure you want to delete this score?')) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/scores/${scoreId}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete score')

      setScores(prev => prev.filter(s => s.id !== scoreId))
      setSuccess('Score deleted.')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete score')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
      {/* Header & Qualification State */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Latest Five Scores</h2>
            {isQualified ? (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                <CheckCircle2 size={12} /> Draw Qualified (5/5)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                {latestFive.length}/5 Scores ({5 - latestFive.length} more needed)
              </span>
            )}
          </div>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Your 5 latest Stableford scores form your 5-number draw entry.
          </p>
        </div>

        {!isAdding && !editingScore && (
          <button
            onClick={() => {
              setIsAdding(true)
              setError(null)
              setSuccess(null)
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors shrink-0"
          >
            <PlusCircle size={14} /> Log New Score
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isQualified ? 'bg-emerald-500' : 'bg-amber-400'}`}
            style={{ width: `${Math.min(100, (latestFive.length / 5) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-neutral-500">
          <span>Minimum 5 scores required to enter monthly reward draw</span>
          <span>{latestFive.length} of 5</span>
        </div>
      </div>

      {/* Duplicate warning */}
      {hasDuplicates && isQualified && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-amber-300">
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-400" />
          <span>
            <strong>Notice:</strong> Your current 5 scores contain duplicate numbers ({scoreValues.join(', ')}). Duplicate scores reduce distinct matching opportunities in the 5-number draw.
          </span>
        </div>
      )}

      {/* Feedback alerts */}
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

      {/* Add Score Form */}
      {isAdding && (
        <form onSubmit={handleAddScore} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <PlusCircle size={16} className="text-emerald-400" /> Log Stableford Score
            </h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-400 uppercase font-semibold">Date Played</label>
              <input
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                value={addDateVal}
                onChange={(e) => setAddDateVal(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
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
                value={addScoreVal}
                onChange={(e) => setAddScoreVal(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              Save Score
            </button>
          </div>
        </form>
      )}

      {/* Edit Score Form */}
      {editingScore && (
        <form onSubmit={handleEditScore} className="p-5 rounded-2xl bg-white/[0.03] border border-emerald-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Edit3 size={16} className="text-emerald-400" /> Edit Score
            </h4>
            <button
              type="button"
              onClick={() => setEditingScore(null)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-400 uppercase font-semibold">Date Played</label>
              <input
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                value={editDateVal}
                onChange={(e) => setEditDateVal(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 uppercase font-semibold">Stableford Points (1 – 45)</label>
              <input
                type="number"
                required
                min="1"
                max="45"
                value={editScoreVal}
                onChange={(e) => setEditScoreVal(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingScore(null)}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              Update Score
            </button>
          </div>
        </form>
      )}

      {/* 5-Score Display Grid */}
      {latestFive.length > 0 ? (
        <div className="grid sm:grid-cols-5 gap-3">
          {latestFive.map((score, idx) => (
            <div
              key={score.id}
              className="relative group p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all text-center flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] text-neutral-500 uppercase font-semibold block">
                  Ball #{idx + 1}
                </span>
                <p className="text-3xl font-black text-white my-1 tracking-tight">
                  {score.stableford_score}
                </p>
                <p className="text-[11px] text-neutral-400 flex items-center justify-center gap-1">
                  <Calendar size={10} /> {score.played_on}
                </p>
              </div>

              {/* Edit / Delete actions on hover/focus */}
              <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => {
                    setEditingScore(score)
                    setEditScoreVal(String(score.stableford_score))
                    setEditDateVal(score.played_on)
                    setIsAdding(false)
                  }}
                  title="Edit score"
                  className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteScore(score.id)}
                  title="Delete score"
                  className="p-1 rounded-md text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {/* Placeholders for remaining required scores */}
          {Array.from({ length: Math.max(0, 5 - latestFive.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              onClick={() => setIsAdding(true)}
              className="p-4 rounded-2xl border border-dashed border-white/10 hover:border-emerald-500/30 text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors min-h-[130px]"
            >
              <span className="text-[10px] text-neutral-600 uppercase font-semibold">
                Ball #{latestFive.length + i + 1}
              </span>
              <PlusCircle size={20} className="text-neutral-600 group-hover:text-emerald-400" />
              <span className="text-[11px] text-neutral-500">Add Round</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
          <Sparkles size={28} className="text-emerald-400 mx-auto" />
          <div>
            <h4 className="text-sm font-bold text-white">No Scores Logged Yet</h4>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              Play a round of golf and log your Stableford points. You need 5 scores to enter the monthly draw.
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs inline-flex items-center gap-1.5"
          >
            <PlusCircle size={14} /> Log First Round
          </button>
        </div>
      )}
    </div>
  )
}
