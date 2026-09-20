import { FlaskConical } from 'lucide-react'

export default function SandboxBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <FlaskConical size={18} className="text-amber-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-amber-300">Reward draws are in demo mode</p>
        <p className="text-xs text-amber-400/80 mt-0.5 leading-relaxed">
          Cash prizes are not active in your region. Simulations and match previews are available,
          but no real prizes are distributed until legal approval is recorded for your jurisdiction.
        </p>
      </div>
    </div>
  )
}
