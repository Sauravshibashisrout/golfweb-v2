import Link from 'next/link'
import { Heart, ExternalLink, ArrowRight, Search, Calendar, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Charity Directory — GolfGives',
  description: 'Explore vetted charities and causes supported by GolfGives members across India.',
}

export default async function CharitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>
}) {
  const { category, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('charities')
    .select('*, charity_events(*)')
    .eq('is_published', true)
    .eq('is_archived', false)
    .order('is_featured', { ascending: false })
    .order('name', { ascending: true })

  if (category && category !== 'All') {
    query = query.contains('categories', [category])
  }

  if (q) {
    query = query.or(`name.ilike.%${q}%,short_description.ilike.%${q}%`)
  }

  const { data: charities } = await query

  const CATEGORIES = [
    'All',
    'Youth Development',
    'Education',
    'Sports',
    'Rural Development',
    'Child Nutrition',
    'Environment',
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Impact Partners</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Vetted Charities
        </h1>
        <p className="text-neutral-400 text-base sm:text-lg">
          Every partner is rigorously vetted for legal standing, financial integrity, and tangible on-the-ground impact.
        </p>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="space-y-6 max-w-3xl mx-auto">
        <form method="GET" action="/charities" className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            name="q"
            defaultValue={q || ''}
            placeholder="Search causes, charities, or keywords..."
            className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 text-sm"
          />
          {category && category !== 'All' && (
            <input type="hidden" name="category" value={category} />
          )}
        </form>

        {/* Category Pills */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {CATEGORIES.map((cat) => {
            const isSelected = (!category && cat === 'All') || category === cat
            const params = new URLSearchParams()
            if (cat !== 'All') params.set('category', cat)
            if (q) params.set('q', q)
            const href = `/charities${params.toString() ? `?${params.toString()}` : ''}`
            return (
              <Link
                key={cat}
                href={href}
                className={`text-xs px-4 py-2 rounded-full font-medium transition-colors ${
                  isSelected
                    ? 'bg-emerald-500 text-neutral-950 font-bold'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Charities Grid */}
      {charities && charities.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {charities.map((charity) => {
            const upcomingEvents = (charity.charity_events || []).filter(
              (e: { event_starts_at: string }) => new Date(e.event_starts_at) >= new Date()
            )
            const nextEvent = upcomingEvents[0]

            return (
              <div
                key={charity.id}
                className="glass rounded-3xl p-8 flex flex-col justify-between space-y-6 hover:border-emerald-500/30 transition-all relative overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {charity.categories?.map((c: string) => (
                          <span
                            key={c}
                            className="text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          >
                            {c}
                          </span>
                        ))}
                        {charity.is_featured && (
                          <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Featured Partner
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold text-white">{charity.name}</h3>
                    </div>
                    {charity.website_url && (
                      <a
                        href={charity.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-500 hover:text-white transition-colors p-1"
                        aria-label="External website"
                      >
                        <ExternalLink size={18} />
                      </a>
                    )}
                  </div>

                  <p className="text-neutral-300 text-sm leading-relaxed">
                    {charity.short_description}
                  </p>

                  {/* Upcoming Event Teaser */}
                  {nextEvent && (
                    <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-3 text-xs text-neutral-300">
                      <Calendar size={15} className="text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-white">{nextEvent.title}</span>
                        {nextEvent.location_text && (
                          <span className="text-neutral-400 ml-1.5">· {nextEvent.location_text}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <Link
                    href={`/charities/${charity.slug}`}
                    className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    Learn more & Donate <ArrowRight size={14} />
                  </Link>
                  <Link
                    href={`/signup?charity=${charity.id}`}
                    className="text-xs px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                  >
                    Choose for Membership
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 space-y-4 glass rounded-3xl p-8">
          <Heart size={36} className="text-neutral-600 mx-auto" />
          <p className="text-lg font-bold text-white">No charities found</p>
          <p className="text-neutral-400 text-sm">
            Try adjusting your search terms or category filter.
          </p>
          <Link
            href="/charities"
            className="inline-block px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
          >
            Clear Filters
          </Link>
        </div>
      )}
    </div>
  )
}

