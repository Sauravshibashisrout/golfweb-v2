import Link from 'next/link'
import { ArrowRight, Trophy, Heart, ShieldCheck, Sparkles, TrendingUp, Users } from 'lucide-react'
import Footer from '@/components/ui/Footer'
import { createClient } from '@/lib/supabase/server'
import SandboxBanner from '@/components/draw/SandboxBanner'

export default async function HomePage() {
  const supabase = await createClient()

  // Load current active draw
  const { data: currentDraw } = await supabase
    .from('draws')
    .select('id, title, cycle_month, status, reward_pool_paise, jackpot_rollover_in_paise, cash_prize_enabled')
    .not('status', 'in', '("archived","cancelled")')
    .order('cycle_month', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Load cashPrizeDrawEnabled setting
  const { data: setting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'cashPrizeDrawEnabled')
    .single()
  const cashEnabled = setting?.value === true

  // Load featured charity spotlight (one featured charity)
  let { data: featuredCharity } = await supabase
    .from('charities')
    .select('*, charity_events(*)')
    .eq('is_published', true)
    .eq('is_archived', false)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!featuredCharity) {
    const { data: fallback } = await supabase
      .from('charities')
      .select('*, charity_events(*)')
      .eq('is_published', true)
      .eq('is_archived', false)
      .order('name', { ascending: true })
      .limit(1)
      .maybeSingle()
    featuredCharity = fallback
  }

  const rewardPoolPaise = (currentDraw?.reward_pool_paise ?? 0) + (currentDraw?.jackpot_rollover_in_paise ?? 0)

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 text-neutral-100">
      <main className="flex-1">
        {/* Sandbox Notice if active */}
        {!cashEnabled && <SandboxBanner />}

        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32 px-4 sm:px-6 lg:px-8 border-b border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />
          
          <div className="relative max-w-5xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={14} />
              India's Premier Purpose-Driven Golf Club
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
              Play Real Golf. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-green-500">
                Fuel Real Impact.
              </span> <br />
              Win Monthly Rewards.
            </h1>

            <p className="text-neutral-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
              Track your 5 latest Stableford scores. Every stroke funds verified grassroots charities across India, with guaranteed monthly rewards.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/pricing"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-base transition-colors flex items-center justify-center gap-2"
              >
                Join GolfGives <ArrowRight size={18} />
              </Link>
              <Link
                href="/how-it-works"
                className="w-full sm:w-auto px-8 py-4 rounded-full border border-white/10 hover:border-white/20 text-white font-semibold text-base transition-colors"
              >
                How It Works
              </Link>
            </div>
          </div>
        </section>

        {/* Live Impact & Reward Pool Stats */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-white/5 bg-neutral-900/40">
          <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <span className="text-xs uppercase font-semibold text-neutral-400 tracking-wider">Current Reward Pool</span>
              <p className="text-4xl sm:text-5xl font-extrabold text-white">
                ₹{((rewardPoolPaise) / 100).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-neutral-500">
                {currentDraw ? `Cycle: ${currentDraw.cycle_month}` : 'Cycle opening soon'}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase font-semibold text-neutral-400 tracking-wider">Charity Allocation</span>
              <p className="text-4xl sm:text-5xl font-extrabold text-emerald-400">
                10% – 40%
              </p>
              <p className="text-xs text-neutral-500">Directly chosen by each golfer</p>
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase font-semibold text-neutral-400 tracking-wider">Qualifying Criteria</span>
              <p className="text-4xl sm:text-5xl font-extrabold text-white">
                5 Scores
              </p>
              <p className="text-xs text-neutral-500">Stableford scores from 1 to 45</p>
            </div>
          </div>
        </section>

        {/* 3-Step Process */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Three Steps from Tee to Community Impact
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass rounded-3xl p-8 space-y-4 relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xl">
                1
              </div>
              <h3 className="text-xl font-bold text-white">Subscribe & Choose Cause</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Join GolfGives from ₹599/month. Choose your charity partner and contribution rate (10% to 40%) at signup.
              </p>
            </div>

            <div className="glass rounded-3xl p-8 space-y-4 relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xl">
                2
              </div>
              <h3 className="text-xl font-bold text-white">Log 5 Stableford Scores</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Play on any recognized course in India. Your 5 latest scores automatically form your monthly draw ticket.
              </p>
            </div>

            <div className="glass rounded-3xl p-8 space-y-4 relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xl">
                3
              </div>
              <h3 className="text-xl font-bold text-white">Win & Transform Lives</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Match 3, 4, or 5 numbers for reward tiers. Unclaimed top tiers roll over into next month's jackpot.
              </p>
            </div>
          </div>
        </section>

        {/* Featured Charity Spotlight (Feature one charity on the homepage) */}
        {featuredCharity && (
          <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-neutral-900/30">
            <div className="max-w-6xl mx-auto space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
                    <Heart size={14} />
                    Featured Impact Partner
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                    {featuredCharity.name}
                  </h2>
                </div>
                <Link
                  href="/charities"
                  className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold flex items-center gap-1 shrink-0"
                >
                  Explore all vetted charities <ArrowRight size={14} />
                </Link>
              </div>

              <div className="glass rounded-3xl p-8 sm:p-10 grid md:grid-cols-3 gap-8 items-center border border-white/10">
                <div className="md:col-span-2 space-y-6">
                  <div className="flex flex-wrap gap-2">
                    {featuredCharity.categories?.map((c: string) => (
                      <span
                        key={c}
                        className="text-xs uppercase font-semibold px-3 py-1 rounded-full bg-white/5 text-neutral-300 border border-white/10"
                      >
                        {c}
                      </span>
                    ))}
                    <span className="text-xs uppercase font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Spotlight Partner
                    </span>
                  </div>

                  <p className="text-neutral-300 text-base sm:text-lg leading-relaxed">
                    {featuredCharity.short_description}
                  </p>

                  {/* Upcoming Event Teaser if available */}
                  {featuredCharity.charity_events && featuredCharity.charity_events.length > 0 && (
                    <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center gap-3 text-xs text-neutral-300">
                      <span className="text-emerald-400 text-base">⛳</span>
                      <div>
                        <span className="font-bold text-white">
                          Upcoming: {featuredCharity.charity_events[0].title}
                        </span>
                        {featuredCharity.charity_events[0].location_text && (
                          <span className="text-neutral-400 ml-2">
                            · {featuredCharity.charity_events[0].location_text}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <Link
                      href={`/charities/${featuredCharity.slug}`}
                      className="px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition-colors flex items-center gap-2"
                    >
                      Donate Directly <ArrowRight size={16} />
                    </Link>
                    <Link
                      href={`/signup?charity=${featuredCharity.id}`}
                      className="px-6 py-3 rounded-full border border-white/10 hover:border-white/20 text-white font-semibold text-sm transition-colors"
                    >
                      Support with Membership
                    </Link>
                  </div>
                </div>

                {/* Right highlight column */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <ShieldCheck size={32} />
                  </div>
                  <h4 className="font-bold text-white text-base">Grassroots Integrity</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    100% vetted under Indian Section 80G & 12A. Every rupee tracked through audited payment allocations.
                  </p>
                  <Link
                    href={`/charities/${featuredCharity.slug}`}
                    className="inline-block text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    Read full impact story →
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden border-t border-white/5">
          <div className="max-w-3xl mx-auto space-y-6 relative">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Ready to Play for Something Greater?
            </h2>
            <p className="text-neutral-400 text-base sm:text-lg">
              Join golfers across India who turn every drive, chip, and putt into meaningful change.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/pricing"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-base transition-colors"
              >
                View Membership Plans
              </Link>
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 rounded-full border border-white/10 hover:border-white/20 text-white font-semibold text-base transition-colors"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
