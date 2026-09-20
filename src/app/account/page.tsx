import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionContext } from '@/lib/rbac'
import { createClient } from '@/lib/supabase/server'
import AccountSettingsForm from '@/components/account/AccountSettingsForm'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Account Settings — GolfGives',
}

export default async function AccountPage() {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/login?next=/account')

  const supabase = await createClient()

  // Load profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', ctx.userId)
    .single()

  // Load current active charity preference
  const { data: currentPref } = await supabase
    .from('charity_preferences')
    .select('charity_id, contribution_percentage')
    .eq('user_id', ctx.userId)
    .is('effective_to', null)
    .maybeSingle()

  // Load published charities
  const { data: charities } = await supabase
    .from('charities')
    .select('id, name')
    .eq('is_published', true)
    .order('name', { ascending: true })

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Account & Preferences</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Manage your personal details, winner privacy, and charitable allocations.
        </p>
      </div>

      <AccountSettingsForm
        profile={profile!}
        currentPref={currentPref}
        charities={charities || []}
      />
    </div>
  )
}
