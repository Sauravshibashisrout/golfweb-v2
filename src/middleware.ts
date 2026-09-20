import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require an authenticated session (any role)
const AUTH_REQUIRED = ['/dashboard', '/account', '/scores']
// Routes that require admin role
const ADMIN_REQUIRED = ['/admin']
// Routes that redirect authenticated users away
const GUEST_ONLY = ['/login', '/signup', '/forgot-password']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Always use getUser() — never trust getSession() alone for auth decisions
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Unauthenticated → redirect away from protected routes
  if (!user && AUTH_REQUIRED.some(p => path.startsWith(p))) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Admin routes — check role from profiles table
  if (ADMIN_REQUIRED.some(p => path.startsWith(p))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Authenticated users don't need guest-only pages
  if (user && GUEST_ONLY.includes(path)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
