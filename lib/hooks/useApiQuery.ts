'use client'
import { useState, useEffect, useCallback } from 'react'

export interface ApiQueryResult<T> {
  data:    T | null
  loading: boolean
  error:   string | null
  refetch: () => void
}

/**
 * Generic hook for fetching JSON from a local API route.
 * Handles: cancellation, HTTP error detection, error state, loading state.
 */
export function useApiQuery<T>(
  url: string,
): ApiQueryResult<T> {
  const [data,    setData]    = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetch(url, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: T & { error?: string }) => {
        if (cancelled) return
        if (typeof d.error === 'string') throw new Error(d.error)
        setData(d)
      })
      .catch(e => { if (!cancelled) setError((e as Error).message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; controller.abort() }
  }, [url, tick])

  return { data, loading, error, refetch }
}
