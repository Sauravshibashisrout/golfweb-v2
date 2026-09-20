import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const db = createAdminClient()

  // Fetch all charities including draft and archived
  const { data: charities, error } = await db
    .from('charities')
    .select('*, charity_events(*)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch allocation and donation sums per charity
  const { data: allocations } = await db
    .from('payment_allocations')
    .select('charity_id, amount_paise')
    .not('charity_id', 'is', null)

  const { data: directDonations } = await db
    .from('direct_donations')
    .select('charity_id, amount_paise')
    .eq('status', 'paid')

  const { data: preferences } = await db
    .from('charity_preferences')
    .select('charity_id')
    .is('effective_to', null)

  const allocationMap: Record<string, number> = {}
  for (const a of allocations || []) {
    if (a.charity_id) {
      allocationMap[a.charity_id] = (allocationMap[a.charity_id] || 0) + a.amount_paise
    }
  }

  const donationMap: Record<string, number> = {}
  for (const d of directDonations || []) {
    donationMap[d.charity_id] = (donationMap[d.charity_id] || 0) + d.amount_paise
  }

  const supporterMap: Record<string, number> = {}
  for (const p of preferences || []) {
    supporterMap[p.charity_id] = (supporterMap[p.charity_id] || 0) + 1
  }

  const enriched = (charities || []).map((c) => ({
    ...c,
    allocated_paise: allocationMap[c.id] || 0,
    donated_paise: donationMap[c.id] || 0,
    total_impact_paise: (allocationMap[c.id] || 0) + (donationMap[c.id] || 0),
    active_supporters: supporterMap[c.id] || 0,
    event_count: (c.charity_events || []).length,
  }))

  return NextResponse.json({ charities: enriched })
}

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const db = createAdminClient()
  const body = await req.json()

  const {
    name,
    slug,
    short_description,
    full_description,
    categories,
    website_url,
    donation_url,
    logo_path,
    cover_image_path,
    is_featured = false,
    is_published = false,
  } = body

  if (!name || !slug || !short_description) {
    return NextResponse.json(
      { error: 'Name, slug, and short description are required' },
      { status: 400 }
    )
  }

  // Ensure unique slug
  const { data: existingSlug } = await db
    .from('charities')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existingSlug) {
    return NextResponse.json(
      { error: 'A charity with this slug already exists' },
      { status: 409 }
    )
  }

  const { data: charity, error } = await db
    .from('charities')
    .insert({
      name,
      slug,
      short_description,
      full_description: full_description || null,
      categories: Array.isArray(categories) ? categories : ['General'],
      website_url: website_url || null,
      donation_url: donation_url || null,
      logo_path: logo_path || null,
      cover_image_path: cover_image_path || null,
      is_featured: Boolean(is_featured),
      is_published: Boolean(is_published),
      is_archived: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit log
  await db.from('audit_logs').insert({
    actor_id: ctx.userId,
    action: 'charity.created',
    entity_type: 'charities',
    entity_id: charity.id,
    before_data: null,
    after_data: charity,
  })

  return NextResponse.json({ charity }, { status: 201 })
}
