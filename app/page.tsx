import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isAllowedEmail, isGoogleUser } from '@/lib/allowedEmails'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Same predicate as proxy.ts — a signed-in but disallowed user must see the
  // login page, not be redirected to /dashboard (the proxy would bounce them
  // straight back here, an infinite redirect loop).
  if (user && isGoogleUser(user) && isAllowedEmail(user.email)) {
    redirect('/dashboard')
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      background: '#050847',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(175deg, #150e8f 0%, #080a6e 30%, #050847 55%, #000e66 85%, #071a74 100%)' }} />
        <div style={{ position: 'absolute', top: '5%', left: '-15%', width: '65vw', height: '65vw', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(74,47,202,0.9) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(6,32,168,0.85) 0%, transparent 70%)', filter: 'blur(35px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '20%', width: '70vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(2,35,128,0.8) 0%, transparent 75%)', filter: 'blur(45px)' }} />
      </div>

      <div style={{
        position: 'relative', zIndex: 10, textAlign: 'center',
        padding: '52px 44px', borderRadius: '26px', minWidth: '320px', overflow: 'hidden',
        background: 'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(50px) saturate(1.8) brightness(1.15)',
        WebkitBackdropFilter: 'blur(50px) saturate(1.8) brightness(1.15)',
        border: '1px solid rgba(255,255,255,0.25)',
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), 0 32px 64px rgba(0,0,20,0.5)',
      }}>
        <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9) 50%, transparent)', pointerEvents: 'none' }} />

        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.92)', margin: '0 0 6px' }}>JARVIS</h1>
        <p style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 44px' }}>Personal Intelligence System</p>

        <form action="/auth/login" method="POST">
          <button type="submit" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', padding: '13px 22px', borderRadius: '50px',
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
            color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  )
}