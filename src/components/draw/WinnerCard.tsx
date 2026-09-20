import { CheckCircle, Clock, XCircle, Banknote } from 'lucide-react'

type Winner = {
  id: string
  match_count: number
  prize_amount_paise: number
  status: string
  draw_id: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_proof: { label: 'Proof required', color: 'text-amber-400', icon: <Clock size={14} /> },
  proof_submitted: { label: 'Under review', color: 'text-blue-400', icon: <Clock size={14} /> },
  approved: { label: 'Approved', color: 'text-green-400', icon: <CheckCircle size={14} /> },
  rejected: { label: 'Rejected', color: 'text-red-400', icon: <XCircle size={14} /> },
  paid: { label: 'Paid', color: 'text-green-400', icon: <Banknote size={14} /> },
}

export default function WinnerCard({ winner, cashEnabled }: { winner: Winner; cashEnabled: boolean }) {
  const cfg = STATUS_CONFIG[winner.status] ?? { label: winner.status, color: 'text-neutral-400', icon: null }

  return (
    <div className="glass rounded-xl px-5 py-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-white">
          {winner.match_count}-number match
        </p>
        <div className={`flex items-center gap-1.5 text-xs mt-1 ${cfg.color}`}>
          {cfg.icon}
          <span>{cfg.label}</span>
        </div>
      </div>
      <div className="text-right">
        {cashEnabled && winner.prize_amount_paise > 0 ? (
          <p className="text-lg font-bold text-green-400">
            ₹{(winner.prize_amount_paise / 100).toLocaleString('en-IN')}
          </p>
        ) : (
          <p className="text-sm text-neutral-500">Demo mode</p>
        )}
        {winner.status === 'pending_proof' && (
          <a
            href={`/dashboard/draw/verify/${winner.id}`}
            className="text-xs text-green-400 hover:text-green-300 mt-1 block"
          >
            Upload proof →
          </a>
        )}
      </div>
    </div>
  )
}
