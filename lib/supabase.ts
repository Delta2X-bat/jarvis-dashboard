import { createBrowserClient } from '@supabase/ssr'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

// Module-level singleton so all client components share one instance and one auth listener
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)
