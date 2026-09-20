import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Protect against leaking service_role client to client bundles
if (typeof window !== 'undefined') {
  throw new Error('This module can only be loaded on the server!')
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY in environment variables')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
