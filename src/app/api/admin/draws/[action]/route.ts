import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/rbac'

const FUNCTION_MAP: Record<string, string> = {
  lock: 'draw-lock',
  simulate: 'draw-simulate',
  publish: 'draw-publish',
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
  }

  const { action } = await params
  const fnName = FUNCTION_MAP[action]
  if (!fnName) {
    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 })
  }

  const body = await request.json()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 })
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    return NextResponse.json(
      { error: data.message || data.error || `Function failed with status ${res.status}` },
      { status: res.status }
    )
  }

  return NextResponse.json(data)
}
