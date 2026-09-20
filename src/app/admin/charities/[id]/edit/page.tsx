'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Heart,
  Upload,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Archive,
  ArchiveRestore,
} from 'lucide-react'

const AVAILABLE_CATEGORIES = [
  'Youth Development',
  'Education',
  'Sports',
  'Rural Development',
  'Child Nutrition',
  'Environment',
  'Healthcare',
  'Elderly Care',
]

type CharityEvent = {
  id: string
  title: string
  description: string | null
  event_starts_at: string
  location_text: string | null
  event_url: string | null
}

export default function EditCharityPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Charity Fields
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [fullDescription, setFullDescription] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [donationUrl, setDonationUrl] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [isPublished, setIsPublished] = useState(true)
  const [isArchived, setIsArchived] = useState(false)
  const [existingLogoPath, setExistingLogoPath] = useState<string | null>(null)
  const [existingCoverPath, setExistingCoverPath] = useState<string | null>(null)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)

  // Events
  const [events, setEvents] = useState<CharityEvent[]>([])
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState('')
  const [newEventLocation, setNewEventLocation] = useState('')
  const [newEventUrl, setNewEventUrl] = useState('')
  const [newEventDesc, setNewEventDesc] = useState('')
  const [addingEvent, setAddingEvent] = useState(false)

  async function loadCharity() {
    try {
      const res = await fetch(`/api/admin/charities/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load charity')

      const c = data.charity
      setName(c.name)
      setSlug(c.slug)
      setShortDescription(c.short_description || '')
      setFullDescription(c.full_description || '')
      setCategories(c.categories || ['Youth Development'])
      setWebsiteUrl(c.website_url || '')
      setDonationUrl(c.donation_url || '')
      setIsFeatured(c.is_featured)
      setIsPublished(c.is_published)
      setIsArchived(c.is_archived || false)
      setExistingLogoPath(c.logo_path)
      setExistingCoverPath(c.cover_image_path)
      setEvents(c.charity_events || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading charity')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCharity()
  }, [id])

  function toggleCategory(cat: string) {
    if (categories.includes(cat)) {
      if (categories.length > 1) {
        setCategories(categories.filter((c) => c !== cat))
      }
    } else {
      setCategories([...categories, cat])
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()
    let logoPath = existingLogoPath
    let coverPath = existingCoverPath

    try {
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `logos/${slug}_${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('charity-media')
          .upload(path, logoFile, { upsert: true })
        if (uploadErr) throw new Error(`Logo upload failed: ${uploadErr.message}`)
        logoPath = path
      }

      if (coverFile) {
        const ext = coverFile.name.split('.').pop()
        const path = `covers/${slug}_${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('charity-media')
          .upload(path, coverFile, { upsert: true })
        if (uploadErr) throw new Error(`Cover image upload failed: ${uploadErr.message}`)
        coverPath = path
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-charity-mutate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'update',
          charityId: id,
          data: {
            name,
            slug,
            short_description: shortDescription,
            full_description: fullDescription,
            categories,
            website_url: websiteUrl || null,
            donation_url: donationUrl || null,
            logo_path: logoPath,
            cover_image_path: coverPath,
            is_featured: isFeatured,
            is_published: isPublished,
            is_archived: isArchived,
          },
        }),
      })

      const text = await res.text()
      let data: any = {}
      try {
        data = JSON.parse(text)
      } catch {
        data = { error: text }
      }
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to update charity')

      setExistingLogoPath(logoPath)
      setExistingCoverPath(coverPath)
      setSuccess(true)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!newEventTitle || !newEventDate) return

    setAddingEvent(true)
    try {
      const res = await fetch(`/api/admin/charities/${id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEventTitle,
          event_starts_at: newEventDate,
          location_text: newEventLocation || null,
          event_url: newEventUrl || null,
          description: newEventDesc || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add event')

      setEvents([...events, data.event])
      setNewEventTitle('')
      setNewEventDate('')
      setNewEventLocation('')
      setNewEventUrl('')
      setNewEventDesc('')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error adding event')
    } finally {
      setAddingEvent(false)
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm('Are you sure you want to remove this event?')) return

    try {
      const res = await fetch(`/api/admin/charities/${id}/events?eventId=${eventId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete event')
      setEvents(events.filter((e) => e.id !== eventId))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting event')
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-neutral-500 text-sm gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading charity details...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/charities"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Charities
        </Link>
        <Link
          href={`/charities/${slug}`}
          target="_blank"
          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
        >
          View Public Profile <ExternalLink size={12} />
        </Link>
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
          <Heart size={14} /> Partner Management
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Edit {name}</h1>
        <p className="text-neutral-400 text-sm">
          Update partner profile, upload imagery to charity-media bucket, and manage upcoming golf events.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          Charity profile updated successfully!
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSave} className="space-y-6 glass rounded-3xl p-8 border border-white/10">
        <h2 className="text-lg font-bold text-white">Charity Details</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">Charity Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">URL Slug *</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-neutral-400 uppercase font-semibold">Short Summary *</label>
          <textarea
            required
            rows={2}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-400 uppercase font-semibold">
            Full Mission & Impact Story
          </label>
          <textarea
            rows={6}
            value={fullDescription}
            onChange={(e) => setFullDescription(e.target.value)}
            className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <label className="text-xs text-neutral-400 uppercase font-semibold">Cause Categories</label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_CATEGORIES.map((cat) => {
              const isSelected = categories.includes(cat)
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-emerald-500 text-neutral-950'
                      : 'bg-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* URLs */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">Direct Donation URL</label>
            <input
              type="url"
              value={donationUrl}
              onChange={(e) => setDonationUrl(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>
        </div>

        {/* Imagery Uploads */}
        <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">
              Charity Logo {existingLogoPath && '(Uploaded)'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              className="w-full mt-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-neutral-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 text-xs"
            />
            {existingLogoPath && (
              <p className="text-[11px] text-neutral-500 mt-1 truncate">Current: {existingLogoPath}</p>
            )}
          </div>

          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">
              Cover Image {existingCoverPath && '(Uploaded)'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              className="w-full mt-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-neutral-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 text-xs"
            />
            {existingCoverPath && (
              <p className="text-[11px] text-neutral-500 mt-1 truncate">Current: {existingCoverPath}</p>
            )}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap items-center gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              disabled={isArchived}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded accent-emerald-500"
            />
            <span>Published (visible in directory)</span>
          </label>

          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="rounded accent-amber-500"
            />
            <span>Featured on Homepage</span>
          </label>

          <label className="flex items-center gap-2 text-sm text-amber-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isArchived}
              onChange={(e) => {
                setIsArchived(e.target.checked)
                if (e.target.checked) setIsPublished(false)
              }}
              className="rounded accent-amber-500"
            />
            <span>Archived (preserves financial history, hides from public)</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          Save Charity Profile
        </button>
      </form>

      {/* Upcoming Events Management */}
      <div className="glass rounded-3xl p-8 border border-white/10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Calendar size={20} className="text-emerald-400" />
            <h2 className="text-xl font-bold">Upcoming Events & Golf Days</h2>
          </div>
          <span className="text-xs text-neutral-400">{events.length} Scheduled</span>
        </div>

        {/* Event List */}
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-white text-sm">{evt.title}</h4>
                    <span className="text-xs text-emerald-400 font-semibold">
                      {new Date(evt.event_starts_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  {evt.location_text && (
                    <p className="text-xs text-neutral-400 flex items-center gap-1">
                      <MapPin size={12} className="text-neutral-500" /> {evt.location_text}
                    </p>
                  )}
                  {evt.description && (
                    <p className="text-xs text-neutral-300 pt-0.5">{evt.description}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteEvent(evt.id)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
                  title="Delete Event"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-neutral-500 text-xs">
            No upcoming events scheduled. Add a charity golf day or fundraiser below.
          </div>
        )}

        {/* Add Event Sub-form */}
        <form onSubmit={handleAddEvent} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Plus size={16} className="text-emerald-400" /> Add Upcoming Event / Golf Day
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-400 uppercase font-semibold">Event Title *</label>
              <input
                type="text"
                required
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="e.g. Annual Charity Golf Day 2026"
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 uppercase font-semibold">Event Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-400 uppercase font-semibold">Location / Course</label>
              <input
                type="text"
                value={newEventLocation}
                onChange={(e) => setNewEventLocation(e.target.value)}
                placeholder="e.g. Delhi Golf Club, New Delhi"
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 uppercase font-semibold">Event URL</label>
              <input
                type="url"
                value={newEventUrl}
                onChange={(e) => setNewEventUrl(e.target.value)}
                placeholder="https://example.org/golf-day"
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">Event Description</label>
            <input
              type="text"
              value={newEventDesc}
              onChange={(e) => setNewEventDesc(e.target.value)}
              placeholder="Brief details regarding registration, format (e.g. 18-hole Stableford), prizes..."
              className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={addingEvent}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors flex items-center gap-2"
          >
            {addingEvent ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add Event
          </button>
        </form>
      </div>
    </div>
  )
}
