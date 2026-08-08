import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../../pages/api/alert'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const {
  SUBSCRIBERS, EVENTS, returning,
  mockInsert, mockSubValues, mockConflictUpdate, mockConflictNothing, mockEventValues,
  mockIsRateLimited, mockRecordHit, mockLoadScholarships, mockLoadPrograms,
} = vi.hoisted(() => {
  // The route reads `.returning()` off both conflict branches to tell a fresh
  // reminder from a cadence change, so the mock chain has to offer one.
  const returning = <T,>(rows: T[] | Promise<T[]>) => ({ returning: () => Promise.resolve(rows) })
  return {
    SUBSCRIBERS: { __table: 'subscribers', email: 'email', itemType: 'item_type', itemId: 'item_id', id: 'id' },
    EVENTS: { __table: 'events' },
    returning,
    mockInsert:           vi.fn(),
    mockSubValues:        vi.fn((_row: Record<string, unknown>) => {}),
    mockConflictUpdate:   vi.fn((_arg: { set: Record<string, unknown> }) => returning([{ isNew: true }])),
    mockConflictNothing:  vi.fn(() => returning([{ id: 1 }])),
    mockEventValues:      vi.fn((_row: Record<string, unknown>) => {}),
    mockIsRateLimited:    vi.fn(() => Promise.resolve(false)),
    mockRecordHit:        vi.fn(() => Promise.resolve()),
    mockLoadScholarships: vi.fn(),
    mockLoadPrograms:     vi.fn(),
  }
})

vi.mock('../../lib/db/client', () => ({
  db: { insert: (...a: unknown[]) => mockInsert(...a) },
}))

vi.mock('../../lib/db/schema', () => ({ subscribers: SUBSCRIBERS, events: EVENTS }))

vi.mock('../../lib/data-loader', () => ({
  loadScholarships: mockLoadScholarships,
  loadPrograms:     mockLoadPrograms,
}))

vi.mock('../../lib/rate-limit', () => ({
  getClientIp:   () => '1.2.3.4',
  isRateLimited: mockIsRateLimited,
  recordHit:     mockRecordHit,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

// Far enough out that the route's "deadline has passed" guard never fires as
// the calendar moves; the suite must not start failing on a future date.
const FUTURE = `${new Date().getFullYear() + 5}-06-01`

async function call(body: unknown): Promise<Response> {
  const request = new Request('http://localhost/api/alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
  return POST({ request } as Parameters<typeof POST>[0])
}

/** The row handed to `.values()` on the nth subscribers insert. */
function subRow(n = 0): Record<string, unknown> {
  const call = mockSubValues.mock.calls[n]
  if (!call) throw new Error(`expected a subscribers insert at index ${n}`)
  return call[0]
}

/** The argument handed to `.onConflictDoUpdate()`. */
function conflictArg(): { set: Record<string, unknown> } {
  const call = mockConflictUpdate.mock.calls[0]
  if (!call) throw new Error('expected onConflictDoUpdate to be called')
  return call[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  mockIsRateLimited.mockResolvedValue(false)
  mockConflictUpdate.mockReturnValue(returning([{ isNew: true }]))
  mockConflictNothing.mockReturnValue(returning([{ id: 1 }]))
  mockLoadScholarships.mockResolvedValue([{ id: 1, title: 'Test Award', deadline: FUTURE }])
  mockLoadPrograms.mockResolvedValue([{ id: 7, name: 'Test Program', deadline: FUTURE }])
  mockInsert.mockImplementation((table: unknown) => {
    if (table === SUBSCRIBERS) {
      return {
        values: (row: Record<string, unknown>) => {
          mockSubValues(row)
          return {
            onConflictDoUpdate: (arg: { set: Record<string, unknown> }) => mockConflictUpdate(arg),
            onConflictDoNothing: () => mockConflictNothing(),
          }
        },
      }
    }
    return { values: (row: Record<string, unknown>) => { mockEventValues(row); return Promise.resolve() } }
  })
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/alert', () => {
  it('subscribes with the default cadence when days is omitted', async () => {
    const res = await call({ email: 'student@example.com', itemId: 1 })
    expect(res.status).toBe(200)
    expect(subRow()).toMatchObject({
      email: 'student@example.com',
      itemType: 'scholarship',
      itemId: 1,
      cadence: '30,14,3',
    })
  })

  it('stores a picked cadence normalized biggest-first', async () => {
    await call({ email: 'student@example.com', itemId: 1, days: [3, 30] })
    expect(subRow().cadence).toBe('30,3')
  })

  // EMAIL_RE is anchored and excludes \s, so a padded address used to 400 here.
  // Unreachable from the site's own forms (`type="email"` sanitizes .value), but
  // this endpoint takes JSON from anywhere.
  it.each([
    ['trailing space', 'student@example.com '],
    ['leading space', ' student@example.com'],
    ['trailing newline', 'student@example.com\n'],
  ])('accepts an email with a %s and stores it trimmed', async (_label, email) => {
    const res = await call({ email, itemId: 1 })
    expect(res.status).toBe(200)
    expect(subRow().email).toBe('student@example.com')
  })

  it('lowercases the stored address', async () => {
    await call({ email: '  Student@Example.COM  ', itemId: 1 })
    expect(subRow().email).toBe('student@example.com')
  })

  it('still rejects an address that is not an email once trimmed', async () => {
    const res = await call({ email: '   ', itemId: 1 })
    expect(res.status).toBe(400)
    expect(mockSubValues).not.toHaveBeenCalled()
  })

  it('rejects a non-string email', async () => {
    expect((await call({ email: 42, itemId: 1 })).status).toBe(400)
  })

  it('rejects an empty cadence rather than storing "mail me never"', async () => {
    const res = await call({ email: 'student@example.com', itemId: 1, days: [] })
    expect(res.status).toBe(400)
    expect(mockSubValues).not.toHaveBeenCalled()
  })

  it('rejects a cadence with a day the mailer never sends on', async () => {
    const res = await call({ email: 'student@example.com', itemId: 1, days: [30, 7] })
    expect(res.status).toBe(400)
  })

  it('updates the cadence on conflict without reissuing the token', async () => {
    await call({ email: 'student@example.com', itemId: 1, days: [14] })
    const arg = conflictArg()
    expect(arg.set).toEqual({ cadence: '14' })
    expect(arg.set).not.toHaveProperty('token')
  })

  it('falls back to an insert without the cadence column if it is missing', async () => {
    mockConflictUpdate.mockReturnValue({
      returning: () => Promise.reject(new Error('column "cadence" does not exist')),
    })
    const res = await call({ email: 'student@example.com', itemId: 1 })
    expect(res.status).toBe(200)
    expect(mockConflictNothing).toHaveBeenCalled()
    // Second attempt drops the column entirely rather than sending a null.
    expect(subRow(1)).not.toHaveProperty('cadence')
  })

  // alert_subscribe is the signup metric. Firing it on a cadence change pushes
  // "Alert signups" above "People on email" and the gap looks like churn.
  it('records an alert_subscribe event for a brand-new reminder', async () => {
    await call({ email: 'student@example.com', itemId: 1 })
    expect(mockEventValues).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'alert_subscribe', itemType: 'scholarship', itemId: 1 }),
    )
  })

  it('does not record one when an existing reminder only changes cadence', async () => {
    mockConflictUpdate.mockReturnValue(returning([{ isNew: false }]))
    const res = await call({ email: 'student@example.com', itemId: 1, days: [3] })
    expect(res.status).toBe(200)
    expect(mockEventValues).not.toHaveBeenCalled()
  })

  it('does not record one when the fallback insert hits an existing row', async () => {
    mockConflictUpdate.mockReturnValue({ returning: () => Promise.reject(new Error('no cadence column')) })
    mockConflictNothing.mockReturnValue(returning([]))
    const res = await call({ email: 'student@example.com', itemId: 1 })
    expect(res.status).toBe(200)
    expect(mockEventValues).not.toHaveBeenCalled()
  })

  it('404s an unknown scholarship', async () => {
    expect((await call({ email: 'student@example.com', itemId: 999 })).status).toBe(404)
  })

  it('rejects a program with no fixed deadline', async () => {
    mockLoadPrograms.mockResolvedValue([{ id: 7, name: 'Test Program', deadline: 'Ongoing' }])
    const res = await call({ email: 'student@example.com', itemType: 'program', itemId: 7 })
    expect(res.status).toBe(400)
  })

  it('rejects a deadline that has already passed', async () => {
    mockLoadScholarships.mockResolvedValue([{ id: 1, title: 'Test Award', deadline: '2020-01-01' }])
    const res = await call({ email: 'student@example.com', itemId: 1 })
    expect(res.status).toBe(400)
  })

  it('429s when rate limited', async () => {
    mockIsRateLimited.mockResolvedValue(true)
    expect((await call({ email: 'student@example.com', itemId: 1 })).status).toBe(429)
  })

  it('rejects invalid JSON', async () => {
    expect((await call('{not json')).status).toBe(400)
  })
})
