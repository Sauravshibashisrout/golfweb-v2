import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id: charityId } = await params
  const db = createAdminClient()
  const body = await req.json()

  const { title, description, event_starts_at, location_text, event_url } = body

  if (!title || !event_starts_at) {
    return NextResponse.json(
      { error: 'Title and event date/time are required' },
      { status: 400 }
    )
  }

  const { data: event, error } = await db
    .from('charity_events')
    .insert({
      charity_id: charityId,
      title,
      description: description || null,
      event_starts_at,
      location_text: location_text || null,
      event_url: event_url || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ event }, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id: charityId } = await params
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('eventId')

  if (!eventId) {
    return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db
    .from('charity_events')
    .delete()
    .eq('id', eventId)
    .eq('charity_id', charityId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
