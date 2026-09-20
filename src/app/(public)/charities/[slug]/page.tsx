import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Globe, ShieldCheck, Calendar, MapPin, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import DirectDonationModal from '@/components/charity/DirectDonationModal'

export default async function CharityProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ donation?: string }>
}) {
  const { slug } = await params
  const { donation } = await searchParams
  const supabase = await createClient()

  const { data: charity } = await supabase
    .from('charities')
    .select('*, charity_events(*)')
    .eq('slug', slug)
    .eq('is_published', true)
    .eq('is_archived', false)
    .maybeSingle()

  if (!charity) notFound()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const coverUrl = charity.cover_image_path
    ? `${supabaseUrl}/storage/v1/object/public/charity-media/${charity.cover_image_path}`
    : null
  const logoUrl = charity.logo_path
    ? `${supabaseUrl}/storage/v1/object/public/charity-media/${charity.logo_path}`
    : null

  const upcomingEvents = (charity.charity_events || []).filter(
    (e: { event_starts_at: string }) => new Date(e.event_starts_at) >= new Date()
  ).sort((a: { event_starts_at: string }, b: { event_starts_at: string }) => 
    new Date(a.event_starts_at).getTime() - new Date(b.event_starts_at).getTime()
  )

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <Link
        href="/charities"
        className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back to Charities
      </Link>

      {donation === 'success' && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-center gap-3 text-emerald-300 text-sm">
          <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
          <span>Thank you! Your direct donation has been successfully processed via Stripe.</span>
        </div>
      )}

      {/* Cover Image Banner if present */}
      {coverUrl && (
        <div className="relative h-64 sm:h-80 rounded-3xl overflow-hidden border border-white/10">
          <img
            src={coverUrl}
            alt={charity.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={`${charity.name} Logo`}
              className="w-16 h-16 rounded-2xl object-cover border border-white/10 bg-white/5 p-1"
            />
          )}
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-2">
              {charity.categories?.map((cat: string) => (
                <span
                  key={cat}
                  className="text-xs uppercase font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                >
                  {cat}
                </span>
              ))}
              {charity.is_featured && (
                <span className="text-xs uppercase font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Featured Partner
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              {charity.name}
            </h1>
          </div>
        </div>

        <p className="text-lg text-neutral-300 leading-relaxed">
          {charity.short_description}
        </p>

        {charity.website_url && (
          <div className="flex items-center gap-2 pt-1">
            <a
              href={charity.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
            >
              <Globe size={16} /> Visit Official Website <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8 pt-6 border-t border-white/5">
        <div className="md:col-span-2 space-y-8">
          {/* Mission & Impact Story */}
          <div className="glass rounded-3xl p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">Mission & Impact Story</h2>
            <div className="text-neutral-300 text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line">
              {charity.full_description || charity.short_description}
            </div>
          </div>

          {/* Upcoming Events (e.g. Golf Days) */}
          {upcomingEvents.length > 0 && (
            <div className="glass rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-2 text-white">
                <Calendar size={20} className="text-emerald-400" />
                <h3 className="text-lg font-bold">Upcoming Events & Golf Days</h3>
              </div>

              <div className="space-y-4">
                {upcomingEvents.map((evt: {
                  id: string
                  title: string
                  description: string | null
                  event_starts_at: string
                  location_text: string | null
                  event_url: string | null
                }) => (
                  <div
                    key={evt.id}
                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="font-bold text-white text-base">{evt.title}</h4>
                      <span className="text-xs text-emerald-400 font-semibold">
                        {new Date(evt.event_starts_at).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    {evt.location_text && (
                      <p className="text-xs text-neutral-400 flex items-center gap-1.5">
                        <MapPin size={13} className="text-neutral-500 shrink-0" />
                        {evt.location_text}
                      </p>
                    )}

                    {evt.description && (
                      <p className="text-xs text-neutral-300 leading-relaxed pt-1">
                        {evt.description}
                      </p>
                    )}

                    {evt.event_url && (
                      <a
                        href={evt.event_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 pt-1"
                      >
                        Event Details & Registration <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legal Verification Badge & Membership CTA */}
          <div className="glass rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={26} className="text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">Verified Legal Partner</p>
                <p className="text-xs text-neutral-400">Section 80G / 12A registered in India</p>
              </div>
            </div>
            <Link
              href={`/signup?charity=${charity.id}`}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-colors text-center shrink-0"
            >
              Choose for Membership
            </Link>
          </div>
        </div>

        {/* Direct Donation Sidebar */}
        <div className="space-y-6">
          <DirectDonationModal charityId={charity.id} charityName={charity.name} />
        </div>
      </div>
    </div>
  )
}

