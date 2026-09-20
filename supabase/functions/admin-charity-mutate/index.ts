import { requireAdmin, writeAuditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let ctx
  try { ctx = await requireAdmin(req) } catch (e) { return e as Response }

  const body = await req.json().catch(() => ({}))
  const { action, charityId, data } = body

  if (!action || !['create', 'update', 'archive', 'unarchive', 'delete'].includes(action)) {
    return new Response('Invalid or missing action', { status: 400 })
  }

  const db = ctx.adminClient
  const now = new Date().toISOString()

  // 1. CREATE
  if (action === 'create') {
    if (!data?.name || !data?.slug || !data?.short_description) {
      return new Response('Missing required charity fields (name, slug, short_description)', { status: 400 })
    }

    const insertPayload = {
      name: String(data.name).trim(),
      slug: String(data.slug).trim().toLowerCase(),
      short_description: String(data.short_description).trim(),
      full_description: data.full_description ? String(data.full_description).trim() : null,
      categories: Array.isArray(data.categories) ? data.categories : ['general'],
      website_url: data.website_url ? String(data.website_url).trim() : null,
      donation_url: data.donation_url ? String(data.donation_url).trim() : null,
      logo_path: data.logo_path ?? null,
      cover_image_path: data.cover_image_path ?? null,
      is_featured: Boolean(data.is_featured),
      is_published: Boolean(data.is_published),
      is_archived: false,
    }

    const { data: created, error: createErr } = await db
      .from('charities')
      .insert(insertPayload)
      .select()
      .single()

    if (createErr) {
      return new Response(createErr.message, { status: 500 })
    }

    await writeAuditLog(db, ctx.userId, 'charity.created', 'charity', created.id, null, created)
    return Response.json({ ok: true, charity: created })
  }

  // Ensure charityId is provided for update, archive, unarchive, delete
  if (!charityId) {
    return new Response('Missing charityId', { status: 400 })
  }

  const { data: existing, error: fetchErr } = await db
    .from('charities')
    .select('*')
    .eq('id', charityId)
    .maybeSingle()

  if (fetchErr || !existing) {
    return new Response('Charity not found', { status: 404 })
  }

  // 2. ARCHIVE / UNARCHIVE
  if (action === 'archive' || action === 'unarchive') {
    const isArchived = action === 'archive'
    const { data: updated, error: updateErr } = await db
      .from('charities')
      .update({ is_archived: isArchived, updated_at: now })
      .eq('id', charityId)
      .select()
      .single()

    if (updateErr) return new Response(updateErr.message, { status: 500 })

    await writeAuditLog(
      db,
      ctx.userId,
      isArchived ? 'charity.archived' : 'charity.unarchived',
      'charity',
      charityId,
      { is_archived: existing.is_archived },
      { is_archived: updated.is_archived },
    )
    return Response.json({ ok: true, charity: updated })
  }

  // 3. UPDATE
  if (action === 'update') {
    const updatePayload: Record<string, unknown> = { updated_at: now }

    if (data.name !== undefined) updatePayload.name = String(data.name).trim()
    if (data.slug !== undefined) updatePayload.slug = String(data.slug).trim().toLowerCase()
    if (data.short_description !== undefined) updatePayload.short_description = String(data.short_description).trim()
    if (data.full_description !== undefined) updatePayload.full_description = data.full_description ? String(data.full_description).trim() : null
    if (data.categories !== undefined) updatePayload.categories = Array.isArray(data.categories) ? data.categories : []
    if (data.website_url !== undefined) updatePayload.website_url = data.website_url ? String(data.website_url).trim() : null
    if (data.donation_url !== undefined) updatePayload.donation_url = data.donation_url ? String(data.donation_url).trim() : null
    if (data.logo_path !== undefined) updatePayload.logo_path = data.logo_path ?? null
    if (data.cover_image_path !== undefined) updatePayload.cover_image_path = data.cover_image_path ?? null
    if (data.is_featured !== undefined) updatePayload.is_featured = Boolean(data.is_featured)
    if (data.is_published !== undefined) updatePayload.is_published = Boolean(data.is_published)
    if (data.is_archived !== undefined) updatePayload.is_archived = Boolean(data.is_archived)

    const { data: updated, error: updateErr } = await db
      .from('charities')
      .update(updatePayload)
      .eq('id', charityId)
      .select()
      .single()

    if (updateErr) return new Response(updateErr.message, { status: 500 })

    await writeAuditLog(db, ctx.userId, 'charity.updated', 'charity', charityId, existing, updated)
    return Response.json({ ok: true, charity: updated })
  }

  // 4. DELETE
  if (action === 'delete') {
    // Check if financial history exists
    const { count: allocCount } = await db
      .from('payment_allocations')
      .select('id', { count: 'exact', head: true })
      .eq('charity_id', charityId)

    const { count: donCount } = await db
      .from('direct_donations')
      .select('id', { count: 'exact', head: true })
      .eq('charity_id', charityId)

    if ((allocCount ?? 0) > 0 || (donCount ?? 0) > 0) {
      return new Response(
        JSON.stringify({
          error: 'Cannot delete charity with existing financial history. Please archive this charity instead.',
          canArchive: true,
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Delete events & preferences first
    await db.from('charity_events').delete().eq('charity_id', charityId)
    await db.from('charity_preferences').delete().eq('charity_id', charityId)

    const { error: deleteErr } = await db.from('charities').delete().eq('id', charityId)
    if (deleteErr) return new Response(deleteErr.message, { status: 500 })

    await writeAuditLog(db, ctx.userId, 'charity.deleted', 'charity', charityId, existing, null)
    return Response.json({ ok: true })
  }

  return new Response('Unsupported action', { status: 400 })
})
