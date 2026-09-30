'use client'

/* ── Shared small UI primitives used across dashboard cards and details ── */

export function ExpandIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5h6 M5 2v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function CardSkeleton() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
      <div className="skeleton" style={{ height: 36, width: '55%', borderRadius: 8 }} />
      <div className="skeleton" style={{ height: 13, width: '75%', borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 11, width: '40%', borderRadius: 6 }} />
    </div>
  )
}

export function CardError({ msg = 'Data unavailable' }: { msg?: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="api-error-inline">{msg}</div>
    </div>
  )
}
