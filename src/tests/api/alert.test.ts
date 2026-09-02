import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../../pages/api/alert'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const {
  SUBSCRIBERS, EVENTS, returning,
  mockInsert, mockSubValues, mockConflictUpdate, mockConflictNothing, mockEventValues,
  mockHitRateLimit, mockLoadScholarships, mockLoadPrograms,
  mockUpdate, mockSendConfirm, mockSelect,
} = vi.hoisted(() => {
  // The route reads `.returning()` off both conflict branches to tell a fresh
  // reminder from a cadence change, so the mock chain has to offer one.
  const returning = <T,>(rows: T[] | Promise<T[]>) => ({ returning: () => Promise.resolve(rows) })
  return {
    SUBSCRIBERS: { __table: 'subscribers', email: 'email', itemType: 'item_type', itemId: 'item_id', id: 'id', confirmSentAt: 'confirm_sent_at' },
    EVENTS: { __table: 'events' },
    returning,
    mockInsert:           vi.fn(),
    mockSubValues:        vi.fn((_row: Record<string, unknown>) => {}),
    mockConflictUpdate:   vi.fn((_arg: { set: Record<string, unknown> }) => returning([{ isNew: true }])),
    mockConflictNothing:  vi.fn(() => returning([{ id: 1 }])),
    mockEventValues:      vi.fn((_row: Record<string, unknown>) => {}),
    mockHitRateLimit:    vi.fn(() => Promise.resolve(false)),
    mockLoadScholarships: vi.fn(),
    mockLoadPrograms:     vi.fn(),
    // db.update(...).set(...).where(...); records the confirmation send.
    mockUpdate:           vi.fn((_table: unknown) => ({ set: (_v: unknown) => ({ where: (_c: unknown) => Promise.resolve() }) })),
    mockSendConfirm:      vi.fn((_to: string, _label: string, _url: string) => Promise.resolve(true)),
    // db.select(...).from(...).where(...); the per-address confirm cooldown.
    // Defaults to "nothing sent to this address recently", so every test that
    // does not care about the cooldown behaves as it did before it existed.
    mockSelect:           vi.fn((_cols: unknown) => ({
      from: (_t: unknown) => ({ where: (_c: unknown) => Promise.resolve([{ recent: 0, today: 0 }]) }),
    })),
  }
})

vi.mock('../../lib/db/client', () => ({
  db: {
    insert: (...a: unknown[]) => mockInsert(...a),
    update: (t: unknown) => mockUpdate(t),
    select: (c: unknown) => mockSelect(c),
  },
}))

vi.mock('../../lib/confirm-email', () => ({ sendConfirmEmail: mockSendConfirm }))

vi.mock('../../lib/db/schema', () => ({ subscribers: SUBSCRIBERS, events: EVENTS }))

vi.mock('../../lib/data-loader', () => ({
  loadScholarships: mockLoadScholarships,
  loadPrograms:     mockLoadPrograms,
}))

vi.mock('../../lib/rate-limit', () => ({
  getClientIp:   () => '1.2.3.4',
  hitRateLimit: mockHitRateLimit,
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

/** Same POST, but arriving on a chosen host; the F4 origin question. */
async function callFromHost(host: string, body: unknown): Promise<Response> {
  const request = new Request(`${host}/api/alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return POST({ request } as Parameters<typeof POST>[0])
}

/** Make the cooldown query report a given state for the address. */
function confirmsSent(recent: number, today: number): void {
  mockSelect.mockReturnValueOnce({
    from: () => ({ where: () => Promise.resolve([{ recent, today }]) }),
  })
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
  mockHitRateLimit.mockResolvedValue(false)
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
    mockHitRateLimit.mockResolvedValue(true)
    expect((await call({ email: 'student@example.com', itemId: 1 })).status).toBe(429)
  })

  it('rejects invalid JSON', async () => {
    expect((await call('{not json')).status).toBe(400)
  })
})

// ── Double opt-in ─────────────────────────────────────────────────────────────
// /api/alert is public JSON: before migration 0010 anyone could POST anyone
// else's address and ScholarAB would start mailing them. A row is no longer
// evidence of consent; confirmed_at is, and send-alerts.ts filters on it.

describe('double opt-in', () => {
  beforeEach(() => {
    mockLoadScholarships.mockResolvedValue([{ id: 1, title: 'Test Award', deadline: FUTURE }])
  })

  it('mails a confirmation for a brand-new sign-up and says so', async () => {
    mockConflictUpdate.mockReturnValueOnce(
      returning([{ isNew: true, token: 'tok-stored', confirmedAt: null }]))

    const res = await call({ email: 'a@b.com', itemId: 1 })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, confirmed: false })

    expect(mockSendConfirm).toHaveBeenCalledOnce()
    const call0 = mockSendConfirm.mock.calls[0]!
    expect(call0[0]).toBe('a@b.com')
    expect(call0[1]).toBe('Test Award')
    // The link must carry the token the row actually holds.
    expect(call0[2]).toContain('/api/confirm?token=tok-stored')
    expect(mockUpdate).toHaveBeenCalledOnce()
  })

  it('sends the token already on the row, not the freshly generated one', async () => {
    // The conflict path keeps the original token; it is the credential in the
    // unsubscribe link already sitting in their inbox. A confirm link built
    // from the new token would match no row at all.
    mockConflictUpdate.mockReturnValueOnce(
      returning([{ isNew: false, token: 'original-token', confirmedAt: null }]))

    await call({ email: 'a@b.com', itemId: 1 })
    expect(mockSendConfirm.mock.calls[0]![2]).toContain('token=original-token')
  })

  it('does not re-ask someone whose consent is already on file', async () => {
    // A returning student changing their cadence, or one of the sign-ups
    // grandfathered by 0010. Mailing them a confirm link would be noise.
    mockConflictUpdate.mockReturnValueOnce(
      returning([{ isNew: false, token: 'tok', confirmedAt: new Date('2026-07-01') }]))

    const res = await call({ email: 'a@b.com', itemId: 1 })
    expect(await res.json()).toEqual({ ok: true, confirmed: true })
    expect(mockSendConfirm).not.toHaveBeenCalled()
  })

  it('still accepts the sign-up when the confirmation cannot be sent', async () => {
    // No RESEND_API_KEY bound, or Resend is down. The row stays unconfirmed
    // with confirm_sent_at null and the daily job sweeps it; reporting a
    // failure to the page would be wrong, and losing the row worse.
    mockConflictUpdate.mockReturnValueOnce(
      returning([{ isNew: true, token: 'tok', confirmedAt: null }]))
    mockSendConfirm.mockResolvedValueOnce(false)

    const res = await call({ email: 'a@b.com', itemId: 1 })
    expect(res.status).toBe(200)
    // Not marked as sent; that is what tells the sweep to try again.
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('skips the confirmation when the cadence fallback hides the stored token', async () => {
    // The pre-0009 path returns only an id, so there is no way to know which
    // token the stored row holds. Guessing would mail a dead link.
    mockConflictUpdate.mockImplementationOnce(() => { throw new Error('no cadence column') })
    mockConflictNothing.mockReturnValueOnce(returning([{ id: 7 }]))

    const res = await call({ email: 'a@b.com', itemId: 1 })
    expect(res.status).toBe(200)
    expect(mockSendConfirm).not.toHaveBeenCalled()
  })
  it('will not mail the same address twice inside the cooldown', async () => {
    // The IP limiter caps the sender; this caps the recipient. Without it,
    // varying itemId made every request a fresh unconfirmed row that mailed
    // again; a way to point the site's own sending domain at a stranger.
    confirmsSent(1, 1)
    mockConflictUpdate.mockReturnValueOnce(
      returning([{ isNew: true, token: 'tok', confirmedAt: null }]))

    const res = await call({ email: 'victim@example.com', itemId: 1 })
    // Still a 200: the reminder is genuinely recorded, and telling a caller
    // which addresses are in cooldown would answer a question they should
    // not get to ask.
    expect(res.status).toBe(200)
    expect(mockSendConfirm).not.toHaveBeenCalled()
  })

  it('stops at the daily cap even once the cooldown has passed', async () => {
    confirmsSent(0, 5)
    mockConflictUpdate.mockReturnValueOnce(
      returning([{ isNew: true, token: 'tok', confirmedAt: null }]))

    await call({ email: 'victim@example.com', itemId: 1 })
    expect(mockSendConfirm).not.toHaveBeenCalled()
  })

  it('mails when the address is under both limits', async () => {
    confirmsSent(0, 4)
    mockConflictUpdate.mockReturnValueOnce(
      returning([{ isNew: true, token: 'tok', confirmedAt: null }]))

    await call({ email: 'a@b.com', itemId: 1 })
    expect(mockSendConfirm).toHaveBeenCalledOnce()
  })

  it('still sends when the cooldown query itself fails', async () => {
    // Fails open on purpose: a student who never gets their confirmation is a
    // reminder that never arrives, and this is harassment mitigation, not an
    // authorisation gate.
    mockSelect.mockImplementationOnce(() => { throw new Error('no such column') })
    mockConflictUpdate.mockReturnValueOnce(
      returning([{ isNew: true, token: 'tok', confirmedAt: null }]))

    await call({ email: 'a@b.com', itemId: 1 })
    expect(mockSendConfirm).toHaveBeenCalledOnce()
  })

  it('builds the confirm link on the canonical origin, not the request host', async () => {
    // The mail ships from the real alerts@ address with valid SPF/DKIM and
    // carries the opt-in token, so its one link must not follow whatever host
    // the request arrived on; the project's own pages.dev alias reaches the
    // deployment with no spoofing at all.
    mockConflictUpdate.mockReturnValueOnce(
      returning([{ isNew: true, token: 'tok', confirmedAt: null }]))

    await callFromHost('https://scholarab.pages.dev', { email: 'a@b.com', itemId: 1 })
    expect(mockSendConfirm.mock.calls[0]![2])
      .toBe('https://www.scholarab.ca/api/confirm?token=tok')
  })

  it('keeps the link local when the request really is local', async () => {
    // Otherwise testing the confirm flow against astro dev or wrangler means
    // hand-editing every URL. A local host is only reachable from the machine
    // running it, so it is not a host anyone else can present.
    mockConflictUpdate.mockReturnValueOnce(
      returning([{ isNew: true, token: 'tok', confirmedAt: null }]))

    await callFromHost('http://localhost:4321', { email: 'a@b.com', itemId: 1 })
    expect(mockSendConfirm.mock.calls[0]![2])
      .toBe('http://localhost:4321/api/confirm?token=tok')
  })
})
