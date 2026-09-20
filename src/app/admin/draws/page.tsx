import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'
import CreateDrawModal from '@/components/admin/CreateDrawModal'
import { Trophy, ArrowLeft, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Manage Draws — Admin Console',
}

export default async function AdminDrawsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  const db = createAdminClient()

  // Load all draws
  const { data: draws } = await db
    .from('draws')
    .select('*')
    .order('cycle_month', { ascending: false })

  // Load cashPrizeDrawEnabled
  const { data: setting } = await db
    .from('app_settings')
    .select('value')
    .eq('key', 'cashPrizeDrawEnabled')
    .single()
  const cashEnabled = setting?.value === true

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft size={14} /> Back to Console
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Draw Management</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Create, lock, simulate, and publish monthly prize draws.
            </p>
          </div>
          <CreateDrawModal cashEnabled={cashEnabled} />
        </div>
      </div>

      <div className="glass rounded-3xl p-6 sm:p-8 space-y-4">
        {draws && draws.length > 0 ? (
          <div className="divide-y divide-white/5">
            {draws.map((d) => (
              <div key={d.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-500 uppercase">{d.cycle_month}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/5 text-neutral-300">
                      {d.mode}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        d.status === 'published'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : d.status === 'locked'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-white/5 text-neutral-400'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{d.title}</h3>
                  <p className="text-xs text-neutral-400">
                    Reward Pool: <span className="text-white font-semibold">₹{(d.reward_pool_paise / 100).toLocaleString('en-IN')}</span>
                    {d.drawn_numbers && (
                      <> · Numbers: <span className="text-emerald-400 font-mono font-bold">{d.drawn_numbers.join(', ')}</span></>
                    )}
                  </p>
                </div>

                <Link
                  href={`/admin/draws/${d.id}`}
                  className="inline-flex items-center gap-1 text-xs px-4 py-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold transition-colors shrink-0"
                >
                  Manage Draw <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500 text-sm">
            No draws created yet. Click "Create Draw" to start a new cycle.
          </div>
        )}
      </div>
    </div>
  )
}
