import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUpdate, mockWhere, mockHitRateLimit } = vi.hoisted(() => {
  const mockWhere = vi.fn((_cond: unknown) => Promise.resolve())
  const mockSet = vi.fn((_values: unknown) => ({ where: mockWhere }))
  return {
    mockWhere,
    mockUpdate: vi.fn((_table: unknown) => ({ set: mockSet })),
    mockHitRateLimit: vi.fn(() => Promise.resolve(false)),
  }
})

vi.mock('../../lib/db/client', () => ({ db: { update: (t: unknown) => mockUpdate(t) } }))
vi.mock('../../lib/db/schema', () => ({
  subscribers: { __table: 'subscribers', token: 'token', confirmedAt: 'confirmed_at' },
}))
vi.mock('../../lib/rate-limit', () => ({
  getClientIp: () => '1.2.3.4',
  hitRateLimit: mockHitRateLimit,
}))
vi.mock('drizzle-orm', () => ({
  eq: (a: unknown, b: unknown) => ({ eq: [a, b] }),
  and: (...a: unknown[]) => ({ and: a }),
  isNull: (a: unknown) => ({ isNull: a }),
  sql: Object.assign((s: TemplateStringsArray) => ({ raw: s.join('') }), {}),
}))

const { GET, POST } = await import('../../pages/api/confirm')

const get = (url: string) =>
  GET({ request: new Request(url) } as Parameters<typeof GET>[0])

function post(token?: string) {
  const body = new FormData()
  if (token !== undefined) body.set('token', token)
  return POST({
    request: new Request('http://localhost/api/confirm', { method: 'POST', body }),
  } as Parameters<typeof POST>[0])
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/confirm', () => {
  it('renders a button and writes nothing', async () => {
    // Mail security stacks (Safe Links, Proofpoint) fetch every URL in a
    // message. If GET confirmed, the recipient's own gateway would supply the
    // consent, which is the exact thing double opt-in exists to obtain from
    // a human.
    const res = await get('http://localhost/api/confirm?token=abc')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('<button type="submit">')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('escapes the token it echoes back into the form', async () => {
    const res = await get('http://localhost/api/confirm?token=a"><script>x</script>')
    const html = await res.text()
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&quot;&gt;&lt;script&gt;')
  })

  it('rejects a request with no token', async () => {
    expect((await get('http://localhost/api/confirm')).status).toBe(400)
  })

  it('refuses when rate limited', async () => {
    mockHitRateLimit.mockResolvedValueOnce(true)
    expect((await get('http://localhost/api/confirm?token=abc')).status).toBe(429)
  })
})

describe('POST /api/confirm', () => {
  it('records consent for the matching token', async () => {
    const res = await post('abc')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain("You're all set")
    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(mockWhere).toHaveBeenCalledOnce()
  })

  it('only ever sets confirmed_at where it is still null', async () => {
    // Clicking a year-old link a second time must not move the consent date
    // forward; that date is the record of when consent was actually given.
    await post('abc')
    expect(JSON.stringify(mockWhere.mock.calls[0]?.[0])).toContain('confirmed_at')
  })

  it('answers the same for an unknown token', async () => {
    // Otherwise this endpoint tells you which tokens are live.
    const known = await post('abc')
    const unknown = await post('does-not-exist')
    expect(await unknown.text()).toBe(await known.text())
  })

  it('rejects a submission with no token', async () => {
    expect((await post()).status).toBe(400)
  })
})
