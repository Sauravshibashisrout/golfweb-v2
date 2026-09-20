import { ShieldAlert, HeartHandshake, CheckCircle2 } from 'lucide-react'

export const metadata = {
  title: 'Responsible Play — GolfGives',
}

export default function ResponsiblePlayPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-8 text-neutral-300">
      <div className="space-y-4">
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Player Protection</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Responsible Play</h1>
        <p className="text-neutral-400 text-base">
          GolfGives is dedicated to maintaining a safe, transparent, and balanced environment for all golfers.
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed">
        <div className="glass rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <HeartHandshake className="text-emerald-400" size={20} />
            Purpose First, Always
          </div>
          <p>
            Our core mission is charitable impact. Monthly draws are designed as an enjoyable reward mechanism for real-world golfers, not a substitute for financial security or gambling.
          </p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <ShieldAlert className="text-emerald-400" size={20} />
            Strict Entry Caps
          </div>
          <p>
            Each subscriber is limited to exactly one draw entry per monthly cycle, capped strictly by their 5 latest Stableford scores. You cannot purchase additional tickets or increase your odds by spending more money.
          </p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <CheckCircle2 className="text-emerald-400" size={20} />
            Jurisdiction & Sandbox Rules
          </div>
          <p>
            In jurisdictions where cash prizes are restricted, GolfGives operates strictly in Sandbox/Points mode. Real cash prize draws only operate with explicit legal authorization and verified regulatory compliance.
          </p>
        </div>
      </div>
    </div>
  )
}
