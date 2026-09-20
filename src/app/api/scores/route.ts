import { NextRequest, NextResponse } from 'next/server'
import { requireActiveSub } from '@/lib/rbac'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  let ctx
  try {
    ctx = await requireActiveSub()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHENTICATED'
    if (msg === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Active subscription required' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: scores, error } = await supabase
    .from('golf_scores')
    .select('*')
    .eq('user_id', ctx.userId)
    .order('played_on', { ascending: false })
    .limit(5)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ scores: scores || [] })
}

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await requireActiveSub()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNAUTHENTICATED'
    if (msg === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Active subscription required to log scores' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { stableford_score, played_on } = body

  // Validate stableford score: 1 to 45
  const scoreNum = Number(stableford_score)
  if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 45) {
    return NextResponse.json(
      { error: 'Stableford score must be between 1 and 45 points' },
      { status: 400 }
    )
  }

  // Validate played_on date
  if (!played_on || typeof played_on !== 'string') {
    return NextResponse.json(
      { error: 'Date played is required (YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(played_on)) {
    return NextResponse.json(
      { error: 'Invalid date format. Expected YYYY-MM-DD' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { data: score, error: insertErr } = await supabase
    .from('golf_scores')
    .insert({
      user_id: ctx.userId,
      stableford_score: scoreNum,
      played_on,
    })
    .select()
    .single()

  if (insertErr) {
    if (insertErr.code === '23505' || insertErr.message.includes('unique') || insertErr.message.includes('idx_golf_scores_user_played_on')) {
      return NextResponse.json(
        { error: 'You have already logged a score for this date. Please pick a different date or edit the existing score.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ score }, { status: 201 })
}
