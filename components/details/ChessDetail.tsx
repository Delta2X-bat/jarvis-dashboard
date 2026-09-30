'use client'

import type { ChessData } from '@/lib/chess'
import { buildSparkPath } from '@/app/dashboard/helpers'

export function ChessDetail({ data }: { data: ChessData | null }) {
  const histPts = data?.eloHistory?.slice(-50) ?? []
  const spark   = histPts.length >= 3 ? buildSparkPath(histPts, 600, 140) : null
  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">CHESS · RAPID · CHESS.COM · MrkOxford</span>
        <h2 className="detail-title">{data?.rapidRating ?? '—'} elo{data?.peakRating ? ` · peak ${data.peakRating}` : ''}</h2>
        <p className="detail-sub">{data ? `Win rate ${data.winRate}% across ${data.totalGames.toLocaleString()} rapid games.` : 'Chess.com data unavailable.'}</p>
      </div>
      <div className="detail-grid cols-4">
        <div className="stat-card"><span className="stat-l">Current</span><span className="stat-v">{data?.rapidRating ?? '—'}</span><span className="stat-d">Rapid</span></div>
        <div className="stat-card"><span className="stat-l">Peak</span><span className="stat-v">{data?.peakRating ?? '—'}</span><span className="stat-d">All-time</span></div>
        <div className="stat-card"><span className="stat-l">Win rate</span><span className="stat-v">{data?.winRate ?? '—'}<span className="unit">%</span></span><span className="stat-d">{data?.totalGames.toLocaleString() ?? '—'} games</span></div>
        <div className="stat-card"><span className="stat-l">W / L / D</span><span className="stat-v">{data?.wins ?? '—'}<span className="unit">w</span></span><span className="stat-d">{data?.losses ?? '—'} L · {data?.draws ?? '—'} D</span></div>
      </div>
      <div className="section-head"><span className="eyebrow">ELO TREND · 3 MONTHS</span><span className="eyebrow">RATING</span></div>
      {spark ? (
        <svg viewBox="0 0 600 140" width="100%" style={{ height: 160 }}>
          <defs><linearGradient id="detailChessGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="oklch(0.80 0.18 50)" /><stop offset="100%" stopColor="oklch(0.80 0.18 50 / 0)" /></linearGradient></defs>
          <path d={spark.line} fill="none" stroke="oklch(0.80 0.18 50)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={spark.fill} fill="url(#detailChessGrad)" opacity="0.3" />
        </svg>
      ) : (
        <div className="detail-no-data">{data === null ? 'Chess.com unavailable' : 'Not enough data — play 3+ rapid games'}</div>
      )}
    </>
  )
}
