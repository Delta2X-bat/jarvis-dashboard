import { createServerSupabaseClient } from '@/lib/supabase-server'
import { originAllowed } from '@/lib/utils/csrf'
import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

export async function POST(request: NextRequest) {
  // CSRF protection — same exact-origin check as signout
  if (!originAllowed(request.headers.get('origin'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${base}/auth/callback`,
    },
  })

  // Guard against error or missing URL before redirecting
  if (error || !data?.url) {
    redirect('/?error=auth')
  }

  redirect(data.url)
}
