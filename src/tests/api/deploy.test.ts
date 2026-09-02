import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../../pages/admin/api/deploy'

const { mockIsAdmin } = vi.hoisted(() => ({
  mockIsAdmin: vi.fn(),
}))

vi.mock('../../lib/adminAuth', () => ({
  isAdminRequest: mockIsAdmin,
}))

function req() {
  return new Request('http://localhost/admin/api/deploy', { method: 'POST' })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe('POST /admin/api/deploy', () => {
  it('returns 401 when unauthenticated', async () => {
    mockIsAdmin.mockResolvedValue(false)
    const res = await POST({ request: req() } as any)
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 500 when DEPLOY_HOOK_URL is not configured', async () => {
    mockIsAdmin.mockResolvedValue(true)
    delete process.env.DEPLOY_HOOK_URL
    const res = await POST({ request: req() } as any)
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'Deploy hook not configured' })
  })

  it('returns 200 and logs deployment when deploy hook succeeds', async () => {
    mockIsAdmin.mockResolvedValue(true)
    process.env.DEPLOY_HOOK_URL = 'https://api.cloudflare.com/deploy/hook'
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ job: { id: 'abc123' } }), { status: 200 })
    )
    vi.stubGlobal('fetch', mockFetch)

    const res = await POST({ request: req() } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith('https://api.cloudflare.com/deploy/hook', { method: 'POST' })
  })

  it('returns 500 when fetch throws', async () => {
    mockIsAdmin.mockResolvedValue(true)
    process.env.DEPLOY_HOOK_URL = 'https://api.cloudflare.com/deploy/hook'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const res = await POST({ request: req() } as any)
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'Failed to trigger deployment' })
  })
})
