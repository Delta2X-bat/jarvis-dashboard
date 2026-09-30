'use client'

import { useState } from 'react'
import { buildSparkPath, ringColors, moodColor, kneeColor } from '@/app/dashboard/helpers'
import { READINESS, WATER_GOAL_ML } from '@/app/dashboard/types'

/* ── Health / Fitbit card detail ────────────────────────── */

export function HealthDetail() {
  const rc = ringColors(READINESS)
  return (
    <>
      <div className="detail-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="detail-eyebrow">HEALTH · FITBIT CHARGE 6</span>
          <span className="demo-badge">Demo data</span>
        </div>
        <h2 className="detail-title">Readiness {READINESS} · {rc.label.toLowerCase()}</h2>
        <p className="detail-sub">Sleep, HRV and resting heart rate all trending up vs. your 28-day baseline.</p>
      </div>
      <div className="detail-grid cols-4">
        <div className="stat-card"><span className="stat-l">Sleep</span><span className="stat-v">7:24<span className="unit">h</span></span><span className="stat-d">+42m vs avg</span></div>
        <div className="stat-card"><span className="stat-l">HRV</span><span className="stat-v">58<span className="unit">ms</span></span><span className="stat-d">+6 ms</span></div>
        <div className="stat-card"><span className="stat-l">Resting HR</span><span className="stat-v">52<span className="unit">bpm</span></span><span className="stat-d down">+1 bpm</span></div>
        <div className="stat-card"><span className="stat-l">Readiness</span><span className="stat-v">{READINESS}</span><span className="stat-d">+4 vs 7-day</span></div>
      </div>
      <div className="section-head"><span className="eyebrow">SLEEP STAGES</span><span className="eyebrow">7H 24M</span></div>
      <div className="col gap-2">
        {[['Deep','22%','linear-gradient(90deg,oklch(0.5 0.18 280),oklch(0.65 0.20 260))','1h 38m'],['REM','28%','linear-gradient(90deg,oklch(0.6 0.18 320),oklch(0.74 0.20 300))','2h 04m'],['Light','42%','linear-gradient(90deg,oklch(0.7 0.16 220),oklch(0.8 0.16 200))','3h 06m'],['Awake','8%','rgba(255,255,255,0.3)','36m']].map(([l,w,bg,v]) => (
          <div key={l} className="bar-row"><span className="bar-label">{l}</span><div className="bar-track"><div className="bar-fill" style={{ width: w, background: bg }} /></div><span className="bar-val">{v}</span></div>
        ))}
      </div>
    </>
  )
}

/* ── Mood detail ─────────────────────────────────────────── */

export function MoodDetail({ moodToday, moodHistory, onLog }: {
  moodToday: number | null
  moodHistory: { date: string; value: number }[]
  onLog: (score: number) => void
}) {
  const spark = buildSparkPath(moodHistory.map(h => h.value), 600, 100)
  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">MOOD · DAILY CHECK-IN</span>
        <h2 className="detail-title">{moodToday !== null ? `Today: ${moodToday}/10` : 'Not logged yet'}</h2>
        <p className="detail-sub">{moodToday !== null ? 'Tap any number to update your rating.' : 'Log once per day. Tap any number to set your mood.'}</p>
      </div>
      <div className="section-head"><span className="eyebrow">{moodToday !== null ? 'UPDATE' : 'LOG NOW'}</span><span className="eyebrow">1–10</span></div>
      <div className="rating-btns" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button key={n} className={`rating-btn${moodToday === n ? ' active' : ''}`}
            style={moodToday === n ? { background: moodColor(n), color: '#000', borderColor: 'transparent' } : {}}
            onClick={() => onLog(n)}>{n}</button>
        ))}
      </div>
      {moodHistory.length >= 2 && (
        <>
          <div className="section-head"><span className="eyebrow">7-DAY TREND</span><span className="eyebrow">MOOD</span></div>
          <svg viewBox="0 0 600 100" width="100%" style={{ height: 100 }}>
            <defs><linearGradient id="moodGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="oklch(0.78 0.18 165)" /><stop offset="100%" stopColor="oklch(0.78 0.18 165 / 0)" /></linearGradient></defs>
            <path d={spark.line} fill="none" stroke="oklch(0.78 0.18 165)" strokeWidth="2" strokeLinecap="round" />
            <path d={spark.fill} fill="url(#moodGrad)" opacity="0.3" />
          </svg>
          <div className="section-head"><span className="eyebrow">HISTORY</span><span className="eyebrow">SCORE</span></div>
          <div className="col">
            {[...moodHistory].reverse().slice(0, 7).map(h => (
              <div key={h.date} className="fin-row detail-fin-row">
                <span className="fin-sym">{h.date}</span>
                <span className="fin-row-val">{h.value}<span style={{ fontSize: 11, color: 'var(--ink-40)', marginLeft: 4 }}>/10</span></span>
                <span className="fin-row-pct" style={{ color: moodColor(h.value) }}>{h.value >= 8 ? 'Great' : h.value >= 6 ? 'Good' : h.value >= 4 ? 'OK' : 'Low'}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

/* ── Water detail ────────────────────────────────────────── */

export function WaterDetail({ waterMl, waterLogs, glassVol, onAdd, onDeleteEntry, onEditEntry, onChangeVol }: {
  waterMl: number
  waterLogs: { id: string; amount_ml: number }[]
  glassVol: number
  onAdd: () => void
  onDeleteEntry: (id: string) => void
  onEditEntry: (id: string, newAmount: number) => void
  onChangeVol: (ml: number) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editVal,   setEditVal]   = useState('')

  function commitEdit(id: string) {
    const n = parseInt(editVal, 10)
    if (n > 0 && n <= 5000) onEditEntry(id, n)
    setEditingId(null)
  }

  const pct    = Math.min(100, Math.round((waterMl / WATER_GOAL_ML) * 100))
  const liters = (waterMl / 1000).toFixed(2).replace(/\.?0+$/, '')
  const glassCount = glassVol > 0 ? Math.round(waterMl / glassVol) : 0
  const GLASS_PRESETS = [100, 150, 200, 250, 300, 400, 500]

  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">WATER · DAILY INTAKE</span>
        <h2 className="detail-title">{liters} L · {pct}% of goal</h2>
        <p className="detail-sub">Tap + to log a glass. Click any amount to edit it. × removes the entry.</p>
      </div>
      <div className="detail-grid cols-3">
        <div className="stat-card"><span className="stat-l">Consumed</span><span className="stat-v">{liters}<span className="unit">L</span></span><span className="stat-d">today</span></div>
        <div className="stat-card"><span className="stat-l">Remaining</span><span className="stat-v">{Math.max(0, (WATER_GOAL_ML - waterMl) / 1000).toFixed(1)}<span className="unit">L</span></span><span className="stat-d">to goal</span></div>
        <div className="stat-card"><span className="stat-l">Glasses</span><span className="stat-v">{glassCount}</span><span className="stat-d">× {glassVol} ml</span></div>
      </div>
      <div className="supp-progress" style={{ margin: '16px 0 8px' }}>
        <div className="supp-progress-label">
          <span className="supp-progress-text">Daily water intake</span>
          <span className="supp-progress-pct">{pct}%</span>
        </div>
        <div className="supp-bar-track" style={{ height: 8 }}>
          <div className="supp-bar-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, oklch(0.72 0.20 220), oklch(0.78 0.18 200))' }} />
        </div>
      </div>
      <button className="btn-ghost" style={{ fontSize: 13, padding: '10px 20px', marginTop: 4, alignSelf: 'flex-start' }} onClick={onAdd}>+ {glassVol} ml</button>

      <div className="section-head" style={{ marginTop: 18 }}><span className="eyebrow">GLASS SIZE</span><span className="eyebrow">ML</span></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {GLASS_PRESETS.map(ml => (
          <button key={ml} className="btn-ghost" onClick={() => onChangeVol(ml)}
            style={{ fontSize: 12, padding: '6px 12px', ...(glassVol === ml ? { background: 'rgba(255,255,255,0.16)', color: 'var(--ink-100)' } : {}) }}>
            {ml}
          </button>
        ))}
        <input
          type="number" min="1" max="2000"
          value={glassVol}
          onChange={e => { const n = parseInt(e.target.value, 10); if (n > 0 && n <= 2000) onChangeVol(n) }}
          style={{ width: 72, padding: '6px 8px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8,
            color: 'var(--ink-100)', fontFamily: 'var(--mono)', fontSize: 13, outline: 'none',
            textAlign: 'center' }}
        />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-40)', letterSpacing: '0.06em' }}>ml</span>
      </div>

      {waterLogs.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: 18 }}><span className="eyebrow">TODAY&apos;S ENTRIES</span></div>
          <div className="col">
            {[...waterLogs].reverse().map((l, i) => (
              <div key={l.id} className="fin-row detail-fin-row water-entry-row" style={{ alignItems: 'center' }}>
                <span className="fin-sym">Entry {waterLogs.length - i}</span>
                {editingId === l.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      autoFocus
                      type="number" min="1" max="5000"
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onBlur={() => commitEdit(l.id)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(l.id); if (e.key === 'Escape') setEditingId(null) }}
                      style={{ width: 72, padding: '4px 8px', background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8,
                        color: 'var(--ink-100)', fontFamily: 'var(--mono)', fontSize: 13, outline: 'none', textAlign: 'center' }}
                    />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-40)' }}>ml</span>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingId(l.id); setEditVal(String(l.amount_ml)) }}
                    style={{ background: 'none', border: 'none', cursor: 'text', color: 'var(--ink-100)',
                      fontFamily: 'var(--mono)', fontSize: 12, padding: '2px 6px', borderRadius: 6,
                      transition: 'background var(--t-fast)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >{l.amount_ml} ml</button>
                )}
                <button className="water-delete-btn" onClick={() => onDeleteEntry(l.id)} aria-label="Remove entry">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

/* ── Knee detail ─────────────────────────────────────────── */

export function KneeDetail({ kneeScore, kneeNote, kneeHistory, onLog, onNoteChange, onSaveNote }: {
  kneeScore: number | null
  kneeNote: string
  kneeHistory: { date: string; value: number }[]
  onLog: (score: number) => void
  onNoteChange: (note: string) => void
  onSaveNote: () => void
}) {
  const spark = buildSparkPath(kneeHistory.map(h => h.value), 600, 100)
  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">KNEE · PAIN LOG</span>
        <h2 className="detail-title">{kneeScore !== null ? `Today: ${kneeScore}/10` : 'Not logged yet'}</h2>
        <p className="detail-sub">0 = no pain, 10 = severe. Tap any number to set or update. Edit the note then tap Save.</p>
      </div>
      <div className="section-head"><span className="eyebrow">{kneeScore !== null ? 'UPDATE' : 'LOG NOW'}</span><span className="eyebrow">0–10</span></div>
      <div className="rating-btns" style={{ gridTemplateColumns: 'repeat(11, 1fr)' }}>
        {Array.from({ length: 11 }, (_, i) => i).map(n => (
          <button key={n} className={`rating-btn${kneeScore === n ? ' active' : ''}`}
            style={kneeScore === n ? { background: kneeColor(n), color: '#000', borderColor: 'transparent' } : {}}
            onClick={() => onLog(n)}>{n}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
        <input
          className="knee-note-input"
          style={{ flex: 1, margin: 0 }}
          placeholder="Optional note (what helped, what hurt…)"
          maxLength={500}
          value={kneeNote}
          onChange={e => onNoteChange(e.target.value)}
        />
        {kneeScore !== null && (
          <button className="btn-ghost" style={{ flexShrink: 0, fontSize: 11 }} onClick={onSaveNote}>Save note</button>
        )}
      </div>
      {kneeHistory.length >= 2 && (
        <>
          <div className="section-head"><span className="eyebrow">7-DAY TREND</span><span className="eyebrow">PAIN</span></div>
          <svg viewBox="0 0 600 100" width="100%" style={{ height: 100 }}>
            <defs><linearGradient id="kneeGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="oklch(0.74 0.22 25)" /><stop offset="100%" stopColor="oklch(0.74 0.22 25 / 0)" /></linearGradient></defs>
            <path d={spark.line} fill="none" stroke="oklch(0.74 0.22 25)" strokeWidth="2" strokeLinecap="round" />
            <path d={spark.fill} fill="url(#kneeGrad)" opacity="0.3" />
          </svg>
        </>
      )}
    </>
  )
}

/* ── Streak detail ───────────────────────────────────────── */

export function StreakDetail({ streaks }: { streaks: { supplements: number; mood: number; knee: number } }) {
  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">STREAKS · CONSECUTIVE DAYS</span>
        <h2 className="detail-title">{Math.max(streaks.supplements, streaks.mood, streaks.knee)} day best streak</h2>
        <p className="detail-sub">Streaks are computed from your Supabase logs. Each category tracks consecutive days with at least one entry.</p>
      </div>
      <div className="detail-grid cols-3">
        <div className="stat-card"><span className="stat-l">Supplements</span><span className="stat-v">{streaks.supplements}<span className="unit">d</span></span><span className="stat-d">{streaks.supplements > 0 ? 'Keep going' : 'Log to start'}</span></div>
        <div className="stat-card"><span className="stat-l">Knee log</span><span className="stat-v">{streaks.knee}<span className="unit">d</span></span><span className="stat-d">{streaks.knee > 0 ? 'On track' : 'Log to start'}</span></div>
        <div className="stat-card"><span className="stat-l">Mood</span><span className="stat-v">{streaks.mood}<span className="unit">d</span></span><span className="stat-d">{streaks.mood > 0 ? 'Consistent' : 'Log to start'}</span></div>
      </div>
    </>
  )
}

