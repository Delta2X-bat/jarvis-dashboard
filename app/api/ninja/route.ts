import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createTimeoutSignal } from '@/lib/fetchWithTimeout'

let cachedNinja: { quote: { text: string; author: string }; fact: string } | null = null

export async function GET() {
  // Require authenticated session
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const apiKey = process.env.NINJA_API_KEY
  if (!apiKey) {
    console.error('[ninja] NINJA_API_KEY not configured')
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
  }

  const reqHeaders = { 'X-Api-Key': apiKey }
  const { signal, clear } = createTimeoutSignal(8000)

  try {
    const [quoteRes, factRes] = await Promise.all([
      fetch('https://api.api-ninjas.com/v1/quotes',
        { signal, headers: reqHeaders, next: { revalidate: 3600 } }),
      fetch('https://api.api-ninjas.com/v1/facts?limit=1',
        { signal, headers: reqHeaders, next: { revalidate: 3600 } }),
    ])
    clear()

    if (!quoteRes.ok || !factRes.ok) {
      if (!quoteRes.ok) {
        const body = await quoteRes.text().catch(() => '')
        console.error(`[ninja] quotes ${quoteRes.status}: ${body}`)
      }
      if (!factRes.ok) {
        const body = await factRes.text().catch(() => '')
        console.error(`[ninja] facts ${factRes.status}: ${body}`)
      }
      if (cachedNinja) return NextResponse.json(cachedNinja)
      if (!quoteRes.ok && !factRes.ok) {
        return NextResponse.json({ error: 'quota_exhausted' }, { status: 503 })
      }
    }

    const [quotes, facts] = await Promise.all([
      quoteRes.ok ? quoteRes.json() : Promise.resolve([]),
      factRes.ok  ? factRes.json()  : Promise.resolve([]),
    ])

    const result = {
      quote: {
        text:   (quotes[0]?.quote  as string) ?? 'Every day is a chance to improve.',
        author: (quotes[0]?.author as string) ?? 'Unknown',
      },
      fact: (facts[0]?.fact as string) ?? 'The brain processes about 70,000 thoughts per day.',
    }
    cachedNinja = result
    return NextResponse.json(result)
  } catch (err) {
    clear()
    console.error('[ninja]', err)
    if (cachedNinja) return NextResponse.json(cachedNinja)
    const isAbort = err instanceof Error && err.name === 'AbortError'
    return NextResponse.json({ error: isAbort ? 'timeout' : 'quota_exhausted' }, { status: 503 })
  }
}
