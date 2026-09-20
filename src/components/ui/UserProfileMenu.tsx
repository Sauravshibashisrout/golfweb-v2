'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  User,
  CreditCard,
  Shield,
  LogOut,
  ChevronDown,
} from 'lucide-react'

export type NavUser = {
  id: string
  email?: string
  displayName: string
  avatarUrl?: string | null
  role: string
}

type Props = {
  user: NavUser
  onSignOut: () => Promise<void>
}

export default function UserProfileMenu({ user, onSignOut }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    // Close on Escape key
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Get 1 or 2 uppercase initials from displayName
  const initials = user.displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || user.email?.[0]?.toUpperCase() || 'G'

  const isAdmin = user.role === 'admin'

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User profile menu"
        className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-emerald-500/20 text-emerald-300 font-bold text-xs ring-1 ring-emerald-500/30">
          {user.avatarUrl && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : initials ? (
            <span>{initials}</span>
          ) : (
            <User size={16} className="text-emerald-400" />
          )}
        </div>
        <span className="hidden sm:inline-block text-xs font-semibold text-white max-w-[120px] truncate">
          {user.displayName}
        </span>
        <ChevronDown
          size={14}
          className={`text-neutral-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Accessible Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-64 rounded-2xl glass border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* User Info Header */}
          <div className="px-3 py-2.5 border-b border-white/5 mb-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-emerald-500/20 text-emerald-300 font-bold text-sm ring-1 ring-emerald-500/30">
              {user.avatarUrl && !imageError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : initials ? (
                <span>{initials}</span>
              ) : (
                <User size={18} className="text-emerald-400" />
              )}
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
              {user.email && (
                <p className="text-[11px] text-neutral-400 truncate">{user.email}</p>
              )}
              {isAdmin && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  Admin
                </span>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-0.5">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LayoutDashboard size={15} className="text-emerald-400" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/account"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <User size={15} className="text-emerald-400" />
              <span>Profile & Settings</span>
            </Link>

            <Link
              href="/pricing"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <CreditCard size={15} className="text-emerald-400" />
              <span>Subscription & Billing</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                role="menuitem"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:text-white hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors my-1"
              >
                <Shield size={15} className="text-emerald-400" />
                <span>Admin Dashboard</span>
              </Link>
            )}
          </div>

          <div className="my-1.5 border-t border-white/5" />

          {/* Sign Out Action */}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setIsOpen(false)
              await onSignOut()
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  )
}
