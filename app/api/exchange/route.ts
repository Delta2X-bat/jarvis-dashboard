import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createTimeoutSignal } from '@/lib/fetchWithTimeout'

// Free tier: EUR is always the base currency
export async function GET() {
  // Require authenticated session
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const apiKey = process.env.EXCHANGE_RATES_API_KEY
  if (!apiKey) {
    console.error('[exchange] EXCHANGE_RATES_API_KEY not configured')
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
  }

  const { signal, clear } = createTimeoutSignal(8000)

  try {
    // Use https to avoid transmitting API key in plaintext
    const res = await fetch(
      `https://api.exchangeratesapi.io/v1/latest?access_key=${apiKey}&symbols=PLN,USD,GBP`,
      { signal, next: { revalidate: 3600 } }
    )
    clear()

    if (!res.ok) throw new Error(`ExchangeRates ${res.status}`)
    const d = await res.json()

    if (d.error || !d.rates) {
      throw new Error(d.error?.info ?? d.message ?? 'No rates returned')
    }

    const { PLN, USD, GBP } = d.rates as Record<string, number>

    // Guard against missing symbols (free tier may not include all)
    if (!Number.isFinite(PLN) || !Number.isFinite(USD) || !Number.isFinite(GBP)) {
      throw new Error('One or more currency rates missing from response')
    }

    const r = (n: number, dp = 4) => Math.round(n * 10 ** dp) / 10 ** dp

    return NextResponse.json({
      base:        'EUR',
      eur_to_pln:  r(PLN, 4),
      pln_to_eur:  r(1 / PLN, 6),
      eur_to_usd:  r(USD, 4),
      usd_to_eur:  r(1 / USD, 6),
      eur_to_gbp:  r(GBP, 4),
      gbp_to_eur:  r(1 / GBP, 6),
      timestamp:   new Date((d.timestamp as number) * 1000).toISOString(),
    })
  } catch (err) {
    clear()
    console.error('[exchange]', err)
    const isAbort = err instanceof Error && err.name === 'AbortError'
    return NextResponse.json({ error: isAbort ? 'timeout' : 'upstream_error' }, { status: 503 })
  }
}
