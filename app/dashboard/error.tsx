'use client'

import { ErrorScreen } from '@/components/ui/ErrorScreen'

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorScreen
      message="Something went wrong loading the dashboard."
      actionLabel="Try again"
      onAction={reset}
    />
  )
}
