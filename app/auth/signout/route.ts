import { createServerSupabaseClient } from '@/lib/supabase-server'
import { originAllowed } from '@/lib/utils/csrf'
import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

export async function POST(request: NextRequest) {
  // CSRF protection — exact origin match (see lib/utils/csrf.ts)
  if (!originAllowed(request.headers.get('origin'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('[signout]', error)
  }
  redirect('/')
}
