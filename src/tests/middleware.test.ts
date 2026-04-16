import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('astro/middleware', () => ({
  defineMiddleware: (fn: any) => fn,
}))

const { mockVerify, mockGetToken } = vi.hoisted(() => ({
  mockVerify:   vi.fn(),
  mockGetToken: vi.fn(),
}))

vi.mock('../lib/adminAuth', () => ({
  verifySessionCookie: mockVerify,
  getSessionToken:     mockGetToken,
}))

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

const next = vi.fn(() => Promise.resolve(new Response('OK', { status: 200 })))

beforeEach(() => {
  vi.clearAllMocks()
  next.mockReturnValue(Promise.resolve(new Response('OK', { status: 200 })))
  mockGetToken.mockReturnValue(null)
})

// ── Public routes ─────────────────────────────────────────────────────────────

describe('middleware — public routes', () => {
  it('passes through non-admin routes without checking session', async () => {
    const { ctx } = makeCtx('/scholarships')
    await onRequest(ctx as any, next)
    expect(mockVerify).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it('passes through root path', async () => {
    const { ctx } = makeCtx('/')
    await onRequest(ctx as any, next)
    expect(mockVerify).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })
})

// ── Routes that bypass auth ───────────────────────────────────────────────────

describe('middleware — bypass routes', () => {
  it('passes /admin/login through without session check', async () => {
    const { ctx } = makeCtx('/admin/login')
    await onRequest(ctx as any, next)
    expect(mockVerify).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it('passes /admin/api/login through without session check', async () => {
    const { ctx } = makeCtx('/admin/api/login')
    await onRequest(ctx as any, next)
    expect(mockVerify).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })
})

// ── Protected admin routes ────────────────────────────────────────────────────

describe('middleware — protected admin routes', () => {
  it('redirects to login when no session', async () => {
    mockVerify.mockResolvedValue(false)
    const { ctx, redirectFn } = makeCtx('/admin/dashboard')
    await onRequest(ctx as any, next)
    expect(next).not.toHaveBeenCalled()
    expect(redirectFn).toHaveBeenCalledWith('/admin/login?next=%2Fadmin%2Fdashboard')
  })

  it('calls next and sets locals when session is valid', async () => {
    mockVerify.mockResolvedValue(true)
    const { ctx } = makeCtx('/admin/dashboard')
    await onRequest(ctx as any, next)
    expect(next).toHaveBeenCalled()
    expect(ctx.locals.user).toMatchObject({ id: 'admin', email: 'admin@scholarab.ca' })
  })

  it('encodes special characters in next_url redirect param', async () => {
    mockVerify.mockResolvedValue(false)
    const { ctx, redirectFn } = makeCtx('/admin/api/scholarships/edit?id=1&tab=2')
    await onRequest(ctx as any, next)
    const url = redirectFn.mock.calls[0]?.[0] ?? ''
    expect(url).toContain('/admin/login?next=')
    expect(url).not.toContain('?id=1&tab=2')
  })
})
