import { NextRequest, NextResponse } from 'next/server'
import { requireActiveSub } from '@/lib/rbac'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx
  try {
    ctx = await requireActiveSub()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHENTICATED'
    if (msg === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Active subscription required to edit scores' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { stableford_score, played_on } = body

  if (stableford_score !== undefined) {
    const scoreNum = Number(stableford_score)
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 45) {
      return NextResponse.json({ error: 'Stableford score must be between 1 and 45' }, { status: 400 })
    }
  }

  const updateData: { stableford_score?: number; played_on?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  }

  if (stableford_score !== undefined) updateData.stableford_score = Number(stableford_score)
  if (played_on !== undefined) updateData.played_on = String(played_on)

  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from('golf_scores')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505' || error.message.includes('unique') || error.message.includes('idx_golf_scores_user_played_on')) {
      return NextResponse.json(
        { error: 'You already have another score logged for this date.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ score: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx
  try {
    ctx = await requireActiveSub()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHENTICATED'
    if (msg === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Active subscription required to delete scores' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()

  const { error } = await supabase
    .from('golf_scores')
    .delete()
    .eq('id', id)
    .eq('user_id', ctx.userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
