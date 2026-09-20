'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Heart, Upload, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'

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

export default function NewCharityPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [fullDescription, setFullDescription] = useState('')
  const [categories, setCategories] = useState<string[]>(['Youth Development'])
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [donationUrl, setDonationUrl] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [isPublished, setIsPublished] = useState(true)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function generateSlug(text: string) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function handleNameChange(val: string) {
    setName(val)
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(val))
    }
  }

  function toggleCategory(cat: string) {
    if (categories.includes(cat)) {
      if (categories.length > 1) {
        setCategories(categories.filter((c) => c !== cat))
      }
    } else {
      setCategories([...categories, cat])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUploading(true)
    setError(null)

    const supabase = createClient()
    let logoPath: string | null = null
    let coverPath: string | null = null

    try {
      // 1. Upload logo if provided
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `logos/${slug}_${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('charity-media')
          .upload(path, logoFile, { upsert: true })
        if (uploadErr) throw new Error(`Logo upload failed: ${uploadErr.message}`)
        logoPath = path
      }

      // 2. Upload cover image if provided
      if (coverFile) {
        const ext = coverFile.name.split('.').pop()
        const path = `covers/${slug}_${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('charity-media')
          .upload(path, coverFile, { upsert: true })
        if (uploadErr) throw new Error(`Cover image upload failed: ${uploadErr.message}`)
        coverPath = path
      }

      // 3. Create charity via admin-charity-mutate Edge Function
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
          action: 'create',
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
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to create charity')

      router.push(`/admin/charities/${data.charity.id}/edit`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed')
      setUploading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <Link
        href="/admin/charities"
        className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back to Charities
      </Link>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
          <Heart size={14} /> New Partner Charity
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Create Charity Profile</h1>
        <p className="text-neutral-400 text-sm">
          Add a verified charitable organization to the GolfGives ecosystem.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 glass rounded-3xl p-8 border border-white/10">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">Charity Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Magic Bus India Foundation"
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
              placeholder="magic-bus"
              className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-neutral-400 uppercase font-semibold">Short Summary * (1-2 sentences)</label>
          <textarea
            required
            rows={2}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="Empowering children and youth from marginalized backgrounds through sport and education."
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
            placeholder="Describe the organization's background, goals, measurable milestones, and how donor funding creates tangible change..."
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
              placeholder="https://example.org"
              className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">Direct Donation / 80G URL</label>
            <input
              type="url"
              value={donationUrl}
              onChange={(e) => setDonationUrl(e.target.value)}
              placeholder="https://example.org/donate"
              className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>
        </div>

        {/* Image Uploads to charity-media bucket */}
        <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">Charity Logo (Max 5MB)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              className="w-full mt-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-neutral-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 text-xs"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 uppercase font-semibold">Cover / Hero Image (Max 5MB)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              className="w-full mt-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-neutral-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 text-xs"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap items-center gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded accent-emerald-500"
            />
            <span>Publish immediately (visible to subscribers)</span>
          </label>

          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="rounded accent-amber-500"
            />
            <span>Feature on Homepage Spotlight</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          Create Charity & Continue
        </button>
      </form>
    </div>
  )
}
