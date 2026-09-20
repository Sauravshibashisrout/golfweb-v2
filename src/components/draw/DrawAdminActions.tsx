'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Play, Send, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

type Props = {
  drawId: string
  status: string
  simulationId: string | null
  cashEnabled: boolean
  cashPrizeEnabled: boolean
  legalApprovalRef: string | null
}

export default function DrawAdminActions({
  drawId,
  status,
  simulationId,
  cashEnabled,
  cashPrizeEnabled,
  legalApprovalRef,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleAction(endpoint: string, body: Record<string, unknown>) {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/admin/draws/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || `Action failed with status ${res.status}`)
      }
      setSuccess(`Operation completed successfully!`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <h3 className="text-base font-semibold text-white">Draw Operations</h3>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-start gap-2">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {status === 'draft' && (
          <button
            onClick={() => handleAction('lock', { drawId })}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            Lock Entries
          </button>
        )}

        {status === 'locked' && (
          <button
            onClick={() => handleAction('simulate', { drawId })}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Run Draw Simulation
          </button>
        )}

        {status === 'simulation_ready' && (
          <button
            onClick={() => {
              if (!simulationId) {
                setError('No simulation ID found to publish.')
                return
              }
              if (cashPrizeEnabled && !cashEnabled) {
                setError('Cash prize draws are disabled in app settings.')
                return
              }
              if (cashPrizeEnabled && !legalApprovalRef) {
                setError('Legal approval reference is required for cash draws.')
                return
              }
              if (confirm('Are you sure? Once published, draw results and winners are completely immutable.')) {
                handleAction('publish', { drawId, simulationId })
              }
            }}
            disabled={loading || !simulationId}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Publish Official Results
          </button>
        )}

        {status === 'published' && (
          <div className="flex items-center gap-2 text-sm text-green-400 font-medium">
            <CheckCircle2 size={18} />
            Published & Immutable (Results Sealed)
          </div>
        )}
      </div>
    </div>
  )
}
