import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSessionContext } from '@/lib/rbac'
import { createClient } from '@/lib/supabase/server'
import WinnerProofUploadForm from '@/components/draw/WinnerProofUploadForm'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Winner Score Verification — GolfGives',
}

export default async function WinnerVerifyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/login?next=/dashboard/draw')

  const { id } = await params
  const supabase = await createClient()

  // Load winner record
  const { data: winner } = await supabase
    .from('draw_winners')
    .select('*, draws(cash_prize_enabled)')
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .maybeSingle()

  if (!winner) notFound()
  if (winner.status !== 'pending_proof') {
    redirect('/dashboard/draw')
  }

  // Load cashPrizeDrawEnabled
  const { data: setting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'cashPrizeDrawEnabled')
    .single()
  const cashEnabled = setting?.value === true

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <Link
        href="/dashboard/draw"
        className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={14} /> Back to Draw
      </Link>

      <WinnerProofUploadForm
        winnerId={winner.id}
        matchCount={winner.match_count}
        prizePaise={winner.prize_amount_paise}
        cashEnabled={cashEnabled && (winner.draws?.cash_prize_enabled ?? false)}
      />
    </div>
  )
}
