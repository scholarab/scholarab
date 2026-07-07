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
