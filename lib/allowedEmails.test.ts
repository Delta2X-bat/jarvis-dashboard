import { describe, it, expect, afterEach, vi } from 'vitest'
import { isAllowedEmail, isGoogleUser } from './allowedEmails'

describe('isAllowedEmail', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('allows everyone when ALLOWED_USER_EMAILS is unset or blank', () => {
    vi.stubEnv('ALLOWED_USER_EMAILS', undefined)
    expect(isAllowedEmail('anyone@example.com')).toBe(true)
    vi.stubEnv('ALLOWED_USER_EMAILS', ' , ')
    expect(isAllowedEmail('anyone@example.com')).toBe(true)
  })

  it('matches listed emails case-insensitively, ignoring surrounding whitespace', () => {
    vi.stubEnv('ALLOWED_USER_EMAILS', ' Alice@Example.com , bob@example.com ')
    expect(isAllowedEmail('alice@example.com')).toBe(true)
    expect(isAllowedEmail('BOB@EXAMPLE.COM')).toBe(true)
  })

  it('rejects unlisted, partial and missing emails once the allowlist is set', () => {
    vi.stubEnv('ALLOWED_USER_EMAILS', 'alice@example.com')
    expect(isAllowedEmail('eve@example.com')).toBe(false)
    expect(isAllowedEmail('lice@example.com')).toBe(false)
    expect(isAllowedEmail('alice@example.com.evil.com')).toBe(false)
    expect(isAllowedEmail(null)).toBe(false)
    expect(isAllowedEmail(undefined)).toBe(false)
    expect(isAllowedEmail('')).toBe(false)
  })
})

describe('isGoogleUser', () => {
  it('accepts sessions whose provider is Google', () => {
    expect(isGoogleUser({ app_metadata: { provider: 'google', providers: ['google'] } })).toBe(true)
  })

  it('accepts a Google identity linked to another primary provider', () => {
    expect(isGoogleUser({ app_metadata: { provider: 'email', providers: ['email', 'google'] } })).toBe(true)
  })

  it('rejects sessions whose metadata positively excludes Google', () => {
    expect(isGoogleUser({ app_metadata: { provider: 'email', providers: ['email'] } })).toBe(false)
    expect(isGoogleUser({ app_metadata: { provider: 'github' } })).toBe(false)
    expect(isGoogleUser({ app_metadata: { providers: ['email'] } })).toBe(false)
  })

  it('fails safe (allows) when provider metadata is absent', () => {
    // Callers check for a signed-in user separately; this only guards against
    // metadata shape drift locking out a legitimate Google session.
    expect(isGoogleUser({ app_metadata: {} })).toBe(true)
    expect(isGoogleUser({})).toBe(true)
    expect(isGoogleUser(null)).toBe(true)
    expect(isGoogleUser(undefined)).toBe(true)
  })
})
