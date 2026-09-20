import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/types/database'

type CharityUpdate = Database['public']['Tables']['charities']['Update']

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const db = createAdminClient()

  const { data: charity, error } = await db
    .from('charities')
    .select('*, charity_events(*)')
    .eq('id', id)
    .single()

  if (error || !charity) {
    return NextResponse.json({ error: 'Charity not found' }, { status: 404 })
  }

  return NextResponse.json({ charity })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx
  try {
    ctx = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const db = createAdminClient()
  const body = await req.json()

  // Load existing
  const { data: existing, error: fetchErr } = await db
    .from('charities')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Charity not found' }, { status: 404 })
  }

  const updateData: CharityUpdate = {
    updated_at: new Date().toISOString(),
  }

  if (body.name !== undefined) updateData.name = String(body.name).trim()
  if (body.slug !== undefined) updateData.slug = String(body.slug).trim()
  if (body.short_description !== undefined) updateData.short_description = String(body.short_description).trim()
  if (body.full_description !== undefined) updateData.full_description = body.full_description ? String(body.full_description).trim() : null
  if (body.categories !== undefined) updateData.categories = Array.isArray(body.categories) ? body.categories : []
  if (body.website_url !== undefined) updateData.website_url = body.website_url ? String(body.website_url).trim() : null
  if (body.donation_url !== undefined) updateData.donation_url = body.donation_url ? String(body.donation_url).trim() : null
  if (body.logo_path !== undefined) updateData.logo_path = body.logo_path ? String(body.logo_path) : null
  if (body.cover_image_path !== undefined) updateData.cover_image_path = body.cover_image_path ? String(body.cover_image_path) : null
  if (body.is_featured !== undefined) updateData.is_featured = Boolean(body.is_featured)
  if (body.is_published !== undefined) updateData.is_published = Boolean(body.is_published)
  if (body.is_archived !== undefined) updateData.is_archived = Boolean(body.is_archived)

  const { data: updated, error: updateErr } = await db
    .from('charities')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Audit log
  await db.from('audit_logs').insert({
    actor_id: ctx.userId,
    action: updateData.is_archived !== undefined && updateData.is_archived !== existing.is_archived
      ? (updateData.is_archived ? 'charity.archived' : 'charity.unarchived')
      : 'charity.updated',
    entity_type: 'charities',
    entity_id: id,
    before_data: existing,
    after_data: updated,
  })

  return NextResponse.json({ charity: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx
  try {
    ctx = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const db = createAdminClient()

  // 1. Check for existing financial history in payment_allocations
  const { count: allocCount } = await db
    .from('payment_allocations')
    .select('id', { count: 'exact', head: true })
    .eq('charity_id', id)

  // 2. Check for existing financial history in direct_donations
  const { count: donCount } = await db
    .from('direct_donations')
    .select('id', { count: 'exact', head: true })
    .eq('charity_id', id)

  if ((allocCount ?? 0) > 0 || (donCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          'Cannot delete charity with existing financial history. Please archive this charity instead to preserve financial records.',
        canArchive: true,
      },
      { status: 409 }
    )
  }

  // Delete events first
  await db.from('charity_events').delete().eq('charity_id', id)

  // Delete preferences
  await db.from('charity_preferences').delete().eq('charity_id', id)

  // Delete charity
  const { error: deleteErr } = await db.from('charities').delete().eq('id', id)

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 })
  }

  await db.from('audit_logs').insert({
    actor_id: ctx.userId,
    action: 'charity.deleted',
    entity_type: 'charities',
    entity_id: id,
    before_data: null,
    after_data: null,
  })

  return NextResponse.json({ ok: true })
}
