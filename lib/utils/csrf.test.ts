import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { originAllowed } from './csrf'

describe('originAllowed', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('allows requests with no Origin header (non-browser clients)', () => {
    expect(originAllowed(null)).toBe(true)
  })

  it('falls back to http://localhost:3000 when NEXT_PUBLIC_SITE_URL is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined)
    expect(originAllowed('http://localhost:3000')).toBe(true)
    expect(originAllowed('https://jarvis.example.com')).toBe(false)
  })

  describe('with NEXT_PUBLIC_SITE_URL set', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://jarvis.example.com')
    })

    it('allows the exact site origin', () => {
      expect(originAllowed('https://jarvis.example.com')).toBe(true)
    })

    it('compares origins only, ignoring a trailing slash or path on the site URL', () => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://jarvis.example.com/')
      expect(originAllowed('https://jarvis.example.com')).toBe(true)
    })

    it('rejects a lookalike host that only shares the prefix', () => {
      expect(originAllowed('https://jarvis.example.com.evil.com')).toBe(false)
    })

    it('rejects a different scheme, port or subdomain', () => {
      expect(originAllowed('http://jarvis.example.com')).toBe(false)
      expect(originAllowed('https://jarvis.example.com:8443')).toBe(false)
      expect(originAllowed('https://evil.jarvis.example.com')).toBe(false)
    })

    it('rejects malformed origins, including the literal "null" origin', () => {
      expect(originAllowed('null')).toBe(false)
      expect(originAllowed('not a url')).toBe(false)
    })
  })
})
