import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockInsert, mockValues, mockConflict, mockReturning, mockDelete } = vi.hoisted(() => ({
  mockInsert:    vi.fn(),
  mockValues:    vi.fn((_row: Record<string, unknown>) => {}),
  mockConflict:  vi.fn((_arg: unknown) => {}),
  mockReturning: vi.fn(() => Promise.resolve([{ hits: 1 }])),
  mockDelete:    vi.fn(() => ({ where: () => ({ catch: () => Promise.resolve() }) })),
}))

const COUNTER = { __table: 'rate_limit_counter', key: 'key', windowStart: 'window_start', hits: 'hits' }

vi.mock('./db/client', () => ({
  getDb: () => ({
    insert: (t: unknown) => {
      mockInsert(t)
      return {
        values: (row: Record<string, unknown>) => {
          mockValues(row)
          return {
            onConflictDoUpdate: (arg: unknown) => {
              mockConflict(arg)
              return { returning: () => mockReturning() }
            },
          }
        },
      }
    },
    delete: () => mockDelete(),
  }),
}))
vi.mock('./db/schema', () => ({ rateLimitCounter: COUNTER }))

const { hitRateLimit, getClientIp, hashKeyIdentifier } = await import('./rate-limit')

const WINDOW = 15 * 60 * 1000

beforeEach(() => {
  vi.clearAllMocks()
  mockReturning.mockResolvedValue([{ hits: 1 }])
  // Keep the sampled sweep out of the way unless a test asks for it.
  vi.spyOn(Math, 'random').mockReturnValue(0.9)
})

describe('hitRateLimit', () => {
  it('counts and checks in a single upsert', async () => {
    // The whole fix. Two statements were a check-then-act with nothing
    // serialising them, so concurrent callers all read the same stale count.
    await hitRateLimit('alert:1.2.3.4', 20, WINDOW)
    expect(mockInsert).toHaveBeenCalledWith(COUNTER)
    expect(mockConflict).toHaveBeenCalledOnce()
    expect(mockConflict.mock.calls[0]![0]).toMatchObject({
      target: [COUNTER.key, COUNTER.windowStart],
    })
  })

  it('lets the limit through and turns away the one after it', async () => {
    // `hits` already counts the caller, so 20 of 20 is fine and 21 is not;
    // the same budget the old `count >= limit` gave reading 20 prior rows.
    mockReturning.mockResolvedValueOnce([{ hits: 20 }])
    expect(await hitRateLimit('alert:ip', 20, WINDOW)).toBe(false)

    mockReturning.mockResolvedValueOnce([{ hits: 21 }])
    expect(await hitRateLimit('alert:ip', 20, WINDOW)).toBe(true)
  })

  it('snaps every caller in a window onto the same bucket row', async () => {
    // Two calls milliseconds apart must conflict, or the upsert has nothing to
    // serialise on and the race is back.
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-08-21T12:00:01Z'))
      await hitRateLimit('k', 5, WINDOW)
      vi.setSystemTime(new Date('2026-08-21T12:14:59Z'))
      await hitRateLimit('k', 5, WINDOW)
    } finally {
      vi.useRealTimers()
    }
    const first = mockValues.mock.calls[0]![0].windowStart as Date
    const second = mockValues.mock.calls[1]![0].windowStart as Date
    expect(second.getTime()).toBe(first.getTime())
    expect(first.getTime() % WINDOW).toBe(0)
  })

  it('starts a fresh bucket in the next window', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-08-21T12:14:59Z'))
      await hitRateLimit('k', 5, WINDOW)
      vi.setSystemTime(new Date('2026-08-21T12:15:01Z'))
      await hitRateLimit('k', 5, WINDOW)
    } finally {
      vi.useRealTimers()
    }
    const first = mockValues.mock.calls[0]![0].windowStart as Date
    const second = mockValues.mock.calls[1]![0].windowStart as Date
    expect(second.getTime() - first.getTime()).toBe(WINDOW)
  })

  it('sweeps old buckets only on the sampled fraction of calls', async () => {
    await hitRateLimit('k', 5, WINDOW)
    expect(mockDelete).not.toHaveBeenCalled()

    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    await hitRateLimit('k', 5, WINDOW)
    expect(mockDelete).toHaveBeenCalledOnce()
  })

  it('treats a missing returned row as this call being the only hit', async () => {
    mockReturning.mockResolvedValueOnce([])
    expect(await hitRateLimit('k', 5, WINDOW)).toBe(false)
  })
})

describe('key hashing', () => {
  it('never writes the raw identifier to the table', async () => {
    await hitRateLimit('alert:203.0.113.9', 20, WINDOW)
    const written = mockValues.mock.calls[0]![0].key as string
    expect(written).not.toContain('203.0.113.9')
    // The endpoint name is kept legible on purpose; it identifies nobody and
    // makes a dump of this table readable.
    expect(written.startsWith('alert:')).toBe(true)
    expect(written.slice('alert:'.length)).toMatch(/^[0-9a-f]{32}$/)
  })

  it('is stable, or the limiter would silently stop counting', async () => {
    await hitRateLimit('alert:203.0.113.9', 20, WINDOW)
    await hitRateLimit('alert:203.0.113.9', 20, WINDOW)
    expect(mockValues.mock.calls[0]![0].key).toBe(mockValues.mock.calls[1]![0].key)
  })

  it('separates different IPs and different endpoints', async () => {
    await hitRateLimit('alert:203.0.113.9', 20, WINDOW)
    await hitRateLimit('alert:203.0.113.10', 20, WINDOW)
    await hitRateLimit('event:203.0.113.9', 20, WINDOW)
    const keys = mockValues.mock.calls.map(c => c[0].key)
    expect(new Set(keys).size).toBe(3)
  })

  it('hashes a key with no prefix rather than passing it through', async () => {
    await hitRateLimit('bare-key', 5, WINDOW)
    expect(mockValues.mock.calls[0]![0].key).toMatch(/^[0-9a-f]{32}$/)
  })

  it('exposes the same hash the callers clearing a counter must use', async () => {
    await hitRateLimit('login:203.0.113.9', 5, WINDOW)
    expect(await hashKeyIdentifier('login:203.0.113.9')).toBe(mockValues.mock.calls[0]![0].key)
  })
})

describe('salt selection', () => {
  // The module caches nothing, so each case just sets the environment and
  // compares digests of the same input. Different salt, different digest.
  const KEY = 'alert:203.0.113.9'

  beforeEach(() => {
    delete process.env.RATE_LIMIT_SALT
    delete process.env.SESSION_SECRET
  })

  it('uses SESSION_SECRET when no dedicated salt is bound', async () => {
    const unsalted = await hashKeyIdentifier(KEY)
    process.env.SESSION_SECRET = 'the-session-secret'
    expect(await hashKeyIdentifier(KEY)).not.toBe(unsalted)
  })

  it('prefers RATE_LIMIT_SALT over SESSION_SECRET when both are set', async () => {
    process.env.SESSION_SECRET = 'the-session-secret'
    const derived = await hashKeyIdentifier(KEY)
    process.env.RATE_LIMIT_SALT = 'a-dedicated-salt'
    expect(await hashKeyIdentifier(KEY)).not.toBe(derived)
  })

  it('domain-separates the derived salt from the raw secret', async () => {
    // Reusing SESSION_SECRET for a second purpose is only safe if this can
    // never hash the same bytes adminAuth signs with. Binding the bare secret
    // as RATE_LIMIT_SALT must not reproduce the derived digest.
    process.env.SESSION_SECRET = 'the-session-secret'
    const derived = await hashKeyIdentifier(KEY)
    delete process.env.SESSION_SECRET
    process.env.RATE_LIMIT_SALT = 'the-session-secret'
    expect(await hashKeyIdentifier(KEY)).not.toBe(derived)
  })

  it('still salts with the built-in constant when nothing is bound', async () => {
    // Local dev and any misconfigured deploy: the point is that no plaintext
    // IP reaches the table either way.
    const written = await hashKeyIdentifier(KEY)
    expect(written).toMatch(/^alert:[0-9a-f]{32}$/)
    expect(written).not.toContain('203.0.113.9')
  })
})

describe('getClientIp', () => {
  it('prefers the Cloudflare header, then the first forwarded hop', () => {
    const req = (h: Record<string, string>) => new Request('https://x/', { headers: h })
    expect(getClientIp(req({ 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }))).toBe('1.1.1.1')
    expect(getClientIp(req({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3' }))).toBe('2.2.2.2')
    expect(getClientIp(req({}))).toBe('unknown')
  })
})
