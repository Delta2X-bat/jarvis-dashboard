'use client'

import { useNews } from '@/lib/hooks/useNews'
import { useExchange } from '@/lib/hooks/useExchange'
import { useNinja } from '@/lib/hooks/useNinja'
import { timeAgo } from '@/app/dashboard/helpers'
import { CardSkeleton, CardError } from '@/components/ui/DashboardPrimitives'

export function NewsDetail({ newsData, newsLoading, newsError }: {
  newsData: ReturnType<typeof useNews>['data']
  newsLoading: boolean
  newsError: string | null
}) {
  if (newsLoading) return <div style={{ padding: '40px 0' }}><CardSkeleton /></div>
  if (newsError) return <CardError msg={`News error: ${newsError}`} />
  if (!newsData) return <CardError />
  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">TECH NEWS · GNEWS</span>
        <h2 className="detail-title">{newsData.articles.length} articles</h2>
        <p className="detail-sub">Latest technology news. Click any headline to open the full article.</p>
      </div>
      <div className="col" style={{ gap: 0 }}>
        {newsData.articles.map((a) => (
          <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className="news-detail-item">
            <div className="news-detail-meta">
              <span className="news-detail-source">{a.source}</span>
              <span className="news-detail-time">{timeAgo(a.publishedAt)}</span>
            </div>
            <div className="news-detail-title">{a.title}</div>
            {a.description && <div className="news-detail-desc">{a.description}</div>}
          </a>
        ))}
      </div>
    </>
  )
}

export function ExchangeDetail({ exData, exLoading, exError }: {
  exData: ReturnType<typeof useExchange>['data']
  exLoading: boolean
  exError: string | null
}) {
  if (exLoading) return <div style={{ padding: '40px 0' }}><CardSkeleton /></div>
  if (exError) return <CardError msg={`Exchange error: ${exError}`} />
  if (!exData) return <CardError />
  const pairs = [
    { label: 'EUR → PLN', rate: exData.eur_to_pln, sub: `1 PLN = ${exData.pln_to_eur.toFixed(4)} EUR` },
    { label: 'EUR → USD', rate: exData.eur_to_usd, sub: `1 USD = ${exData.usd_to_eur.toFixed(4)} EUR` },
    { label: 'EUR → GBP', rate: exData.eur_to_gbp, sub: `1 GBP = ${exData.gbp_to_eur.toFixed(4)} EUR` },
  ]
  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">EXCHANGE RATES · EUR BASE</span>
        <h2 className="detail-title">Live rates</h2>
        <p className="detail-sub">Updated hourly from exchangeratesapi.io. Base currency: Euro.</p>
      </div>
      <div className="detail-grid cols-3">
        {pairs.map(p => (
          <div key={p.label} className="stat-card">
            <span className="stat-l">{p.label}</span>
            <span className="stat-v" style={{ fontSize: 22 }}>{p.rate.toFixed(4)}</span>
            <span className="stat-d" style={{ color: 'var(--ink-40)', fontSize: 10 }}>{p.sub}</span>
          </div>
        ))}
      </div>
    </>
  )
}

export function QuoteDetail({ ninjaData, ninjaLoading }: {
  ninjaData: ReturnType<typeof useNinja>['data']
  ninjaLoading: boolean
}) {
  if (ninjaLoading) return <div style={{ padding: '40px 0' }}><CardSkeleton /></div>
  if (!ninjaData) return (
    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, fontStyle: 'italic', padding: '40px 0', textAlign: 'center' }}>
      Quote unavailable
    </p>
  )
  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">DAILY INSPIRATION</span>
        <h2 className="detail-title">Quote &amp; Fact</h2>
        <p className="detail-sub">Fresh content every load from API Ninjas.</p>
      </div>
      <div className="stat-card" style={{ marginBottom: 16 }}>
        <span className="stat-l">Quote</span>
        <p style={{ fontSize: 18, color: 'var(--ink-100)', lineHeight: 1.5, margin: '8px 0 4px', fontStyle: 'italic' }}>&ldquo;{ninjaData.quote.text}&rdquo;</p>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-40)', letterSpacing: '0.06em' }}>— {ninjaData.quote.author}</span>
      </div>
      <div className="stat-card">
        <span className="stat-l">Random Fact</span>
        <p style={{ fontSize: 14, color: 'var(--ink-80)', lineHeight: 1.5, marginTop: 8 }}>{ninjaData.fact}</p>
      </div>
    </>
  )
}
