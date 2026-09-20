'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Calendar, Edit3 } from 'lucide-react'
import ScoreCorrectionModal from '@/components/admin/ScoreCorrectionModal'

type Score = {
  id: string
  stableford_score: number
  played_on: string
  created_at: string
}

export default function UserScoresAdminView({ scores }: { scores: Score[] }) {
  const router = useRouter()
  const [correctingScore, setCorrectingScore] = useState<Score | null>(null)

  return (
    <div className="glass rounded-3xl p-6 sm:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-emerald-400" />
          <h3 className="text-lg font-bold text-white">Golf Scores ({scores.length})</h3>
        </div>
        <span className="text-xs text-neutral-400">Latest 5 form the draw ticket</span>
      </div>

      {scores.length > 0 ? (
        <div className="divide-y divide-white/5">
          {scores.map((s, idx) => (
            <div key={s.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-base">
                  {s.stableford_score}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    {idx < 5 ? `Draw Ball #${idx + 1}` : `Archived Round #${idx + 1}`}
                  </p>
                  <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                    <Calendar size={11} /> Played on {s.played_on}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCorrectingScore(s)}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-medium transition-colors"
              >
                <Edit3 size={13} /> Correct Score
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-neutral-500 text-center py-6">No scores recorded for this user.</p>
      )}

      {correctingScore && (
        <ScoreCorrectionModal
          score={correctingScore}
          onClose={() => setCorrectingScore(null)}
          onSuccess={() => {
            setCorrectingScore(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
