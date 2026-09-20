export const metadata = {
  title: 'Terms of Service — GolfGives',
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-8 text-neutral-300">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Terms of Service</h1>
      <p className="text-sm text-neutral-500">Last updated: September 2026</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">1. Membership & Eligibility</h2>
          <p>
            GolfGives is open to individuals aged 18 and older residing in India. To participate in monthly reward draws, members must have an active subscription and have logged at least five valid Stableford scores during the cycle.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">2. Charity Allocations</h2>
          <p>
            Between 10% and 40% of membership fees are allocated to vetted charitable organizations according to member preferences. For annual subscriptions, allocations are recognized on a monthly schedule over the 12-month membership period.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">3. Draw Mechanics & Immutability</h2>
          <p>
            Monthly draws are conducted using cryptographically secure random number generators or verifiable algorithmic formulas. Once draw results are officially published, they are permanent and immutable.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">4. Score Verification & Payouts</h2>
          <p>
            Prize disbursements require submission of valid scorecard proof. Falsified scores or fraudulent submissions will result in immediate disqualification and termination of membership.
          </p>
        </section>
      </div>
    </div>
  )
}
