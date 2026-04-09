import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../../pages/admin/api/deploy'

const { mockGetSession, mockInsert } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockInsert:     vi.fn(),
}))

vi.mock('../../lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}))

vi.mock('../../lib/db/client', () => ({
  db: { insert: (...a: any[]) => mockInsert(...a) },
}))

vi.mock('../../lib/db/schema', () => ({
  deployLog: 'deploy_log',
}))

const AUTHED = { user: { id: '1', email: 'admin@test.com' } }

// happy-dom strips 'origin' as a forbidden header, so we use a mock request object
function req(origin?: string) {
  return {
    headers: { get: (key: string) => key.toLowerCase() === 'origin' ? (origin ?? null) : null },
    json: async () => ({}),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  mockInsert.mockReturnValue({ values: () => Promise.resolve() })
})

describe('POST /admin/api/deploy', () => {
  it('returns 403 when origin is not in allowed list', async () => {
    const res = await POST({ request: req('https://evil.com') } as any)
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: 'Forbidden' })
  })

  it('allows requests with no origin header', async () => {
    mockGetSession.mockResolvedValue(null)
    // no origin → origin check passes, but auth fails
    const res = await POST({ request: req() } as any)
    expect(res.status).toBe(401)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await POST({ request: req('https://www.scholarab.ca') } as any)
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 500 when VERCEL_DEPLOY_HOOK_URL is not configured', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    delete process.env.VERCEL_DEPLOY_HOOK_URL
    const res = await POST({ request: req('https://www.scholarab.ca') } as any)
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'Deploy hook not configured' })
  })

  it('returns 200 and logs deployment when deploy hook succeeds', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    process.env.VERCEL_DEPLOY_HOOK_URL = 'https://api.vercel.com/deploy/hook'
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ job: { id: 'abc123' } }), { status: 200 })
    )
    vi.stubGlobal('fetch', mockFetch)

    const res = await POST({ request: req('https://www.scholarab.ca') } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockInsert).toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledWith('https://api.vercel.com/deploy/hook', { method: 'POST' })
  })

  it('returns 500 when fetch throws', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    process.env.VERCEL_DEPLOY_HOOK_URL = 'https://api.vercel.com/deploy/hook'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const res = await POST({ request: req('https://www.scholarab.ca') } as any)
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'Failed to trigger deployment' })
  })

  it('accepts localhost origin', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await POST({ request: req('http://localhost:4321') } as any)
    expect(res.status).toBe(401) // auth fails, not origin check
  })
})
