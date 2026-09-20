'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Heart,
  Plus,
  Search,
  ExternalLink,
  Edit,
  Archive,
  ArchiveRestore,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Calendar,
  Users,
  IndianRupee,
} from 'lucide-react'

type Charity = {
  id: string
  name: string
  slug: string
  short_description: string
  categories: string[]
  is_published: boolean
  is_archived: boolean
  is_featured: boolean
  allocated_paise: number
  donated_paise: number
  total_impact_paise: number
  active_supporters: number
  event_count: number
}

export default function AdminCharitiesPage() {
  const [charities, setCharities] = useState<Charity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function loadCharities() {
    try {
      const res = await fetch('/api/admin/charities')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load charities')
      setCharities(data.charities || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading charities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCharities()
  }, [])

  async function callCharityMutate(body: Record<string, unknown>) {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-charity-mutate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(body),
    })

    const text = await res.text()
    let data: any = {}
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }

    if (!res.ok) {
      const err = new Error(data.error || data.message || 'Action failed') as any
      err.canArchive = data.canArchive
      throw err
    }

    return data
  }

  async function togglePublish(charity: Charity) {
    setActionLoading(charity.id)
    try {
      await callCharityMutate({
        action: 'update',
        charityId: charity.id,
        data: { is_published: !charity.is_published },
      })
      await loadCharities()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  async function toggleArchive(charity: Charity) {
    const action = charity.is_archived ? 'unarchive' : 'archive'
    if (!confirm(`Are you sure you want to ${action} ${charity.name}? Historical financial records will be preserved.`)) {
      return
    }

    setActionLoading(charity.id)
    try {
      await callCharityMutate({
        action: charity.is_archived ? 'unarchive' : 'archive',
        charityId: charity.id,
      })
      await loadCharities()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  async function toggleFeatured(charity: Charity) {
    setActionLoading(charity.id)
    try {
      await callCharityMutate({
        action: 'update',
        charityId: charity.id,
        data: { is_featured: !charity.is_featured },
      })
      await loadCharities()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(charity: Charity) {
    if (!confirm(`Are you sure you want to delete ${charity.name}? If any financial records exist, it will need to be archived instead.`)) {
      return
    }

    setActionLoading(charity.id)
    try {
      await callCharityMutate({
        action: 'delete',
        charityId: charity.id,
      })
      await loadCharities()
    } catch (err: any) {
      if (err.canArchive) {
        if (confirm(`${err.message}\n\nWould you like to archive this charity now instead?`)) {
          await toggleArchive(charity)
        }
        return
      }
      alert(err.message || 'Delete failed')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = charities.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.short_description.toLowerCase().includes(search.toLowerCase()) ||
      (c.categories || []).some((cat) => cat.toLowerCase().includes(search.toLowerCase()))

    if (!matchesSearch) return false

    if (statusFilter === 'published') return c.is_published && !c.is_archived
    if (statusFilter === 'draft') return !c.is_published && !c.is_archived
    if (statusFilter === 'archived') return c.is_archived
    return true
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2">
            <Heart size={14} /> Impact Partner Management
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Charities & Causes</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Create, publish, archive, and manage partner charities and upcoming golf events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="px-4 py-2.5 rounded-full border border-white/10 hover:border-white/20 text-neutral-300 text-xs font-semibold transition-colors"
          >
            ← Admin Dashboard
          </Link>
          <Link
            href="/admin/charities/new"
            className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Plus size={16} /> Add New Charity
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search charities..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'published', 'draft', 'archived'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize transition-colors ${
                statusFilter === filter
                  ? 'bg-emerald-500 text-neutral-950'
                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Charities List */}
      {loading ? (
        <div className="text-center py-16 text-neutral-500 text-sm flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading charities...
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((charity) => (
            <div
              key={charity.id}
              className={`glass rounded-3xl p-6 transition-all border ${
                charity.is_archived
                  ? 'border-white/5 opacity-60 bg-neutral-900/20'
                  : charity.is_published
                  ? 'border-white/10 hover:border-emerald-500/20'
                  : 'border-amber-500/20 bg-amber-500/[0.02]'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    {charity.is_archived ? (
                      <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-neutral-500/20 text-neutral-400 border border-neutral-500/30">
                        Archived
                      </span>
                    ) : charity.is_published ? (
                      <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Published
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Draft / Unpublished
                      </span>
                    )}

                    {charity.is_featured && (
                      <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        ⭐ Homepage Spotlight
                      </span>
                    )}

                    {charity.categories?.map((cat) => (
                      <span
                        key={cat}
                        className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-white/5 text-neutral-400"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {charity.name}
                      <Link
                        href={`/charities/${charity.slug}`}
                        target="_blank"
                        className="text-neutral-500 hover:text-white transition-colors"
                        title="View Public Profile"
                      >
                        <ExternalLink size={14} />
                      </Link>
                    </h3>
                    <p className="text-neutral-400 text-xs sm:text-sm mt-1 leading-relaxed">
                      {charity.short_description}
                    </p>
                  </div>

                  {/* Financial & Engagement Metrics */}
                  <div className="flex flex-wrap items-center gap-6 pt-1 text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-300">
                      <IndianRupee size={14} className="text-emerald-400" />
                      <span>Total Allocated:</span>
                      <strong className="text-white">
                        ₹{((charity.total_impact_paise) / 100).toLocaleString('en-IN')}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5 text-neutral-300">
                      <Users size={14} className="text-emerald-400" />
                      <span>Active Supporters:</span>
                      <strong className="text-white">{charity.active_supporters}</strong>
                    </div>

                    <div className="flex items-center gap-1.5 text-neutral-300">
                      <Calendar size={14} className="text-emerald-400" />
                      <span>Events:</span>
                      <strong className="text-white">{charity.event_count}</strong>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/5">
                  <Link
                    href={`/admin/charities/${charity.id}/edit`}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Edit size={14} /> Edit & Events
                  </Link>

                  <button
                    type="button"
                    disabled={actionLoading === charity.id || charity.is_archived}
                    onClick={() => togglePublish(charity)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      charity.is_published
                        ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    } disabled:opacity-40`}
                  >
                    {charity.is_published ? <XCircle size={14} /> : <CheckCircle size={14} />}
                    {charity.is_published ? 'Unpublish' : 'Publish'}
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading === charity.id}
                    onClick={() => toggleFeatured(charity)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      charity.is_featured
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'bg-white/5 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {charity.is_featured ? 'Featured' : 'Feature'}
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading === charity.id}
                    onClick={() => toggleArchive(charity)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      charity.is_archived
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                    }`}
                    title={charity.is_archived ? 'Unarchive Charity' : 'Archive Charity'}
                  >
                    {charity.is_archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                    {charity.is_archived ? 'Unarchive' : 'Archive'}
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading === charity.id}
                    onClick={() => handleDelete(charity)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
                    title="Delete Charity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 glass rounded-3xl p-8 space-y-3">
          <Heart size={36} className="text-neutral-600 mx-auto" />
          <p className="text-base font-bold text-white">No charities found</p>
          <p className="text-neutral-400 text-xs">Try adjusting your filters or search query.</p>
        </div>
      )}
    </div>
  )
}
