'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Menu,
  X,
  LayoutDashboard,
  User as UserIcon,
  CreditCard,
  Shield,
  LogOut,
} from 'lucide-react'
import UserProfileMenu, { type NavUser } from './UserProfileMenu'

const NAV = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/charities', label: 'Charities' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/rewards', label: 'Rewards' },
]

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<NavUser | null>(null)
  const [loading, setLoading] = useState(true)
  const path = usePathname()
  const router = useRouter()

  const syncUserSession = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setUser(null)
        setLoading(false)
        return
      }

      const authUser = session.user

      // Query profile for role and custom display_name/avatar
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, role, avatar_path')
        .eq('id', authUser.id)
        .maybeSingle()

      const displayName =
        profile?.display_name ||
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.display_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split('@')[0] ||
        'Golfer'

      const avatarUrl =
        profile?.avatar_path ||
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        null

      const role = profile?.role || 'subscriber'

      setUser({
        id: authUser.id,
        email: authUser.email,
        displayName,
        avatarUrl,
        role,
      })
    } catch (err) {
      console.error('Failed to sync user session in Nav:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    syncUserSession()

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await syncUserSession()
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [syncUserSession])

  async function handleSignOut() {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error signing out:', err)
    } finally {
      setUser(null)
      setOpen(false)
      router.push('/login')
      router.refresh()
    }
  }

  // Get 1 or 2 uppercase initials for mobile header
  const initials = user
    ? user.displayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || user.email?.[0]?.toUpperCase() || 'G'
    : ''

  const isAdmin = user?.role === 'admin'

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-neutral-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white">
          <span className="text-emerald-400 text-xl">⛳</span>
          <span className="tracking-tight font-bold">GolfGives</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm transition-colors ${
                path.startsWith(l.href)
                  ? 'text-white font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth Section */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="w-24 h-9 rounded-full bg-white/5 animate-pulse" />
          ) : user ? (
            <UserProfileMenu user={user} onSignOut={handleSignOut} />
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="text-sm bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold px-4 py-2 rounded-full transition-colors shadow-sm"
              >
                Join now
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
          ) : user ? (
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-emerald-500/20 text-emerald-300 font-bold text-xs ring-1 ring-emerald-500/30">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
          ) : null}

          <button
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {open && (
        <div className="md:hidden border-t border-white/5 bg-neutral-950 px-4 py-5 space-y-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
          {/* Mobile User Profile Section */}
          {user && (
            <div className="p-3.5 rounded-2xl glass border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-emerald-500/20 text-emerald-300 font-bold text-sm ring-1 ring-emerald-500/30">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="overflow-hidden min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
                  {user.email && (
                    <p className="text-[11px] text-neutral-400 truncate">{user.email}</p>
                  )}
                  {isAdmin && (
                    <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                      Admin
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-xs">
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium"
                >
                  <LayoutDashboard size={14} className="text-emerald-400" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium"
                >
                  <UserIcon size={14} className="text-emerald-400" />
                  <span>Settings</span>
                </Link>
              </div>

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-xs font-semibold"
                >
                  <Shield size={14} className="text-emerald-400" />
                  <span>Admin Console</span>
                </Link>
              )}
            </div>
          )}

          {/* Standard Navigation Links */}
          <div className="space-y-1">
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                  path.startsWith(l.href)
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <hr className="border-white/10" />

          {/* Mobile Auth Actions */}
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition-colors"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="w-full py-2.5 rounded-xl border border-white/10 text-center text-sm font-semibold text-white hover:bg-white/5 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-center text-sm transition-colors shadow-sm"
              >
                Join now
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
