import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xjzwjysoaszxcjjstxln.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqendqeXNvYXN6eGNqanN0eGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg3MTQ1MiwiZXhwIjoyMTA1NDQ3NDUyfQ.-Q-4zj_9Rb7hKOYGdolflvVcBAcmF968o0yqpVoy1n8'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function applyTestMembership() {
  const userId = '28a1148f-cbc0-4b03-974b-dea66d8c6e8e'
  const userEmail = 'sauravshibashisroutt@gmail.com'

  const now = new Date()
  const oneYearLater = new Date(now)
  oneYearLater.setFullYear(now.getFullYear() + 1)

  const payload = {
    user_id: userId,
    plan_id: 'annual',
    provider: 'manual_test',
    provider_customer_id: null,
    provider_subscription_id: `test_membership_${userId.slice(0, 8)}`,
    provider_checkout_session_id: null,
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end: oneYearLater.toISOString(),
    cancel_at_period_end: false,
    last_verified_at: now.toISOString(),
  }

  console.log(`Applying test membership for ${userEmail} (${userId})...`)

  // Check if any subscription already exists for this user
  const { data: existing } = await admin
    .from('subscriptions')
    .select('id, provider, status')
    .eq('user_id', userId)
    .maybeSingle()

  let result
  if (existing) {
    result = await admin
      .from('subscriptions')
      .update(payload)
      .eq('id', existing.id)
      .select('*, membership_plans(*)')
      .single()
  } else {
    result = await admin
      .from('subscriptions')
      .insert(payload)
      .select('*, membership_plans(*)')
      .single()
  }

  if (result.error) {
    console.error('Error applying test membership:', result.error)
    process.exit(1)
  }

  console.log('✅ Test membership successfully configured:')
  console.log({
    id: result.data.id,
    user_id: result.data.user_id,
    plan: result.data.membership_plans?.name,
    status: result.data.status,
    provider: result.data.provider,
    start: result.data.current_period_start,
    renewal: result.data.current_period_end,
  })
}

applyTestMembership().catch(console.error)
