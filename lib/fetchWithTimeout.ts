/**
 * Returns an AbortSignal that fires after `ms` milliseconds, and a `clear`
 * function to cancel the timer (call this as soon as all fetches complete).
 * Shared across multiple fetch() calls so all in-flight requests abort together.
 */
export function createTimeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  if (ms <= 0) throw new RangeError('createTimeoutSignal: ms must be positive')
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  return { signal: ctrl.signal, clear: () => clearTimeout(timer) }
}
