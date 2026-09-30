'use client'

/** Shared full-screen error UI used by both boundaries (route error.tsx + class ErrorBoundary). */
export function ErrorScreen({ message, actionLabel, onAction }: {
  message: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      background: 'oklch(0.10 0.02 250)',
      color: 'oklch(0.75 0.01 250)',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <p style={{ margin: 0, fontSize: 15 }}>{message}</p>
      <button
        onClick={onAction}
        style={{
          background: 'none',
          border: '1px solid oklch(0.35 0.02 250)',
          borderRadius: 8,
          padding: '8px 20px',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        {actionLabel}
      </button>
    </div>
  )
}
