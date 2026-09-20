'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  winnerId: string
  matchCount: number
  prizePaise: number
  cashEnabled: boolean
  onSuccess?: () => void
}

export default function WinnerProofUploadForm({
  winnerId,
  matchCount,
  prizePaise,
  cashEnabled,
  onSuccess,
}: Props) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Please select a scorecard screenshot or document.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Request signed upload URL from proof-upload-url Edge Function
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/proof-upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          winnerId,
          fileName: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
          contentType: file.type || 'application/octet-stream',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to generate signed upload URL')

      const { signedUrl, path } = data

      // 2. Upload directly to Supabase storage bucket via signed URL
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to secure storage.')
      }

      // 3. Submit proof via server API (updates verification, winner status, and writes audit log)
      const submitRes = await fetch('/api/verifications/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winnerId,
          proofPath: path,
        }),
      })

      const submitData = await submitRes.json()
      if (!submitRes.ok) throw new Error(submitData.error || 'Failed to submit proof verification')

      setSuccess(true)
      setLoading(false)
      if (onSuccess) {
        onSuccess()
      } else {
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 1500)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleUpload} className="glass rounded-3xl p-8 space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white">Upload Scorecard Proof</h2>
        <p className="text-neutral-400 text-xs sm:text-sm">
          Submit photo evidence of your 5 logged rounds (club scorecards, golf app screenshot, or signed paper card).
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500 uppercase font-semibold">Winning Match</p>
          <p className="text-base font-bold text-white mt-0.5">{matchCount}-number match</p>
        </div>
        {cashEnabled && prizePaise > 0 && (
          <div className="text-right">
            <p className="text-xs text-neutral-500 uppercase font-semibold">Prize Amount</p>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">
              ₹{(prizePaise / 100).toLocaleString('en-IN')}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-2xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-2">
          <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
          <h4 className="text-base font-bold text-white">Proof Submitted Successfully!</h4>
          <p className="text-xs text-neutral-300">
            Our admin team will review your verification shortly. Redirecting to draw page...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">Scorecard File (JPG, PNG, PDF)</label>
            <input
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-500 file:text-neutral-950 hover:file:bg-emerald-400 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Submit for Verification
          </button>
        </div>
      )}
    </form>
  )
}
