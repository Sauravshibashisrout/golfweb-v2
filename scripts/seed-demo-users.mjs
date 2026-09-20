import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xjzwjysoaszxcjjstxln.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqendqeXNvYXN6eGNqanN0eGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg3MTQ1MiwiZXhwIjoyMTA1NDQ3NDUyfQ.-Q-4zj_9Rb7hKOYGdolflvVcBAcmF968o0yqpVoy1n8'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function seed() {
  console.log('Setting up demo accounts...\n')

  // 1. Admin Account
  const adminEmail = 'admin@golfgives.org'
  const adminPass = 'AdminPassword123!'

  // Check if exists
  const { data: usersData } = await admin.auth.admin.listUsers()
  let adminUser = usersData.users.find(u => u.email === adminEmail)

  if (!adminUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminPass,
      email_confirm: true,
      user_metadata: { full_name: 'System Administrator' },
    })
    if (error) console.error('Error creating admin auth:', error)
    adminUser = data?.user
  } else {
    // Update password
    await admin.auth.admin.updateUserById(adminUser.id, {
      password: adminPass,
      email_confirm: true,
    })
  }

  if (adminUser) {
    await admin.from('profiles').upsert({
      id: adminUser.id,
      email: adminEmail,
      full_name: 'System Administrator',
      role: 'admin',
    })
    console.log(`✅ Admin account ready: ${adminEmail} / ${adminPass} (role: admin)`)
  }

  // 2. Subscriber Account
  const subscriberEmail = 'golfer@golfgives.org'
  const subscriberPass = 'GolferPassword123!'

  let subscriberUser = usersData.users.find(u => u.email === subscriberEmail)

  if (!subscriberUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email: subscriberEmail,
      password: subscriberPass,
      email_confirm: true,
      user_metadata: { full_name: 'Rory McIlroy' },
    })
    if (error) console.error('Error creating subscriber auth:', error)
    subscriberUser = data?.user
  } else {
    await admin.auth.admin.updateUserById(subscriberUser.id, {
      password: subscriberPass,
      email_confirm: true,
    })
  }

  if (subscriberUser) {
    await admin.from('profiles').upsert({
      id: subscriberUser.id,
      email: subscriberEmail,
      full_name: 'Rory McIlroy',
      role: 'subscriber',
    })

    // Give an active subscription
    const { data: plans } = await admin.from('membership_plans').select('id').eq('is_active', true).limit(1)
    if (plans?.[0]) {
      await admin.from('subscriptions').upsert({
        user_id: subscriberUser.id,
        plan_id: plans[0].id,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      }, { onConflict: 'user_id' })
    }

    // Give a charity preference
    const { data: charities } = await admin.from('charities').select('id').limit(1)
    if (charities?.[0]) {
      await admin.from('charity_preferences').upsert({
        user_id: subscriberUser.id,
        charity_id: charities[0].id,
        contribution_percentage: 20,
      }, { onConflict: 'user_id' })
    }

    // Give 5 initial golf scores
    const sampleScores = [
      { score: 38, date: '2026-03-10' },
      { score: 34, date: '2026-03-12' },
      { score: 41, date: '2026-03-14' },
      { score: 36, date: '2026-03-16' },
      { score: 39, date: '2026-03-18' },
    ]

    for (const s of sampleScores) {
      await admin.from('golf_scores').upsert({
        user_id: subscriberUser.id,
        stableford_score: s.score,
        played_on: s.date,
      }, { onConflict: 'user_id,played_on' })
    }

    console.log(`✅ Subscriber account ready: ${subscriberEmail} / ${subscriberPass} (role: subscriber, active plan, 5 scores)`)
  }
}

seed().catch(console.error)
