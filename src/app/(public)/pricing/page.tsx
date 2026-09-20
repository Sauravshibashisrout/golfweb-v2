import { createClient } from '@/lib/supabase/server'
import PricingCards from '@/components/ui/PricingCards'
import { HelpCircle } from 'lucide-react'

export const metadata = {
  title: 'Membership Plans & Pricing — GolfGives',
  description: 'Choose your membership plan. All payments in INR paise, with direct charity allocation.',
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ charity?: string }>
}) {
  const { charity: charityId } = await searchParams
  const supabase = await createClient()

  const { data: plans } = await supabase
    .from('membership_plans')
    .select('id, name, amount_paise, interval_months')
    .eq('is_active', true)
    .order('interval_months', { ascending: true })

  let selectedCharity = null
  if (charityId) {
    const { data: c } = await supabase
      .from('charities')
      .select('id, name')
      .eq('id', charityId)
      .maybeSingle()
    selectedCharity = c
  }

  const FAQS = [
    {
      q: 'How does the charity allocation work?',
      a: 'Between 10% and 40% of your membership fee is directly allocated to your selected charity. For annual plans, your contribution is split across 12 monthly recognitions so giving happens consistently all year.',
    },
    {
      q: 'How do I qualify for the monthly draw?',
      a: 'Active members who log at least 5 Stableford scores during the cycle are automatically entered into the monthly draw. Your 5 latest scores form your ticket.',
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept all major cards and payment methods securely via Stripe.',
    },
    {
      q: 'Can I cancel my subscription anytime?',
      a: 'Yes, you can cancel at any time from your account dashboard. You will retain membership access and draw eligibility until the end of your current billing period.',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-16">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Simple & Transparent</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Join the Movement
        </h1>
        <p className="text-neutral-400 text-base sm:text-lg">
          Pick the plan that suits your game. Turn every round into charity impact and unlock monthly prize draw entries.
        </p>

        {selectedCharity && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mt-2">
            <span>Supporting partner:</span>
            <span className="text-white font-bold">{selectedCharity.name}</span>
          </div>
        )}
      </div>

      <PricingCards plans={plans || []} preselectedCharityId={charityId} />

      {/* FAQ Section */}
      <section className="glass rounded-3xl p-8 sm:p-10 space-y-8 mt-12">
        <div className="flex items-center gap-3 text-emerald-400">
          <HelpCircle size={24} />
          <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {FAQS.map((faq) => (
            <div key={faq.q} className="space-y-2">
              <h4 className="font-semibold text-white text-sm">{faq.q}</h4>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
