'use client'

import type { BitcoinData } from '@/app/dashboard/types'

export function FinanceDetail({ bitcoin }: { bitcoin: BitcoinData | null }) {
  const btcEur = bitcoin ? `€${bitcoin.price.toLocaleString('en-GB')}` : '—'
  const btcChg = bitcoin ? `${bitcoin.change24h >= 0 ? '+' : ''}${bitcoin.change24h.toFixed(2)}%` : '—'
  const isUp   = bitcoin ? bitcoin.change24h >= 0 : true
  return (
    <>
      <div className="detail-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="detail-eyebrow">PORTFOLIO · EUR</span>
          <span className="demo-badge">Demo data</span>
        </div>
        <h2 className="detail-title">€4,827.40 · +0.80% today</h2>
        <p className="detail-sub">Crypto pulling weight. VWCE softens on Euro Stoxx open.</p>
      </div>
      <div className="detail-grid cols-3">
        <div className="stat-card"><span className="stat-l">Total</span><span className="stat-v">€4,827<span className="unit">.40</span></span><span className="stat-d">+€38.20 today</span></div>
        <div className="stat-card"><span className="stat-l">30-day P/L</span><span className="stat-v">+€186</span><span className="stat-d">+4.02%</span></div>
        <div className="stat-card"><span className="stat-l">BTC</span><span className="stat-v">{btcEur}</span><span className={`stat-d${isUp ? '' : ' down'}`}>{btcChg}</span></div>
      </div>
      <div className="section-head"><span className="eyebrow">HOLDINGS</span><span className="eyebrow">24H</span></div>
      <div className="col">
        {[['VWCE','€2,940.10','down','−0.31%'],['BTC · 0.0124', bitcoin ? `€${Math.round(bitcoin.price*0.0124).toLocaleString('en-GB')}` : '€—', isUp?'':'down', btcChg],['ETH · 0.182','€504.80','','+0.42%'],['DEMO BANK SPAREN','€200.00','muted','1.50% APY']].map(([sym,val,cls,pct]) => (
          <div key={sym as string} className="fin-row detail-fin-row">
            <span className="fin-sym">{sym}</span>
            <span className="fin-row-val">{val}</span>
            <span className={`fin-row-pct${cls === 'down' ? ' down' : ''}`} style={cls === 'muted' ? { color: 'var(--ink-40)' } : {}}>{pct}</span>
          </div>
        ))}
      </div>
    </>
  )
}
