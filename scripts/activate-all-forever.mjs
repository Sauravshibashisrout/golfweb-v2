import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xjzwjysoaszxcjjstxln.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqendqeXNvYXN6eGNqanN0eGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg3MTQ1MiwiZXhwIjoyMTA1NDQ3NDUyfQ.-Q-4zj_9Rb7hKOYGdolflvVcBAcmF968o0yqpVoy1n8'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function activateAllForever() {
  console.log('Activating all users for 1-click testing forever (until 2099)...\n')

  const now = new Date().toISOString()
  const forever = '2099-12-31T23:59:59.000Z'

  // Fetch all profiles
  const { data: profiles, error: profErr } = await admin.from('profiles').select('id, display_name')
  if (profErr) {
    console.error('Error fetching profiles:', profErr)
    return
  }

  // Fetch default charity
  const { data: defaultCharity } = await admin.from('charities').select('id').eq('is_published', true).limit(1).maybeSingle()

  for (const p of profiles) {
    // Check if subscription exists for user_id
    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('id, status, current_period_end')
      .eq('user_id', p.id)
      .maybeSingle()

    let sub
    let subErr
    if (existingSub) {
      const res = await admin
        .from('subscriptions')
        .update({
          plan_id: 'annual',
          status: 'active',
          provider: 'manual_test',
          current_period_start: now,
          current_period_end: forever,
          cancel_at_period_end: false,
          last_verified_at: now,
        })
        .eq('id', existingSub.id)
        .select('id, status, current_period_end')
        .single()
      sub = res.data
      subErr = res.error
    } else {
      const res = await admin
        .from('subscriptions')
        .insert({
          user_id: p.id,
          plan_id: 'annual',
          status: 'active',
          provider: 'manual_test',
          provider_customer_id: null,
          provider_subscription_id: `test_forever_${p.id.slice(0, 8)}`,
          provider_checkout_session_id: null,
          current_period_start: now,
          current_period_end: forever,
          cancel_at_period_end: false,
          last_verified_at: now,
        })
        .select('id, status, current_period_end')
        .single()
      sub = res.data
      subErr = res.error
    }

    if (subErr) {
      console.error(`Failed to activate user ${p.display_name || p.id} (${p.id}):`, subErr.message)
    } else {
      console.log(`✅ Activated: ${p.display_name || p.id} -> Status: ${sub?.status}, Expires: ${sub?.current_period_end}`)
    }

    // Ensure charity preference
    if (defaultCharity) {
      const { data: existingPref } = await admin.from('charity_preferences').select('id').eq('user_id', p.id).is('effective_to', null).maybeSingle()
      if (!existingPref) {
        await admin.from('charity_preferences').insert({
          user_id: p.id,
          charity_id: defaultCharity.id,
          contribution_percentage: 10,
          effective_from: now,
        })
      }
    }
  }

  console.log('\nAll users successfully updated with forever testing membership!')
}

activateAllForever().catch(console.error)
