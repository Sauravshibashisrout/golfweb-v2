import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export type AppRole = Database['public']['Enums']['app_role']

export type SessionContext = {
  userId: string
  role: AppRole
  hasActiveSub: boolean
}

/** Resolves the current user's role and subscription status. Returns null for unauthenticated visitors. */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  let hasActiveSub =
    !!sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date())

  // Testing mode: auto-activate any authenticated user forever so anyone gets full access in 1-click
  if (!hasActiveSub) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const adminDb = createAdminClient()
      const now = new Date().toISOString()
      const forever = '2099-12-31T23:59:59.000Z'

      const { data: existingSub } = await adminDb
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingSub) {
        await adminDb.from('subscriptions').update({
          plan_id: 'annual',
          status: 'active',
          provider: 'manual_test',
          current_period_start: now,
          current_period_end: forever,
          cancel_at_period_end: false,
          last_verified_at: now,
        }).eq('id', existingSub.id)
      } else {
        await adminDb.from('subscriptions').insert({
          user_id: user.id,
          plan_id: 'annual',
          status: 'active',
          provider: 'manual_test',
          provider_subscription_id: `test_forever_${user.id.slice(0, 8)}`,
          current_period_start: now,
          current_period_end: forever,
          cancel_at_period_end: false,
          last_verified_at: now,
        })
      }
      hasActiveSub = true
    } catch (e) {
      console.error('Testing mode auto-activation failed in getSessionContext:', e)
      hasActiveSub = true
    }
  }

  return { userId: user.id, role: profile.role, hasActiveSub }
}

/** Throws a redirect-safe error if the caller is not an admin. Use in Server Components / Route Handlers. */
export async function requireAdmin(): Promise<SessionContext> {
  const ctx = await getSessionContext()
  if (!ctx || ctx.role !== 'admin') {
    throw new Error('FORBIDDEN')
  }
  return ctx
}

/** Throws if the caller does not have an active subscription. */
export async function requireActiveSub(): Promise<SessionContext> {
  const ctx = await getSessionContext()
  if (!ctx) throw new Error('UNAUTHENTICATED')
  if (!ctx.hasActiveSub) throw new Error('SUBSCRIPTION_REQUIRED')
  return ctx
}
