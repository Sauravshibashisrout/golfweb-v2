import Link from 'next/link'

const COLS = [
  {
    title: 'Platform',
    links: [['How It Works', '/how-it-works'], ['Pricing', '/pricing'], ['Charities', '/charities'], ['Rewards', '/rewards']],
  },
  {
    title: 'Account',
    links: [['Sign In', '/login'], ['Sign Up', '/signup'], ['Dashboard', '/dashboard']],
  },
  {
    title: 'Legal',
    links: [['Privacy Policy', '/privacy'], ['Terms of Service', '/terms'], ['Responsible Play', '/responsible-play']],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-neutral-950 mt-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 font-semibold text-white mb-3">
            <span className="text-green-400">⛳</span> GolfGives
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-[200px]">
            A membership that turns every real round of golf into charity impact.
          </p>
        </div>
        {COLS.map(col => (
          <div key={col.title}>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">{col.title}</p>
            <ul className="space-y-2">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-neutral-500 hover:text-white transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5 px-4 sm:px-6 py-4 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-neutral-600">© {new Date().getFullYear()} GolfGives. All rights reserved.</p>
        <p className="text-xs text-neutral-600">Payments secured by Stripe · Registered in India</p>
      </div>
    </footer>
  )
}
