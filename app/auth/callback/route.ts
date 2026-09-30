import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isAllowedEmail, isGoogleUser } from '@/lib/allowedEmails'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  if (!code && !error) {
    return NextResponse.redirect(new URL('/?error=unknown_error', base))
  }

  if (error) {
    // Whitelist known error values to prevent reflected parameter injection
    const safeError = ['access_denied', 'server_error'].includes(error) ? error : 'unknown_error'
    return NextResponse.redirect(new URL(`/?error=${safeError}`, base))
  }

  if (code) {
    const supabase = await createServerSupabaseClient()
    // Handle exchangeCodeForSession error explicitly
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      return NextResponse.redirect(new URL('/?error=session_exchange_failed', base))
    }
    // Allowlist gate: proxy.ts blocks disallowed users anyway, but signing them
    // out here avoids leaving a session that would only ever bounce off 401s.
    // isGoogleUser: the allowlist trusts user.email, which is only
    // provider-verified for Google OAuth sessions (see lib/allowedEmails.ts).
    if (!isGoogleUser(data.user) || !isAllowedEmail(data.user?.email)) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/?error=access_denied', base))
    }
  }

  return NextResponse.redirect(new URL('/dashboard', base))
}
