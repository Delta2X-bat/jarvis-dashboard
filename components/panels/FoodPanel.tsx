'use client'

import { useState } from 'react'

export const CALORIE_GOAL = 2400
export const PROTEIN_GOAL = 180

/* matches FoodLog in DashboardClient — structural typing keeps them compatible */
interface FoodLog {
  id:        string
  meal_name: string
  calories:  number
  protein_g: number
  carbs_g:   number
  fat_g:     number
}

export function FoodPanel({ foodLogs, onAdd, onEdit, onDelete }: {
  foodLogs: FoodLog[]
  onAdd:    (entry: Omit<FoodLog, 'id'>) => void
  onEdit:   (id: string, entry: Omit<FoodLog, 'id'>) => void
  onDelete: (id: string) => void
}) {
  const empty = { meal_name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' }
  const [form, setForm]           = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)

  const totals = foodLogs.reduce(
    (acc, f) => ({
      calories:  acc.calories  + f.calories,
      protein_g: acc.protein_g + f.protein_g,
      carbs_g:   acc.carbs_g   + f.carbs_g,
      fat_g:     acc.fat_g     + f.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )

  const kcalPct    = Math.min(100, Math.round((totals.calories  / CALORIE_GOAL) * 100))
  const proteinPct = Math.min(100, Math.round((totals.protein_g / PROTEIN_GOAL) * 100))

  function submit() {
    const name = form.meal_name.trim()
    if (!name || name.length > 200) return
    const entry = {
      meal_name: name,
      calories:  Math.max(0, parseInt(form.calories, 10)  || 0),
      protein_g: Math.max(0, parseFloat(form.protein_g)   || 0),
      carbs_g:   Math.max(0, parseFloat(form.carbs_g)     || 0),
      fat_g:     Math.max(0, parseFloat(form.fat_g)       || 0),
    }
    if (editingId) { onEdit(editingId, entry); setEditingId(null) }
    else onAdd(entry)
    setForm(empty)
  }

  function startEdit(f: FoodLog) {
    setEditingId(f.id)
    setForm({
      meal_name: f.meal_name,
      calories:  String(f.calories),
      protein_g: String(f.protein_g),
      carbs_g:   String(f.carbs_g),
      fat_g:     String(f.fat_g),
    })
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 10px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8,
    color: 'var(--ink-100)', fontFamily: 'var(--mono)', fontSize: 13, outline: 'none',
  }

  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">FOOD · CALORIES &amp; MACROS · TODAY</span>
        <h2 className="detail-title">{totals.calories} / {CALORIE_GOAL} kcal</h2>
        <p className="detail-sub">{foodLogs.length} {foodLogs.length === 1 ? 'entry' : 'entries'} logged today. Add, edit or remove any meal — everything saves instantly.</p>
      </div>

      <div className="detail-grid cols-4">
        <div className="stat-card"><span className="stat-l">Calories</span><span className="stat-v">{totals.calories}<span className="unit">kcal</span></span><span className="stat-d">of {CALORIE_GOAL}</span></div>
        <div className="stat-card"><span className="stat-l">Protein</span><span className="stat-v">{totals.protein_g.toFixed(0)}<span className="unit">g</span></span><span className="stat-d">of {PROTEIN_GOAL}</span></div>
        <div className="stat-card"><span className="stat-l">Carbs</span><span className="stat-v">{totals.carbs_g.toFixed(0)}<span className="unit">g</span></span><span className="stat-d">total</span></div>
        <div className="stat-card"><span className="stat-l">Fat</span><span className="stat-v">{totals.fat_g.toFixed(0)}<span className="unit">g</span></span><span className="stat-d">total</span></div>
      </div>

      <div className="supp-progress" style={{ margin: '18px 0 8px' }}>
        <div className="supp-progress-label"><span className="supp-progress-text">Calories · {CALORIE_GOAL} kcal goal</span><span className="supp-progress-pct">{kcalPct}%</span></div>
        <div className="supp-bar-track" style={{ height: 8 }}>
          <div className="supp-bar-fill" style={{ width: `${kcalPct}%`, background: 'linear-gradient(90deg, oklch(0.78 0.18 55), oklch(0.80 0.20 35))' }} />
        </div>
      </div>
      <div className="supp-progress" style={{ margin: '0 0 8px' }}>
        <div className="supp-progress-label"><span className="supp-progress-text">Protein · {PROTEIN_GOAL} g goal</span><span className="supp-progress-pct">{proteinPct}%</span></div>
        <div className="supp-bar-track" style={{ height: 8 }}>
          <div className="supp-bar-fill" style={{ width: `${proteinPct}%`, background: 'linear-gradient(90deg, oklch(0.72 0.20 145), oklch(0.78 0.18 165))' }} />
        </div>
      </div>

      <div className="section-head" style={{ marginTop: 18 }}>
        <span className="eyebrow">{editingId ? 'EDIT ENTRY' : 'ADD ENTRY'}</span>
        <span className="eyebrow">MEAL · KCAL · P / C / F</span>
      </div>
      <div className="food-form">
        <input style={{ ...inputStyle, gridColumn: '1 / span 2' }} placeholder="Meal name (e.g. Chicken & rice)"
          maxLength={200}
          value={form.meal_name} onChange={e => setForm(f => ({ ...f, meal_name: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') submit() }} />
        <input style={inputStyle} type="number" min="0" placeholder="kcal"
          value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') submit() }} />
        <input style={inputStyle} type="number" min="0" placeholder="protein g"
          value={form.protein_g} onChange={e => setForm(f => ({ ...f, protein_g: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') submit() }} />
        <input style={inputStyle} type="number" min="0" placeholder="carbs g"
          value={form.carbs_g} onChange={e => setForm(f => ({ ...f, carbs_g: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') submit() }} />
        <input style={inputStyle} type="number" min="0" placeholder="fat g"
          value={form.fat_g} onChange={e => setForm(f => ({ ...f, fat_g: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') submit() }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn-ghost" onClick={submit}>{editingId ? 'Save changes' : '+ Add meal'}</button>
        {editingId && <button className="btn-ghost" style={{ color: 'var(--ink-40)' }} onClick={() => { setEditingId(null); setForm(empty) }}>Cancel</button>}
      </div>

      {foodLogs.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: 20 }}><span className="eyebrow">TODAY&apos;S MEALS</span><span className="eyebrow">EDIT / REMOVE</span></div>
          <div className="col">
            {foodLogs.map(f => (
              <div key={f.id} className="fin-row detail-fin-row" style={{ alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="supp-name" style={{ fontSize: 14 }}>{f.meal_name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-40)', letterSpacing: '0.04em', marginTop: 2 }}>
                    {f.calories} kcal · P {f.protein_g}g · C {f.carbs_g}g · F {f.fat_g}g
                  </div>
                </div>
                <button className="btn-ghost" style={{ fontSize: 10, padding: '6px 10px' }} onClick={() => startEdit(f)}>Edit</button>
                <button onClick={() => onDelete(f.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-40)', fontSize: 18, lineHeight: 1, padding: '0 4px', borderRadius: 4, transition: 'color var(--t-fast)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'oklch(0.74 0.22 25)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-40)')}>×</button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
