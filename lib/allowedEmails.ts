/**
 * Sign-in allowlist. ALLOWED_USER_EMAILS is a comma-separated list of Google
 * account emails permitted to use the app (server-only env var — not NEXT_PUBLIC).
 *
 * Unset/empty ⇒ allowlist disabled and any authenticated Google account is
 * accepted (pre-allowlist behaviour, avoids prod lockout before the var is set).
 * Enforced in proxy.ts (gates /dashboard and /api) and app/auth/callback
 * (signs out disallowed users right after the OAuth exchange).
 *
 * Kept dependency-free so it runs in the Edge runtime (proxy.ts).
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  const allowlist = (process.env.ALLOWED_USER_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  if (allowlist.length === 0) return true
  return !!email && allowlist.includes(email.toLowerCase())
}

/**
 * Defense-in-depth for the allowlist: confirms the session authenticated via
 * Google. isAllowedEmail() trusts `user.email`, but that address is only
 * provider-verified when sign-in actually went through Google OAuth. If the
 * Supabase project ever had another provider enabled (email/password, magic
 * link) with confirmations off, someone could mint a session carrying an
 * allowlisted email without owning the Google account. This blocks that path.
 *
 * Fail-safe by design: it only returns false when provider metadata is present
 * AND positively excludes Google. A missing/unknown app_metadata shape returns
 * true, so a legitimate Google session can never be locked out. (Supabase
 * reliably sets app_metadata.provider = 'google' and providers = ['google'] for
 * OAuth users; the fallbacks guard against future shape drift.)
 *
 * Dependency-free so it runs in the Edge runtime (proxy.ts), like isAllowedEmail.
 */
export function isGoogleUser(
  user: { app_metadata?: { provider?: string; providers?: string[] } } | null | undefined
): boolean {
  const provider  = user?.app_metadata?.provider
  const providers = user?.app_metadata?.providers
  const list = Array.isArray(providers) ? providers : []
  if (provider === undefined && list.length === 0) return true
  return provider === 'google' || list.includes('google')
}
