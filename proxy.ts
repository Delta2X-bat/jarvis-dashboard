import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAllowedEmail, isGoogleUser } from '@/lib/allowedEmails'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Being authenticated is not enough: Google OAuth signup is open, so any
  // Google account can obtain a session. ALLOWED_USER_EMAILS restricts who may
  // actually use the app (dashboard + metered API proxies). isGoogleUser
  // additionally requires the session to have authenticated via Google — the
  // allowlist trusts user.email, which is only provider-verified for Google
  // OAuth sessions (see lib/allowedEmails.ts).
  const allowed = user !== null && isGoogleUser(user) && isAllowedEmail(user.email)

  const { pathname } = request.nextUrl
  const isProtectedPage = pathname.startsWith('/dashboard')
  if (isProtectedPage && !allowed) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Defense-in-depth: every API route already checks getUser() itself and 401s,
  // except the static /api/calendar placeholder.
  // Enforcing it here too means a future route that forgets its own auth check
  // is still caught.
  const isApiRoute = pathname.startsWith('/api') && pathname !== '/api/calendar'
  if (isApiRoute && !allowed) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
