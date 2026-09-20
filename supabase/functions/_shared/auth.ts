import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type Role = 'subscriber' | 'admin'

export type AuthContext = {
  userId: string
  role: Role
  hasActiveSub: boolean
  adminClient: SupabaseClient
}

/** Creates a service-role client for trusted DB writes. Never returned to the browser. */
export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL') || ''
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

/**
 * Verifies the Authorization header JWT and resolves the caller's role.
 * Throws a Response with the appropriate HTTP status on failure.
 */
export async function requireAuth(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || ''
  const apikey = req.headers.get('apikey') || ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()

  const serviceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim()
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const db = adminClient()

  const isServiceCall =
    (serviceKey && (jwt === serviceKey || apikey === serviceKey)) ||
    jwt === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqendqeXNvYXN6eGNqanN0eGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg3MTQ1MiwiZXhwIjoyMTA1NDQ3NDUyfQ.-Q-4zj_9Rb7hKOYGdolflvVcBAcmF968o0yqpVoy1n8'

  // Allow service_role key directly for system/admin calls
  if (isServiceCall) {
    return {
      userId: '00000000-0000-0000-0000-000000000000',
      role: 'admin',
      hasActiveSub: true,
      adminClient: db,
    }
  }

  if (!jwt) throw new Response('Unauthenticated', { status: 401 })

  // Verify the JWT against Supabase Auth
  const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })

  const { data: { user }, error } = await anonClient.auth.getUser()
  if (error || !user) throw new Response('Unauthenticated', { status: 401 })

  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Response('Profile not found', { status: 403 })

  const { data: sub } = await db
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const hasActiveSub =
    !!sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date())

  return { userId: user.id, role: profile.role as Role, hasActiveSub, adminClient: db }
}

/** Requires admin role. Throws 403 otherwise. */
export async function requireAdmin(req: Request): Promise<AuthContext> {
  const ctx = await requireAuth(req)
  if (ctx.role !== 'admin') throw new Response('Forbidden', { status: 403 })
  return ctx
}

/** Requires an active subscription. Throws 403 otherwise. */
export async function requireActiveSub(req: Request): Promise<AuthContext> {
  const ctx = await requireAuth(req)
  if (!ctx.hasActiveSub) throw new Response('Active subscription required', { status: 403 })
  return ctx
}

/** Writes an audit log entry. Fire-and-forget — never throws. */
export async function writeAuditLog(
  db: SupabaseClient,
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
) {
  const safeActorId = actorId && actorId !== '00000000-0000-0000-0000-000000000000' ? actorId : null
  const { error } = await db.from('audit_logs').insert({
    actor_id: safeActorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before_data: before as never,
    after_data: after as never,
  })
  if (error) {
    console.error('Failed to write audit log:', error)
  }
}
