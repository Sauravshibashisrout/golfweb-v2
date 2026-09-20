import { Lock, Trophy, Clock, AlertCircle } from 'lucide-react'

type Draw = {
  id: string
  title: string
  cycle_month: string
  status: string
  entry_lock_at: string | null
  draw_at: string | null
  drawn_numbers: number[] | null
  reward_pool_paise: number
  tier_3_paise: number
  tier_4_paise: number
  tier_5_paise: number
  cash_prize_enabled: boolean
  jackpot_rollover_in_paise: number
}

type Entry = {
  id: string
  score_snapshot: number[]
  score_date_snapshot: string[]
  matched_numbers: number
  entry_weight: number
} | null

function paise(p: number) {
  return `₹${(p / 100).toLocaleString('en-IN')}`
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Upcoming',
  locked: 'Entries Locked',
  simulation_ready: 'Draw Pending',
  published: 'Results Published',
}

export default function DrawEntryCard({
  draw,
  entry,
  scoreCount,
  cashEnabled,
}: {
  draw: Draw
  entry: Entry
  scoreCount: number
  cashEnabled: boolean
}) {
  const isPublished = draw.status === 'published'
  const isLocked = ['locked', 'simulation_ready', 'published'].includes(draw.status)
  const hasEntry = !!entry
  const scores = entry?.score_snapshot ?? []
  const dates = entry?.score_date_snapshot ?? []
  const distinctScores = new Set(scores).size
  const hasDuplicates = distinctScores < scores.length

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider">{draw.cycle_month}</p>
          <h2 className="text-lg font-semibold text-white mt-0.5">{draw.title}</h2>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          isPublished ? 'bg-green-500/20 text-green-400' :
          isLocked ? 'bg-amber-500/20 text-amber-400' :
          'bg-neutral-700 text-neutral-400'
        }`}>
          {STATUS_LABEL[draw.status] ?? draw.status}
        </span>
      </div>

      {/* Prize pool */}
      <div className="px-6 py-4 grid grid-cols-3 gap-3 border-b border-white/5">
        {[
          { label: '5 matches', value: draw.tier_5_paise + draw.jackpot_rollover_in_paise, highlight: true },
          { label: '4 matches', value: draw.tier_4_paise },
          { label: '3 matches', value: draw.tier_3_paise },
        ].map(t => (
          <div key={t.label} className={`rounded-xl p-3 text-center ${t.highlight ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/3'}`}>
            <p className={`text-lg font-bold ${t.highlight ? 'text-green-400' : 'text-white'}`}>
              {cashEnabled ? paise(t.value) : '—'}
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Entry state */}
      <div className="px-6 py-5">
        {!hasEntry && !isLocked && (
          scoreCount < 5 ? (
            <div className="flex items-start gap-2 text-sm text-amber-400">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>You need {5 - scoreCount} more score{5 - scoreCount !== 1 ? 's' : ''} to qualify for this draw.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <Clock size={16} />
              <span>You'll be automatically entered when entries lock.</span>
            </div>
          )
        )}

        {!hasEntry && isLocked && (
          <div className="flex items-start gap-2 text-sm text-neutral-400">
            <Lock size={16} className="mt-0.5 shrink-0" />
            <span>You were not entered in this draw (fewer than 5 scores at lock time).</span>
          </div>
        )}

        {hasEntry && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Your entry numbers</p>
              <div className="flex flex-wrap gap-2">
                {scores.map((s, i) => (
                  <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border ${
                    isPublished && draw.drawn_numbers?.includes(s)
                      ? 'bg-green-500/20 border-green-500 text-green-300'
                      : 'bg-white/5 border-white/10 text-white'
                  }`}>
                    {s}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {dates.map((d, i) => (
                  <p key={i} className="w-10 text-center text-[10px] text-neutral-600">
                    {new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                ))}
              </div>
            </div>

            {hasDuplicates && (
              <div className="flex items-start gap-2 text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span>
                  You have {scores.length - distinctScores} duplicate score value{scores.length - distinctScores !== 1 ? 's' : ''}.
                  Duplicate values count only once for matching — you have {distinctScores} distinct matching opportunities.
                </span>
              </div>
            )}

            {isPublished && draw.drawn_numbers && (
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Winning numbers</p>
                <div className="flex gap-2">
                  {draw.drawn_numbers.map(n => (
                    <div key={n} className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-green-500/20 border border-green-500 text-green-300">
                      {n}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Trophy size={16} className="text-green-400" />
                  <span className="text-sm text-white font-semibold">
                    {entry.matched_numbers} match{entry.matched_numbers !== 1 ? 'es' : ''}
                  </span>
                  {entry.matched_numbers >= 3 && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Winner!</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
