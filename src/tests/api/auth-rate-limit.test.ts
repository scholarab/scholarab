import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ALL } from '../../pages/api/auth/[...all]'

const { mockAuthHandler, mockSignInRateLimit } = vi.hoisted(() => ({
  mockAuthHandler: vi.fn(),
  mockSignInRateLimit: vi.fn(),
}))

vi.mock('../../lib/auth', () => ({
  auth: { handler: mockAuthHandler },
}))

vi.mock('../../lib/authSignInRateLimit', () => ({
  checkSignInRateLimit: mockSignInRateLimit,
}))

function signInReq(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ email: 'admin@test.com', password: 'secret' }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuthHandler.mockResolvedValue(new Response(JSON.stringify({ token: 'abc' }), { status: 200 }))
})

describe('auth handler — non-sign-in routes', () => {
  it('passes GET /api/auth/session through without rate limit check', async () => {
    const req = new Request('http://localhost/api/auth/session', { method: 'GET' })
    await ALL({ request: req, url: new URL('http://localhost/api/auth/session') } as any)
    expect(mockSignInRateLimit).not.toHaveBeenCalled()
    expect(mockAuthHandler).toHaveBeenCalledWith(req)
  })

  it('passes POST /api/auth/sign-out through without rate limit check', async () => {
    const req = new Request('http://localhost/api/auth/sign-out', { method: 'POST' })
    await ALL({ request: req, url: new URL('http://localhost/api/auth/sign-out') } as any)
    expect(mockSignInRateLimit).not.toHaveBeenCalled()
  })
})

describe('auth handler — sign-in rate limiting', () => {
  it('returns 429 when sign-in rate limit is exceeded', async () => {
    mockSignInRateLimit.mockResolvedValue(false)
    const req = signInReq({ 'x-forwarded-for': '1.2.3.4' })
    const res = await ALL({ request: req, url: new URL('http://localhost/api/auth/sign-in/email') } as any)
    expect(res.status).toBe(429)
    expect(mockAuthHandler).not.toHaveBeenCalled()
  })

  it('passes sign-in to auth handler when rate limit not exceeded', async () => {
    mockSignInRateLimit.mockResolvedValue(true)
    const req = signInReq({ 'x-forwarded-for': '1.2.3.4' })
    const res = await ALL({ request: req, url: new URL('http://localhost/api/auth/sign-in/email') } as any)
    expect(mockSignInRateLimit).toHaveBeenCalledWith('1.2.3.4')
    expect(mockAuthHandler).toHaveBeenCalled()
    expect(res.status).toBe(200)
  })

  it('uses first IP from comma-separated x-forwarded-for', async () => {
    mockSignInRateLimit.mockResolvedValue(true)
    const req = signInReq({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1, 172.16.0.1' })
    await ALL({ request: req, url: new URL('http://localhost/api/auth/sign-in/email') } as any)
    expect(mockSignInRateLimit).toHaveBeenCalledWith('1.2.3.4')
  })

  it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
    mockSignInRateLimit.mockResolvedValue(true)
    const req = signInReq({ 'x-real-ip': '5.6.7.8' })
    await ALL({ request: req, url: new URL('http://localhost/api/auth/sign-in/email') } as any)
    expect(mockSignInRateLimit).toHaveBeenCalledWith('5.6.7.8')
  })

  it('uses "unknown" when no IP headers are present', async () => {
    mockSignInRateLimit.mockResolvedValue(true)
    const req = signInReq()
    await ALL({ request: req, url: new URL('http://localhost/api/auth/sign-in/email') } as any)
    expect(mockSignInRateLimit).toHaveBeenCalledWith('unknown')
  })

  it('429 response has correct content-type', async () => {
    mockSignInRateLimit.mockResolvedValue(false)
    const req = signInReq({ 'x-forwarded-for': '9.9.9.9' })
    const res = await ALL({ request: req, url: new URL('http://localhost/api/auth/sign-in/email') } as any)
    expect(res.headers.get('content-type')).toBe('application/json')
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })
})
