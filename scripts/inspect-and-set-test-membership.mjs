import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xjzwjysoaszxcjjstxln.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqendqeXNvYXN6eGNqanN0eGxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg3MTQ1MiwiZXhwIjoyMTA1NDQ3NDUyfQ.-Q-4zj_9Rb7hKOYGdolflvVcBAcmF968o0yqpVoy1n8'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('1. Querying subscriptions table constraints and structure...')
  const res = await fetch(`https://api.supabase.com/v1/projects/xjzwjysoaszxcjjstxln/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        SELECT conname, pg_get_constraintdef(oid) as def
        FROM pg_constraint
        WHERE conrelid = 'public.subscriptions'::regclass;
      `,
    }),
  })
  const constraints = await res.json()
  console.log('Subscriptions constraints:', constraints)

  // 2. Identify the authenticated user
  const targetEmail = 'sauravshibashisroutt@gmail.com'
  const { data: usersData } = await admin.auth.admin.listUsers()
  const user = usersData?.users?.find(u => u.email === targetEmail) || usersData?.users?.find(u => u.id === '28a1148f-cbc0-4b03-974b-dea66d8c6e8e')

  if (!user) {
    console.error('User not found!')
    return
  }

  console.log(`\n2. Target user found: ${user.email} (${user.id})`)

  // Check existing subscription
  const { data: existingSub } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  console.log('Existing subscription before change:', existingSub)
}

main().catch(console.error)
