/**
 * CSRF origin check for state-changing auth routes (login, signout).
 *
 * Exact URL-origin equality — never a prefix match: startsWith() is bypassable
 * by an attacker-controlled host like `my-app.vercel.app.evil.com`.
 * A missing Origin header is allowed (non-browser clients; browsers always
 * send Origin on cross-origin POSTs, which is the case CSRF cares about).
 */
export function originAllowed(origin: string | null): boolean {
  if (!origin) return true
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  try {
    return new URL(origin).origin === new URL(site).origin
  } catch {
    return false
  }
}
