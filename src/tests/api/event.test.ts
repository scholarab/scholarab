import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../../pages/api/event'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockInsert, mockValues, mockIsRateLimited, mockRecordHit } = vi.hoisted(() => ({
  mockInsert:        vi.fn(),
  mockValues:        vi.fn((_row: Record<string, unknown>) => Promise.resolve()),
  mockIsRateLimited: vi.fn(() => Promise.resolve(false)),
  mockRecordHit:     vi.fn(() => Promise.resolve()),
}))

vi.mock('../../lib/db/client', () => ({
  db: { insert: (...a: unknown[]) => mockInsert(...a) },
}))

vi.mock('../../lib/db/schema', () => ({
  events: { event: 'event', itemType: 'item_type', itemId: 'item_id', meta: 'meta' },
}))

vi.mock('../../lib/rate-limit', () => ({
  getClientIp:   () => '1.2.3.4',
  isRateLimited: mockIsRateLimited,
  recordHit:     mockRecordHit,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'

function makeRequest(body: unknown, ua: string | null = UA): Request {
  const headers: Record<string, string> = {}
  if (ua !== null) headers['user-agent'] = ua
  return new Request('http://localhost/api/event', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function call(body: unknown, ua: string | null = UA): Promise<Response> {
  return POST({ request: makeRequest(body, ua) } as Parameters<typeof POST>[0])
}

beforeEach(() => {
  vi.clearAllMocks()
  mockInsert.mockReturnValue({ values: mockValues })
  mockValues.mockReturnValue(Promise.resolve())
  mockIsRateLimited.mockResolvedValue(false)
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/event', () => {
  it('accepts a valid event and inserts it', async () => {
    const res = await call({ event: 'apply_click', itemType: 'scholarship', itemId: 42 })
    expect(res.status).toBe(204)
    expect(mockValues).toHaveBeenCalledWith({
      event: 'apply_click',
      itemType: 'scholarship',
      itemId: 42,
      meta: null,
    })
  })

  it('accepts an event without item fields', async () => {
    const res = await call({ event: 'quiz_complete' })
    expect(res.status).toBe(204)
    expect(mockValues).toHaveBeenCalledWith({
      event: 'quiz_complete',
      itemType: null,
      itemId: null,
      meta: null,
    })
  })

  it('silently drops bot user agents without inserting', async () => {
    const res = await call({ event: 'apply_click' }, 'Googlebot/2.1')
    expect(res.status).toBe(204)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('silently drops requests with no user agent', async () => {
    const res = await call({ event: 'apply_click' }, null)
    expect(res.status).toBe(204)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it.each([
    'Mozilla/5.0 (compatible; Bytespider; https://zhanzhang.toutiao.com/)',
    'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
    'axios/1.6.0',
    'node-fetch/2.6.7',
    'Go-http-client/1.1',
    'okhttp/4.9.1',
    'Mozilla/5.0 Chrome-Lighthouse',
    'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/126.0',
    'Java/17.0.2',
  ])('silently drops fetch-library and crawler UA: %s', async (botUa) => {
    const res = await call({ event: 'apply_click' }, botUa)
    expect(res.status).toBe(204)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('does not misflag real browser UAs', async () => {
    const real = [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:127.0) Gecko/20100101 Firefox/127.0',
    ]
    for (const ua of real) {
      const res = await call({ event: 'quiz_complete' }, ua)
      expect(res.status).toBe(204)
    }
    expect(mockInsert).toHaveBeenCalledTimes(real.length)
  })

  // happy-dom's Request strips forbidden headers (Origin, Sec-*), so these
  // three tests stub the minimal Request surface the route actually uses.
  function stubRequest(headers: Record<string, string>): Request {
    const h = new Map(Object.entries({ 'user-agent': UA, ...headers }))
    return {
      url: 'http://localhost/api/event',
      headers: { get: (k: string) => h.get(k.toLowerCase()) ?? null },
      json: () => Promise.resolve({ event: 'quiz_complete' }),
    } as unknown as Request
  }

  it('silently drops cross-site requests (sec-fetch-site)', async () => {
    const res = await POST({ request: stubRequest({ 'sec-fetch-site': 'cross-site' }) } as Parameters<typeof POST>[0])
    expect(res.status).toBe(204)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('silently drops requests with a foreign Origin', async () => {
    const res = await POST({ request: stubRequest({ origin: 'https://evil.example' }) } as Parameters<typeof POST>[0])
    expect(res.status).toBe(204)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('accepts same-origin requests with matching headers', async () => {
    const res = await POST({ request: stubRequest({ origin: 'http://localhost', 'sec-fetch-site': 'same-origin' }) } as Parameters<typeof POST>[0])
    expect(res.status).toBe(204)
    expect(mockInsert).toHaveBeenCalled()
  })

  it('silently drops requests from datacenter networks', async () => {
    for (const org of ['AMAZON-02', 'GOOGLE-CLOUD-PLATFORM', 'Hetzner Online GmbH', 'DIGITALOCEAN-ASN', 'MICROSOFT-CORP-MSN-AS-BLOCK']) {
      const res = await POST({
        request: makeRequest({ event: 'quiz_complete' }),
        locals: { runtime: { cf: { asOrganization: org } } },
      } as unknown as Parameters<typeof POST>[0])
      expect(res.status).toBe(204)
    }
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('accepts requests from residential networks', async () => {
    const res = await POST({
      request: makeRequest({ event: 'quiz_complete' }),
      locals: { runtime: { cf: { asOrganization: 'TELUS Communications Inc.' } } },
    } as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(204)
    expect(mockInsert).toHaveBeenCalled()
  })

  it('accepts quiz_start', async () => {
    const res = await call({ event: 'quiz_start' })
    expect(res.status).toBe(204)
    expect(mockValues).toHaveBeenCalledWith({ event: 'quiz_start', itemType: null, itemId: null, meta: null })
  })

  it('rejects out-of-range itemId', async () => {
    expect((await call({ event: 'save', itemType: 'scholarship', itemId: 0 })).status).toBe(400)
    expect((await call({ event: 'save', itemType: 'scholarship', itemId: -5 })).status).toBe(400)
    expect((await call({ event: 'save', itemType: 'scholarship', itemId: 2_000_000 })).status).toBe(400)
  })

  it('rejects unknown event names', async () => {
    const res = await call({ event: 'pageview' })
    expect(res.status).toBe(400)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects alert_subscribe from the client (server-side only)', async () => {
    const res = await call({ event: 'alert_subscribe', itemType: 'scholarship', itemId: 1 })
    expect(res.status).toBe(400)
  })

  it('rejects invalid itemType', async () => {
    const res = await call({ event: 'save', itemType: 'user', itemId: 1 })
    expect(res.status).toBe(400)
  })

  it('rejects non-integer itemId', async () => {
    const res = await call({ event: 'save', itemType: 'scholarship', itemId: 'abc' })
    expect(res.status).toBe(400)
  })

  it('rejects invalid JSON', async () => {
    const res = await call('not json{')
    expect(res.status).toBe(400)
  })

  // A row with an id but no type counted in the monthly totals and vanished
  // from the per-item table, leaving the two unable to reconcile.
  it('rejects itemId without itemType', async () => {
    const res = await call({ event: 'apply_click', itemId: 42 })
    expect(res.status).toBe(400)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects itemType without itemId', async () => {
    const res = await call({ event: 'apply_click', itemType: 'scholarship' })
    expect(res.status).toBe(400)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('accepts app_step with item fields', async () => {
    const res = await call({ event: 'app_step', itemType: 'scholarship', itemId: 12 })
    expect(res.status).toBe(204)
    expect(mockValues).toHaveBeenCalledWith({
      event: 'app_step', itemType: 'scholarship', itemId: 12, meta: null,
    })
  })

  it('accepts detail_view with item fields', async () => {
    const res = await call({ event: 'detail_view', itemType: 'program', itemId: 7 })
    expect(res.status).toBe(204)
    expect(mockValues).toHaveBeenCalledWith({
      event: 'detail_view',
      itemType: 'program',
      itemId: 7,
      meta: null,
    })
  })

  it('accepts meta for search_empty, trimmed, lowercased, and truncated', async () => {
    const res = await call({ event: 'search_empty', meta: '  RoTaRy ' + 'x'.repeat(300) })
    expect(res.status).toBe(204)
    const inserted = mockValues.mock.calls[0]![0] as { meta: string | null }
    expect(inserted.meta).not.toBeNull()
    expect(inserted.meta!.startsWith('rotary')).toBe(true)
    expect(inserted.meta!.length).toBeLessThanOrEqual(120)
  })

  it('collapses internal whitespace in search_empty meta', async () => {
    await call({ event: 'search_empty', meta: 'rotary   club\t grant' })
    const inserted = mockValues.mock.calls[0]![0] as { meta: string | null }
    expect(inserted.meta).toBe('rotary club grant')
  })

  it('silently drops search_empty meta that is too short to mean anything', async () => {
    const res = await call({ event: 'search_empty', meta: 'ab' })
    expect(res.status).toBe(204)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('silently drops search_empty meta with no letters', async () => {
    const res = await call({ event: 'search_empty', meta: '12345' })
    expect(res.status).toBe(204)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('silently drops email-shaped search_empty meta (zero PII)', async () => {
    const res = await call({ event: 'search_empty', meta: 'kid@school.ca' })
    expect(res.status).toBe(204)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects meta on events other than search_empty', async () => {
    const res = await call({ event: 'apply_click', meta: 'sneaky' })
    expect(res.status).toBe(400)
  })

  it('returns 429 when rate limited', async () => {
    mockIsRateLimited.mockResolvedValue(true)
    const res = await call({ event: 'quiz_complete' })
    expect(res.status).toBe(429)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('fails open when the rate limiter throws', async () => {
    mockIsRateLimited.mockRejectedValue(new Error('no table'))
    const res = await call({ event: 'quiz_complete' })
    expect(res.status).toBe(204)
    expect(mockInsert).toHaveBeenCalled()
  })

  it('still returns 204 when the insert fails', async () => {
    mockValues.mockReturnValue(Promise.reject(new Error('db down')))
    const res = await call({ event: 'quiz_complete' })
    expect(res.status).toBe(204)
  })
})
