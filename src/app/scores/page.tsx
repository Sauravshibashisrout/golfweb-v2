import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionContext } from '@/lib/rbac'
import { createClient } from '@/lib/supabase/server'
import ScoreEntryForm from '@/components/scores/ScoreEntryForm'
import { Trophy, Calendar, Info, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Log Stableford Scores — GolfGives',
}

export default async function ScoresPage() {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/login?next=/scores')
  if (!ctx.hasActiveSub) redirect('/pricing?reason=subscription_required')

  const supabase = await createClient()

  // Load all scores for user
  const { data: scores } = await supabase
    .from('golf_scores')
    .select('*')
    .eq('user_id', ctx.userId)
    .order('played_on', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Stableford Score Tracker</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Log points from your real-world rounds. Your 5 latest scores form your monthly draw ticket.
        </p>
      </div>

      {/* Info notice about 5-score cap */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3 text-xs text-neutral-400 leading-relaxed">
        <Info size={18} className="text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-white font-semibold">The 5-Score Cap: </span>
          GolfGives automatically retains your 5 most recent scores. Whenever you log a new score beyond five, your oldest unlocked round is smoothly retired, keeping your draw ticket fresh with your latest form.
        </div>
      </div>

      {/* Score Entry Form */}
      <ScoreEntryForm userId={ctx.userId} />

      {/* Scores History List */}
      <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Active Scores ({scores?.length ?? 0} / 5)</h2>
          {(scores?.length ?? 0) >= 5 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Draw Qualified
            </span>
          )}
        </div>

        {scores && scores.length > 0 ? (
          <div className="space-y-3">
            {scores.map((s, index) => (
              <div
                key={s.id}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-lg">
                    {s.stableford_score}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {index < 5 ? `Draw Number #${index + 1}` : 'Archived Score'}
                    </p>
                    <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                      <Calendar size={12} /> Played on {s.played_on}
                    </p>
                  </div>
                </div>

                <span className="text-xs text-neutral-400">
                  {index < 5 ? 'Active in Draw' : 'History'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-500 text-sm">
            No scores logged yet. Enter your first round above!
          </div>
        )}
      </div>
    </div>
  )
}
