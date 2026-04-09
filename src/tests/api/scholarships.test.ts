import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../../pages/admin/api/scholarships/index'
import { GET as getById, PUT, DELETE } from '../../pages/admin/api/scholarships/[id]'

// ── Mocks ─────────────────────────────────────────────────────────────────────
// vi.hoisted ensures these are initialised before the hoisted vi.mock factories run.

const { mockGetSession, mockSelect, mockInsert, mockUpdate, mockDelete, mockRateLimit, mockLogAudit } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSelect:     vi.fn(),
  mockInsert:     vi.fn(),
  mockUpdate:     vi.fn(),
  mockDelete:     vi.fn(),
  mockRateLimit:  vi.fn(),
  mockLogAudit:   vi.fn(),
}))

vi.mock('../../lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}))

vi.mock('../../lib/adminRateLimit', () => ({
  checkMutationRateLimit: mockRateLimit,
}))

vi.mock('../../lib/audit', () => ({
  logAudit: mockLogAudit,
}))

vi.mock('../../lib/db/client', () => ({
  db: {
    select: (...a: any[]) => mockSelect(...a),
    insert: (...a: any[]) => mockInsert(...a),
    update: (...a: any[]) => mockUpdate(...a),
    delete: (...a: any[]) => mockDelete(...a),
  },
}))

vi.mock('../../lib/db/schema', () => ({
  scholarships: { id: 'id', title: 'title', updatedAt: 'updatedAt' },
}))

vi.mock('drizzle-orm', () => ({
  ilike: vi.fn(() => 'ilike'),
  eq:    vi.fn(() => 'eq'),
  desc:  vi.fn(() => 'desc'),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const AUTHED = { user: { id: '1', email: 'admin@test.com' } }

/** Creates a chainable, awaitable mock DB query that resolves to `value`. */
function chain(value: unknown) {
  const resolve = () => Promise.resolve(value)
  const c: Record<string, any> = {
    from:      () => c,
    where:     () => c,
    orderBy:   () => c,
    limit:     () => c,
    set:       () => c,
    values:    () => c,
    returning: resolve,
    then:      (ok: any, fail: any) => resolve().then(ok, fail),
    catch:     (fail: any) => resolve().catch(fail),
  }
  return c
}

function req(method: string, body?: object) {
  return new Request(`http://localhost/admin/api/scholarships`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function reqWithId(method: string, id: string, body?: object) {
  return new Request(`http://localhost/admin/api/scholarships/${id}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const VALID_BODY = { title: 'Test Scholarship', amount: '$1,000', url: 'https://example.com' }

const STORED_ROW = {
  id: 1, title: 'Test Scholarship', amount: '$1,000', url: 'https://example.com',
  deadline: null, openDate: null, audience: null, category: null,
  lastVerified: null, region: null, notes: null,
  applyViaGuidance: false, active: true, eligibility: null,
  updatedAt: new Date('2026-04-05T10:00:00Z'),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimit.mockResolvedValue(true)
  mockLogAudit.mockResolvedValue(undefined)
})

// ── GET /admin/api/scholarships ───────────────────────────────────────────────

describe('GET /admin/api/scholarships', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await GET({ request: req('GET') } as any)
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 200 with array of scholarships', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValue(chain([STORED_ROW]))
    const res = await GET({ request: req('GET') } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].title).toBe('Test Scholarship')
  })

  it('returns 200 with empty array when no scholarships', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValue(chain([]))
    const res = await GET({ request: req('GET') } as any)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('applies limit to the query (safety cap)', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const rows = Array.from({ length: 5 }, (_, i) => ({ ...STORED_ROW, id: i + 1 }))
    mockSelect.mockReturnValue(chain(rows))
    const res = await GET({ request: req('GET') } as any)
    expect(res.status).toBe(200)
    expect(await res.json()).toHaveLength(5)
  })
})

// ── POST /admin/api/scholarships ──────────────────────────────────────────────

describe('POST /admin/api/scholarships', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await POST({ request: req('POST', VALID_BODY) } as any)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockRateLimit.mockResolvedValue(false)
    const res = await POST({ request: req('POST', VALID_BODY) } as any)
    expect(res.status).toBe(429)
    expect(await res.json()).toMatchObject({ error: 'Rate limit exceeded' })
  })

  it('returns 400 when title is missing', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await POST({ request: req('POST', { amount: '$1,000', url: 'https://example.com' }) } as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when amount is missing', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await POST({ request: req('POST', { title: 'Test', url: 'https://example.com' }) } as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when URL is invalid', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await POST({ request: req('POST', { title: 'Test', amount: '$1,000', url: 'not-a-url' }) } as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when URL uses HTTP instead of HTTPS', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await POST({ request: req('POST', { title: 'Test', amount: '$1,000', url: 'http://example.com' }) } as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when title exceeds max length', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await POST({ request: req('POST', { title: 'x'.repeat(501), amount: '$1,000', url: 'https://example.com' }) } as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when title is empty string', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await POST({ request: req('POST', { title: '', amount: '$1,000', url: 'https://example.com' }) } as any)
    expect(res.status).toBe(400)
  })

  it('returns 409 with duplicate error when title already exists', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValue(chain([{ id: 1, title: 'Test Scholarship' }]))
    const res = await POST({ request: req('POST', VALID_BODY) } as any)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('duplicate')
    expect(body.existing).toBe('Test Scholarship')
  })

  it('returns 201 with created scholarship when no duplicate', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValueOnce(chain([]))          // duplicate check: none found
    mockInsert.mockReturnValue(chain([STORED_ROW]))    // insert: returns new row
    const res = await POST({ request: req('POST', VALID_BODY) } as any)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.title).toBe('Test Scholarship')
    expect(body.id).toBe(1)
    expect(mockLogAudit).toHaveBeenCalledWith('1', 'CREATE', 'scholarship', 1)
  })

  it('returns 400 when eligibility has wrong shape', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await POST({ request: req('POST', { ...VALID_BODY, eligibility: { grades: 'not-an-array' } }) } as any)
    expect(res.status).toBe(400)
  })

  it('accepts valid eligibility object', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValueOnce(chain([]))
    mockInsert.mockReturnValue(chain([STORED_ROW]))
    const validEligibility = { grades: ['11', '12'], financialNeed: true }
    const res = await POST({ request: req('POST', { ...VALID_BODY, eligibility: validEligibility }) } as any)
    expect(res.status).toBe(201)
  })

  it('applies default applyViaGuidance=false when omitted', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValueOnce(chain([]))
    mockInsert.mockReturnValue(chain([STORED_ROW]))
    const res = await POST({ request: req('POST', VALID_BODY) } as any)
    expect(res.status).toBe(201)
  })
})

// ── GET /admin/api/scholarships/[id] ─────────────────────────────────────────

describe('GET /admin/api/scholarships/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await getById({ request: reqWithId('GET', '1'), params: { id: '1' } } as any)
    expect(res.status).toBe(401)
  })

  it('returns 400 for non-numeric id', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await getById({ request: reqWithId('GET', 'abc'), params: { id: 'abc' } } as any)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Invalid ID' })
  })

  it('returns 404 when scholarship not found', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValue(chain([]))
    const res = await getById({ request: reqWithId('GET', '999'), params: { id: '999' } } as any)
    expect(res.status).toBe(404)
  })

  it('returns 200 with scholarship when found', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValue(chain([STORED_ROW]))
    const res = await getById({ request: reqWithId('GET', '1'), params: { id: '1' } } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(1)
  })
})

// ── PUT /admin/api/scholarships/[id] ─────────────────────────────────────────

describe('PUT /admin/api/scholarships/[id]', () => {
  const UPDATE_BODY = { title: 'Updated Title', amount: '$2,000', url: 'https://example.com' }

  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await PUT({ request: reqWithId('PUT', '1', UPDATE_BODY), params: { id: '1' } } as any)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockRateLimit.mockResolvedValue(false)
    const res = await PUT({ request: reqWithId('PUT', '1', UPDATE_BODY), params: { id: '1' } } as any)
    expect(res.status).toBe(429)
  })

  it('returns 400 for non-numeric id', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await PUT({ request: reqWithId('PUT', 'abc', UPDATE_BODY), params: { id: 'abc' } } as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when URL is invalid', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await PUT({
      request: reqWithId('PUT', '1', { url: 'not-a-url' }),
      params: { id: '1' },
    } as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when URL uses HTTP instead of HTTPS', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await PUT({
      request: reqWithId('PUT', '1', { url: 'http://example.com' }),
      params: { id: '1' },
    } as any)
    expect(res.status).toBe(400)
  })

  it('returns 409 conflict when optimistic lock timestamp differs', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    // DB has a different updatedAt than what the client sent
    mockSelect.mockReturnValue(chain([{ updatedAt: new Date('2026-04-05T11:00:00Z') }]))
    const bodyWithStaleTimestamp = { ...UPDATE_BODY, updatedAt: '2026-04-05T10:00:00Z' }
    const res = await PUT({
      request: reqWithId('PUT', '1', bodyWithStaleTimestamp),
      params: { id: '1' },
    } as any)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('conflict')
  })

  it('returns 404 when record not found during optimistic lock check', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValue(chain([]))   // record not found
    const bodyWithTimestamp = { ...UPDATE_BODY, updatedAt: '2026-04-05T10:00:00Z' }
    const res = await PUT({
      request: reqWithId('PUT', '1', bodyWithTimestamp),
      params: { id: '1' },
    } as any)
    expect(res.status).toBe(404)
  })

  it('returns 200 with updated scholarship when timestamps match', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const ts = '2026-04-05T10:00:00Z'
    mockSelect.mockReturnValue(chain([{ updatedAt: new Date(ts) }]))
    mockUpdate.mockReturnValue(chain([{ ...STORED_ROW, title: 'Updated Title' }]))
    const bodyWithTimestamp = { ...UPDATE_BODY, updatedAt: ts }
    const res = await PUT({
      request: reqWithId('PUT', '1', bodyWithTimestamp),
      params: { id: '1' },
    } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.title).toBe('Updated Title')
    expect(mockLogAudit).toHaveBeenCalledWith('1', 'UPDATE', 'scholarship', 1)
  })

  it('returns 200 without optimistic lock check when no updatedAt provided', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockUpdate.mockReturnValue(chain([{ ...STORED_ROW, title: 'Updated Title' }]))
    const res = await PUT({
      request: reqWithId('PUT', '1', UPDATE_BODY),
      params: { id: '1' },
    } as any)
    expect(res.status).toBe(200)
  })

  it('returns 404 when update finds no record', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockUpdate.mockReturnValue(chain([]))   // update returns empty → not found
    const res = await PUT({
      request: reqWithId('PUT', '1', UPDATE_BODY),
      params: { id: '1' },
    } as any)
    expect(res.status).toBe(404)
  })
})

// ── DELETE /admin/api/scholarships/[id] ──────────────────────────────────────

describe('DELETE /admin/api/scholarships/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await DELETE({ request: reqWithId('DELETE', '1'), params: { id: '1' } } as any)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockRateLimit.mockResolvedValue(false)
    const res = await DELETE({ request: reqWithId('DELETE', '1'), params: { id: '1' } } as any)
    expect(res.status).toBe(429)
  })

  it('returns 400 for non-numeric id', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await DELETE({ request: reqWithId('DELETE', 'abc'), params: { id: 'abc' } } as any)
    expect(res.status).toBe(400)
  })

  it('returns 204 on successful deletion', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockDelete.mockReturnValue(chain(undefined))
    const res = await DELETE({ request: reqWithId('DELETE', '1'), params: { id: '1' } } as any)
    expect(res.status).toBe(204)
    expect(mockLogAudit).toHaveBeenCalledWith('1', 'DELETE', 'scholarship', 1)
  })

  it('returns 400 when DB throws during deletion', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockDelete.mockReturnValue({
      where: () => Promise.reject(new Error('DB error')),
    })
    const res = await DELETE({ request: reqWithId('DELETE', '1'), params: { id: '1' } } as any)
    expect(res.status).toBe(400)
  })
})
