export const metadata = {
  title: 'Privacy Policy — GolfGives',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-8 text-neutral-300">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-neutral-500">Last updated: September 2026</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">1. Information We Collect</h2>
          <p>
            When you register on GolfGives, we collect your email address, display name, and optional phone number. We also collect the golf scores you submit (Stableford scores, dates, and course details) and your charity preference selections.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">2. Payment & Financial Data</h2>
          <p>
            All payment transactions are processed through our payment gateway partners (Razorpay and Stripe). GolfGives does not store full credit card numbers, debit card details, or UPI PINs on our servers. We only store transaction IDs, subscription statuses, and integer paise amounts for audit and recognition purposes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">3. Winner Privacy & Public Visibility</h2>
          <p>
            Draw winners have full control over their public visibility. By default, your display name is kept private unless you enable the "Public Winner Name" toggle in your account profile.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">4. Scorecard Verification Documents</h2>
          <p>
            When you upload proof of your golf scores for winner verification, your files are stored in a private, encrypted storage bucket accessible only via time-limited signed URLs by authorized administrators.
          </p>
        </section>
      </div>
    </div>
  )
}
