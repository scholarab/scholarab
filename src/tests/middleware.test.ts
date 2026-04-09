import { describe, it, expect, vi, beforeEach } from 'vitest'

// defineMiddleware is a no-op wrapper in Astro — just return the function
vi.mock('astro/middleware', () => ({
  defineMiddleware: (fn: any) => fn,
}))

const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}))

vi.mock('../lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}))

// Import after mocks are set up
const { onRequest } = await import('../middleware')

function makeCtx(pathname: string) {
  const redirectFn = vi.fn((url: string) =>
    new Response(null, { status: 302, headers: { Location: url } })
  )
  const ctx = {
    url: new URL(`http://localhost${pathname}`),
    request: new Request(`http://localhost${pathname}`),
    redirect: redirectFn,
    locals: {} as Record<string, unknown>,
  }
  return { ctx, redirectFn }
}

const next = vi.fn(() => new Response('OK', { status: 200 }))
const AUTHED_SESSION = {
  user: { id: '1', email: 'admin@test.com' },
  session: { id: 'sess1' },
}

beforeEach(() => {
  vi.clearAllMocks()
  next.mockReturnValue(new Response('OK', { status: 200 }))
})

// ── Public routes (no auth required) ─────────────────────────────────────────

describe('middleware — public routes', () => {
  it('passes through non-admin routes without checking session', async () => {
    const { ctx } = makeCtx('/scholarships')
    await onRequest(ctx as any, next)
    expect(mockGetSession).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it('passes through root path', async () => {
    const { ctx } = makeCtx('/')
    await onRequest(ctx as any, next)
    expect(mockGetSession).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })
})

// ── Routes that bypass auth ───────────────────────────────────────────────────

describe('middleware — bypass routes', () => {
  it('passes /admin/login through without session check', async () => {
    const { ctx } = makeCtx('/admin/login')
    await onRequest(ctx as any, next)
    expect(mockGetSession).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it('passes /api/auth/* through without session check', async () => {
    const { ctx } = makeCtx('/api/auth/sign-in/email')
    await onRequest(ctx as any, next)
    expect(mockGetSession).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })
})

// ── Protected admin routes ────────────────────────────────────────────────────

describe('middleware — protected admin routes', () => {
  it('redirects to login when no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const { ctx, redirectFn } = makeCtx('/admin/dashboard')
    await onRequest(ctx as any, next)
    expect(next).not.toHaveBeenCalled()
    expect(redirectFn).toHaveBeenCalledWith('/admin/login?next=%2Fadmin%2Fdashboard')
  })

  it('redirects to login when auth throws', async () => {
    mockGetSession.mockRejectedValue(new Error('auth error'))
    const { ctx, redirectFn } = makeCtx('/admin/dashboard')
    await onRequest(ctx as any, next)
    expect(next).not.toHaveBeenCalled()
    expect(redirectFn).toHaveBeenCalledWith('/admin/login')
  })

  it('calls next and sets locals when session is valid', async () => {
    mockGetSession.mockResolvedValue(AUTHED_SESSION)
    const { ctx } = makeCtx('/admin/dashboard')
    await onRequest(ctx as any, next)
    expect(next).toHaveBeenCalled()
    expect(ctx.locals.user).toBe(AUTHED_SESSION.user)
    expect(ctx.locals.session).toBe(AUTHED_SESSION.session)
  })

  it('encodes special characters in next_url redirect param', async () => {
    mockGetSession.mockResolvedValue(null)
    const { ctx, redirectFn } = makeCtx('/admin/api/scholarships/edit?id=1&tab=2')
    await onRequest(ctx as any, next)
    const url = redirectFn.mock.calls[0]?.[0] ?? ''
    expect(url).toContain('/admin/login?next=')
    expect(url).not.toContain('?id=1&tab=2') // raw query string should be encoded
  })
})
