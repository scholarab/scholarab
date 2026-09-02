import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockDeleteWhere, mockDelete, mockSelectWhere, mockHitRateLimit, selectRows } = vi.hoisted(() => {
  const selectRows: { email: string }[] = []
  const mockDeleteWhere = vi.fn((_cond: unknown) => Promise.resolve())
  const mockSelectWhere = vi.fn((_cond: unknown) => ({ limit: () => Promise.resolve(selectRows) }))
  return {
    selectRows,
    mockDeleteWhere,
    mockSelectWhere,
    mockDelete: vi.fn((_table: unknown) => ({ where: mockDeleteWhere })),
    mockHitRateLimit: vi.fn(() => Promise.resolve(false)),
  }
})

vi.mock('../../lib/db/client', () => ({
  db: {
    delete: (t: unknown) => mockDelete(t),
    select: () => ({ from: () => ({ where: mockSelectWhere }) }),
  },
}))
vi.mock('../../lib/db/schema', () => ({
  subscribers: { __table: 'subscribers', token: 'token', email: 'email' },
}))
vi.mock('../../lib/rate-limit', () => ({
  getClientIp: () => '1.2.3.4',
  hitRateLimit: mockHitRateLimit,
}))
vi.mock('drizzle-orm', () => ({
  eq: (a: unknown, b: unknown) => ({ eq: [a, b] }),
}))

const { GET, POST } = await import('../../pages/api/unsubscribe')

const get = (url: string) => GET({ request: new Request(url) } as Parameters<typeof GET>[0])

function post(fields: Record<string, string>) {
  const body = new FormData()
  for (const [k, v] of Object.entries(fields)) body.set(k, v)
  return POST({
    request: new Request('http://localhost/api/unsubscribe', { method: 'POST', body }),
  } as Parameters<typeof POST>[0])
}

beforeEach(() => {
  vi.clearAllMocks()
  selectRows.length = 0
})

describe('GET /api/unsubscribe', () => {
  it('renders buttons and deletes nothing', async () => {
    // Mail gateways fetch every URL in a message. A GET that deleted would
    // unsubscribe people who never clicked.
    const res = await get('http://localhost/api/unsubscribe?token=abc')
    expect(res.status).toBe(200)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('offers the delete-everything path alongside the plain unsubscribe', async () => {
    const html = await (await get('http://localhost/api/unsubscribe?token=abc')).text()
    expect(html).toContain('Delete all my data')
    expect(html).toContain('value="all"')
    expect(html).toContain('/privacy/')
  })

  it('escapes the token in both forms', async () => {
    const html = await (await get('http://localhost/api/unsubscribe?token=a"><script>x</script>')).text()
    expect(html).not.toContain('<script>x</script>')
  })

  it('rejects a request with no token', async () => {
    expect((await get('http://localhost/api/unsubscribe')).status).toBe(400)
  })

  it('refuses when rate limited', async () => {
    mockHitRateLimit.mockResolvedValueOnce(true)
    expect((await get('http://localhost/api/unsubscribe?token=abc')).status).toBe(429)
  })
})

describe('POST /api/unsubscribe', () => {
  it('deletes just the one subscription by default', async () => {
    const res = await post({ token: 'abc' })
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Unsubscribed')
    expect(mockDelete).toHaveBeenCalledOnce()
    // Scoped by token, not by email; the other reminders stay.
    expect(JSON.stringify(mockDeleteWhere.mock.calls[0]?.[0])).toContain('token')
  })

  it('rejects a submission with no token', async () => {
    expect((await post({})).status).toBe(400)
  })
})

describe('POST /api/unsubscribe with scope=all', () => {
  it('erases every subscription sharing the address behind the token', async () => {
    selectRows.push({ email: 'student@example.com' })
    const res = await post({ token: 'abc', scope: 'all' })
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Deleted')
    // Looked the address up by token, then deleted by address.
    expect(JSON.stringify(mockSelectWhere.mock.calls[0]?.[0])).toContain('token')
    expect(JSON.stringify(mockDeleteWhere.mock.calls[0]?.[0])).toContain('student@example.com')
  })

  it('deletes nothing when the token matches no row', async () => {
    // The token is the only proof of ownership. No row, no address, no delete
    // and crucially the same page back, so this cannot be used to ask
    // whether a given token is live.
    const res = await post({ token: 'nope', scope: 'all' })
    expect(res.status).toBe(200)
    expect(mockDelete).not.toHaveBeenCalled()
    expect(await res.text()).toContain('Deleted')
  })

  it('never takes a bare email address', async () => {
    // If it did, anyone could wipe anyone's reminders, and learn whether an
    // address was on the list at all.
    selectRows.push({ email: 'student@example.com' })
    const res = await post({ email: 'student@example.com', scope: 'all' })
    expect(res.status).toBe(400)
    expect(mockDelete).not.toHaveBeenCalled()
  })
})

describe('POST /api/unsubscribe, one-click', () => {
  // RFC 8058: Gmail and Yahoo POST `List-Unsubscribe=One-Click` with no form
  // field of ours in the body. If the token were readable only from the form,
  // every one-click attempt would 400 and the provider would count it failed.
  function oneClickPost(url: string, body?: string) {
    return POST({
      request: new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body ?? 'List-Unsubscribe=One-Click',
      }),
    } as Parameters<typeof POST>[0])
  }

  it('takes the token from the query string when the body carries no field', async () => {
    const res = await oneClickPost('http://localhost/api/unsubscribe?token=abc')
    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalled()
  })

  it('unsubscribes rather than deleting everything, since scope is absent', async () => {
    // One-click is the mail app's button, not the "delete all my data" one.
    // Erasure stays an explicit choice made on the page.
    await oneClickPost('http://localhost/api/unsubscribe?token=abc')
    expect(mockSelectWhere).not.toHaveBeenCalled()
  })

  it('still refuses a POST with no token anywhere', async () => {
    const res = await oneClickPost('http://localhost/api/unsubscribe')
    expect(res.status).toBe(400)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('prefers the form field when both are present', async () => {
    const body = new FormData()
    body.set('token', 'from-form')
    const res = await POST({
      request: new Request('http://localhost/api/unsubscribe?token=from-query', { method: 'POST', body }),
    } as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    expect(mockDeleteWhere).toHaveBeenCalledWith({ eq: ['token', 'from-form'] })
  })

  it('survives a body it cannot parse as a form', async () => {
    const res = await POST({
      request: new Request('http://localhost/api/unsubscribe?token=abc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"not":"a form"}',
      }),
    } as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalled()
  })
})
