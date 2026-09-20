import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { charityId, contributionPercentage } = await request.json()
  if (!charityId || !contributionPercentage) {
    return NextResponse.json({ error: 'Missing charityId or contributionPercentage' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token || serviceRoleKey

  const res = await fetch(`${supabaseUrl}/functions/v1/charity-preference`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ charityId, contributionPercentage }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    return NextResponse.json(
      { error: data.message || data.error || 'Failed to update charity preference' },
      { status: res.status }
    )
  }

  return NextResponse.json(data)
}
