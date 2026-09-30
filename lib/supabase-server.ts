import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

// Memoize per request so multiple server components share one client instance
export const createServerSupabaseClient = cache(async () => {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Silently ignore — expected when called from Server Components
            // where response headers are already sent
          }
        },
      },
    }
  )
})
