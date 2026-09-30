/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createTimeoutSignal } from '@/lib/fetchWithTimeout'

// Map user-facing category names to GNews topic slugs
const TOPIC_MAP: Record<string, string> = {
  technology: 'technology',
  finance:    'business',
  economics:  'nation',
  sports:     'sports',
  science:    'science',
}

export async function GET(request: Request) {
  // Require authenticated session
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const apiKey = process.env.GNEWS_API_KEY
  if (!apiKey) {
    console.error('[news] GNEWS_API_KEY not configured')
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const rawTopics = searchParams.get('topics') ?? 'technology'

  // Guard against excessively long input before splitting
  if (rawTopics.length > 200) {
    return NextResponse.json({ error: 'invalid topics' }, { status: 400 })
  }

  // Deduplicate and validate requested topics
  const requestedTopics = Array.from(new Set(
    rawTopics.split(',').map(t => t.trim().toLowerCase()).filter(t => TOPIC_MAP[t])
  ))

  if (requestedTopics.length === 0) return NextResponse.json({ articles: [] })

  const { signal, clear } = createTimeoutSignal(12000)

  try {
    // Fetch each topic in parallel; cache each for 4 hours to stay under GNews rate limit
    const results = await Promise.allSettled(
      requestedTopics.map(async topic => {
        const gnewsTopic = TOPIC_MAP[topic]
        const res = await fetch(
          `https://gnews.io/api/v4/top-headlines?topic=${gnewsTopic}&lang=en&max=6&apikey=${apiKey}`,
          { signal, next: { revalidate: 14400 } }
        )
        if (!res.ok) throw new Error(`GNews ${gnewsTopic} ${res.status}`)
        const d = await res.json()
        if (!d.articles) throw new Error(d.errors?.join(', ') ?? 'No articles')
        return (d.articles as any[])
          .filter(a => typeof a.url === 'string' && a.url.startsWith('https://'))
          .map(a => ({
            title:       a.title        as string,
            description: (a.description as string | null) ?? null,
            url:         a.url          as string,
            source:      (a.source?.name as string) ?? 'Unknown',
            publishedAt: a.publishedAt  as string,
            image:       (a.image       as string | null) ?? null,
            category:    topic,
          }))
      })
    )

    clear()

    const fulfilled = results.filter(r => r.status === 'fulfilled')
    if (fulfilled.length === 0) {
      console.error('[news] all topic fetches failed:', results.filter(r => r.status === 'rejected').map(r => r.reason))
      return NextResponse.json({ error: 'upstream_error' }, { status: 503 })
    }

    const articles = fulfilled.flatMap(r => (r as PromiseFulfilledResult<any[]>).value)

    return NextResponse.json({ articles })
  } catch (err) {
    clear()
    console.error('[news]', err)
    const isAbort = err instanceof Error && err.name === 'AbortError'
    return NextResponse.json({ error: isAbort ? 'timeout' : 'upstream_error' }, { status: 503 })
  }
}
