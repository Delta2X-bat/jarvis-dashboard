'use client'

import { useState } from 'react'

/* ── Supplement types & constants ────────────────────────── */
export interface SuppItem   { id: string; name: string }
export interface SuppWindow { id: string; label: string; timeLabel: string; start: number; end: number; items: SuppItem[] }

export const SUPP_WINDOWS: SuppWindow[] = [
  { id: 'morning',     label: 'Morning',      timeLabel: '07:00–10:00', start: 7*60,  end: 10*60, items: [{ id: 'vitd3k2', name: 'Vitamin D3 5000IU + K2' },{ id: 'zinc', name: 'Zinc 15–25mg' },{ id: 'omega3', name: 'Omega-3 2–3g' },{ id: 'lions', name: "Lion's Mane 500–1000mg" }] },
  { id: 'postworkout', label: 'Post-workout', timeLabel: '12:00–14:00', start: 12*60, end: 14*60, items: [{ id: 'whey', name: 'Whey protein 30–40g' },{ id: 'creatine', name: 'Creatine 5g' }] },
  { id: 'dinner',      label: 'Dinner',       timeLabel: '18:00–20:00', start: 18*60, end: 20*60, items: [{ id: 'calcium', name: 'Calcium 500mg' },{ id: 'ashwa', name: 'Ashwagandha KSM-66 300–600mg' },{ id: 'collagen', name: 'Collagen 10–15g + Vit C' }] },
  { id: 'bedtime',     label: 'Before bed',   timeLabel: '21:00–23:00', start: 21*60, end: 23*60, items: [{ id: 'mag', name: 'Magnesium glycinate 400mg + B6 P-5-P 25mg' }] },
]

export function getWindowState(mod: number, windows: SuppWindow[]) {
  if (windows.length === 0) return { type: 'tomorrow' as const, window: SUPP_WINDOWS[0], minsUntil: 0 }
  for (const w of windows) {
    if (mod >= w.start && mod < w.end) return { type: 'active' as const, window: w }
  }
  for (const w of windows) {
    if (w.start > mod) return { type: 'next' as const, window: w, minsUntil: w.start - mod }
  }
  // "Tomorrow" targets the earliest window by start time — not array index 0,
  // which may not be the chronologically-first window if the list is reordered.
  const first = windows.reduce((a, b) => (b.start < a.start ? b : a))
  return { type: 'tomorrow' as const, window: first, minsUntil: 24*60 - mod + first.start }
}

export function SupplementPanel({ checked, onToggle, minuteOfDay, suppLoggedToday, onLogComplete, onUnlog, suppWindows, onSuppWindowsChange }: {
  checked: Set<string>
  onToggle: (id: string) => void
  minuteOfDay: number
  suppLoggedToday: boolean
  onLogComplete: () => void
  onUnlog: () => void
  suppWindows: SuppWindow[]
  onSuppWindowsChange: (windows: SuppWindow[]) => void
}) {
  const [editing, setEditing]         = useState(false)
  const [draft, setDraft]             = useState<SuppWindow[]>([])
  const [newName, setNewName]         = useState('')
  const [newWindowId, setNewWindowId] = useState('')

  const totalItems = suppWindows.reduce((s, w) => s + w.items.length, 0)

  function startEdit() {
    setDraft(suppWindows.map(w => ({ ...w, items: [...w.items] })))
    setNewWindowId(suppWindows[0]?.id ?? '')
    setEditing(true)
  }

  function deleteItem(windowId: string, itemId: string) {
    setDraft(prev => prev.map(w => w.id === windowId ? { ...w, items: w.items.filter(i => i.id !== itemId) } : w))
  }

  function addItem() {
    const name = newName.trim()
    if (!name) return
    const id = name.toLowerCase().replace(/\W+/g, '_') + '_' + Date.now()
    setDraft(prev => prev.map(w => w.id === newWindowId ? { ...w, items: [...w.items, { id, name }] } : w))
    setNewName('')
  }

  function save() {
    onSuppWindowsChange(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <>
        <div className="detail-head">
          <span className="detail-eyebrow">SUPPLEMENTS · EDIT LIST</span>
          <h2 className="detail-title">Edit supplement list</h2>
          <p className="detail-sub">Remove supplements with ✕ or add new ones to a window below.</p>
        </div>
        {draft.map(w => (
          <div key={w.id} className="supp-detail-window">
            <div className="supp-detail-window-header">
              <span className="supp-detail-window-name">{w.label}</span>
              <span className="supp-detail-window-time">{w.timeLabel}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {w.items.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink-40)', fontStyle: 'italic', padding: '2px 0' }}>No supplements</div>
              )}
              {w.items.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{item.name}</span>
                  <button className="btn-ghost" style={{ color: 'var(--ink-40)', fontSize: 11, padding: '2px 8px' }} onClick={() => deleteItem(w.id, item.id)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={newWindowId}
            onChange={e => setNewWindowId(e.target.value)}
            style={{ background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'inherit' }}
          >
            {draft.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
          <input
            type="text"
            placeholder="Supplement name…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            style={{ flex: 1, minWidth: 120, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'inherit' }}
          />
          <button className="btn-ghost" onClick={addItem}>Add</button>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn-ghost" style={{ color: 'oklch(0.80 0.18 165)' }} onClick={save}>Save</button>
          <button className="btn-ghost" style={{ color: 'var(--ink-40)', fontSize: 11 }} onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">SUPPLEMENTS · TODAY</span>
        <h2 className="detail-title">{checked.size} / {totalItems} taken</h2>
        <p className="detail-sub">Four daily windows. Check off as you take each supplement. Toggle to undo a mistake.</p>
      </div>
      {suppWindows.map(w => {
        const isActive = minuteOfDay >= w.start && minuteOfDay < w.end
        const isDone   = w.end <= minuteOfDay
        return (
          <div key={w.id} className={`supp-detail-window${isActive ? ' active' : isDone ? ' done-window' : ''}`}>
            <div className="supp-detail-window-header">
              <span className="supp-detail-window-name">{w.label}</span>
              <span className="supp-detail-window-time">{w.timeLabel}</span>
              {isActive && <span className="now-badge">ACTIVE</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {w.items.map(item => (
                <div key={item.id} className={`supp-item${checked.has(item.id) ? ' done' : ''}`} onClick={() => onToggle(item.id)} style={{ cursor: 'pointer', borderRadius: 8, padding: '6px 8px', margin: '0 -8px' }}>
                  <span className="supp-check">{checked.has(item.id) ? '✓' : ''}</span>
                  <span className="supp-name">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
      <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {suppLoggedToday ? (
          <>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', color: 'oklch(0.80 0.18 165)', textTransform: 'uppercase' }}>Day logged ✓</div>
            <button className="btn-ghost" style={{ color: 'var(--ink-40)', fontSize: 11 }} onClick={onUnlog}>Undo log</button>
          </>
        ) : (
          <button className="btn-ghost" onClick={onLogComplete}>Mark today&apos;s supplements complete</button>
        )}
        <button className="btn-ghost" style={{ marginLeft: 'auto', color: 'var(--ink-40)', fontSize: 11 }} onClick={startEdit}>Edit list</button>
      </div>
    </>
  )
}
