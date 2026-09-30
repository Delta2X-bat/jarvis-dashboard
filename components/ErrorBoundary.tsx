'use client'
import React from 'react'
import { ErrorScreen } from '@/components/ui/ErrorScreen'

interface State { hasError: boolean }

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[JARVIS] Render error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          message="Something went wrong. Please refresh the page."
          actionLabel="Refresh"
          onAction={() => window.location.reload()}
        />
      )
    }
    return this.props.children
  }
}
