'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle2, AlertCircle, LogOut } from 'lucide-react'

type Charity = {
  id: string
  name: string
}

type Props = {
  profile: {
    id: string
    display_name: string | null
    phone: string | null
    winner_name_visible: boolean
  }
  currentPref: {
    charity_id: string
    contribution_percentage: number
  } | null
  charities: Charity[]
}

const PERCENTAGES = [10, 15, 20, 25, 30, 40]

export default function AccountSettingsForm({ profile, currentPref, charities }: Props) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(profile.display_name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [winnerVisible, setWinnerVisible] = useState(profile.winner_name_visible)
  const [selectedCharity, setSelectedCharity] = useState(currentPref?.charity_id || charities[0]?.id || '')
  const [selectedPct, setSelectedPct] = useState(currentPref?.contribution_percentage || 10)

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingCharity, setSavingCharity] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ text: string; isError: boolean } | null>(null)
  const [charityMsg, setCharityMsg] = useState<{ text: string; isError: boolean } | null>(null)

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        phone,
        winner_name_visible: winnerVisible,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (error) {
      setProfileMsg({ text: error.message, isError: true })
    } else {
      setProfileMsg({ text: 'Profile updated successfully!', isError: false })
      router.refresh()
    }
    setSavingProfile(false)
  }

  async function handleUpdateCharity(e: React.FormEvent) {
    e.preventDefault()
    setSavingCharity(true)
    setCharityMsg(null)

    try {
      const res = await fetch('/api/charity-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charityId: selectedCharity,
          contributionPercentage: selectedPct,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update charity preference')

      setCharityMsg({ text: 'Charity preference updated for future recognition!', isError: false })
      router.refresh()
    } catch (err: unknown) {
      setCharityMsg({
        text: err instanceof Error ? err.message : 'Update failed',
        isError: true,
      })
    }
    setSavingCharity(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="space-y-8">
      {/* Profile Form */}
      <form onSubmit={handleUpdateProfile} className="glass rounded-3xl p-6 sm:p-8 space-y-6">
        <h2 className="text-xl font-bold text-white">Profile Details</h2>

        {profileMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              profileMsg.isError
                ? 'bg-red-500/10 border border-red-500/25 text-red-400'
                : 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
            }`}
          >
            {profileMsg.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{profileMsg.text}</span>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Winner Privacy Toggle */}
        <div className="flex items-center justify-between pt-2">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-white">Public Winner Visibility</p>
            <p className="text-xs text-neutral-400">
              Allow your name to be displayed publicly on the leaderboard if you win a draw.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWinnerVisible(!winnerVisible)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              winnerVisible ? 'bg-emerald-500' : 'bg-neutral-800'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                winnerVisible ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <button
          type="submit"
          disabled={savingProfile}
          className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {savingProfile && <Loader2 size={16} className="animate-spin" />}
          Save Profile
        </button>
      </form>

      {/* Charity Preference Form */}
      <form onSubmit={handleUpdateCharity} className="glass rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Charity Allocation</h2>
          <p className="text-neutral-400 text-xs sm:text-sm">
            Configure which charity receives allocations from your monthly subscription and at what percentage.
          </p>
        </div>

        {charityMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              charityMsg.isError
                ? 'bg-red-500/10 border border-red-500/25 text-red-400'
                : 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
            }`}
          >
            {charityMsg.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{charityMsg.text}</span>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">Select Charity</label>
            <select
              value={selectedCharity}
              onChange={(e) => setSelectedCharity(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              {charities.map((c) => (
                <option key={c.id} value={c.id} className="bg-neutral-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">Allocation Percentage</label>
            <select
              value={selectedPct}
              onChange={(e) => setSelectedPct(Number(e.target.value))}
              className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              {PERCENTAGES.map((pct) => (
                <option key={pct} value={pct} className="bg-neutral-900 text-white">
                  {pct}% of subscription
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={savingCharity}
          className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {savingCharity && <Loader2 size={16} className="animate-spin" />}
          Update Charity Preference
        </button>
      </form>

      {/* Sign Out Button */}
      <div className="pt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  )
}
