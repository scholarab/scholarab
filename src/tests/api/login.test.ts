import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockHit, mockCheckPassword, mockDelete, mockWhere } = vi.hoisted(() => ({
  mockHit: vi.fn(),
  mockCheckPassword: vi.fn(),
  mockWhere: vi.fn(() => ({ catch: () => Promise.resolve() })),
  mockDelete: vi.fn(),
}))

vi.mock('../../lib/rate-limit', () => ({
  getClientIp: () => '203.0.113.9',
  hitRateLimit: mockHit,
  // The route clears the counter by the same hashed key hitRateLimit stores
  // under, so the mock has to hash too; an identity stub here would let a
  // real mismatch between the two sides pass this test.
  hashKeyIdentifier: (key: string) => Promise.resolve(`hashed(${key})`),
}))
vi.mock('../../lib/adminAuth', () => ({
  SESSION_COOKIE: 'admin_session',
  SESSION_TTL_MS: 8 * 60 * 60 * 1000,
  checkAdminPassword: mockCheckPassword,
  createSessionCookie: () => Promise.resolve('cookie-value'),
}))
vi.mock('../../lib/db/client', () => ({
  getDb: () => ({ delete: () => { mockDelete(); return { where: mockWhere } } }),
}))

const { POST } = await import('../../pages/admin/api/login')

function req(password = 'guess') {
  return new Request('http://localhost/admin/api/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockHit.mockResolvedValue(false)
  mockCheckPassword.mockResolvedValue(false)
})

describe('POST /admin/api/login', () => {
  it('counts the attempt against both the per-IP and the global cap', async () => {
    await POST({ request: req() } as never)
    expect(mockHit.mock.calls.map(c => c[0])).toEqual(['login:203.0.113.9', 'login:global'])
    // Every attempt is counted before the password is ever checked.
    expect(mockHit).toHaveBeenCalledBefore(mockCheckPassword)
  })

  it('rejects once the per-IP cap is spent, without spending the shared one', async () => {
    mockHit.mockResolvedValueOnce(true)
    const res = await POST({ request: req() } as never)
    expect(res.status).toBe(429)
    expect(mockHit).toHaveBeenCalledTimes(1)
    expect(mockCheckPassword).not.toHaveBeenCalled()
  })

  it('rejects a distributed attempt once the global cap is spent', async () => {
    // A fresh IP; its own counter is nowhere near the limit.
    mockHit.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const res = await POST({ request: req() } as never)
    expect(res.status).toBe(429)
    // The point of the cap: the password is never checked for guess 61.
    expect(mockCheckPassword).not.toHaveBeenCalled()
  })

  it('refuses logins rather than failing open when the limiter cannot run', async () => {
    mockHit.mockRejectedValue(new Error('no such table'))
    const res = await POST({ request: req() } as never)
    expect(res.status).toBe(503)
    expect(mockCheckPassword).not.toHaveBeenCalled()
  })

  it('clears both counters on a correct password, so a saturated global cap cannot lock the admin out', async () => {
    mockCheckPassword.mockResolvedValue(true)
    const res = await POST({ request: req('correct') } as never)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
    expect(mockDelete).toHaveBeenCalledTimes(1)
    expect(mockWhere).toHaveBeenCalledTimes(1)
  })
})
