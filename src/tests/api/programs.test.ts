import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as listPrograms, POST } from '../../pages/admin/api/programs/index'
import { GET, PUT, DELETE } from '../../pages/admin/api/programs/[id]'

// ── Mocks ─────────────────────────────────────────────────────────────────────

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
  researchPrograms: { id: 'id', name: 'name', updatedAt: 'updatedAt' },
}))

vi.mock('drizzle-orm', () => ({
  ilike: vi.fn(() => 'ilike'),
  eq:    vi.fn(() => 'eq'),
  desc:  vi.fn(() => 'desc'),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const AUTHED = { user: { id: '1', email: 'admin@test.com' } }

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

function req(method: string, id: string | null, body?: object) {
  const url = id
    ? `http://localhost/admin/api/programs/${id}`
    : `http://localhost/admin/api/programs`
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const VALID_BODY = { name: 'Test Program', url: 'https://example.com', paid: false }

const STORED_ROW = {
  id: 1, name: 'Test Program', emoji: null, category: 'Science',
  provider: null, grades: null, duration: null, paid: false,
  stipend: null, location: null, eligibility: null, deadline: null,
  url: 'https://example.com', description: null, lastVerified: null,
  active: true, updatedAt: new Date('2026-04-05'),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimit.mockResolvedValue(true)
  mockLogAudit.mockResolvedValue(undefined)
})

// ── GET /admin/api/programs ───────────────────────────────────────────────────

describe('GET /admin/api/programs', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await listPrograms({ request: req('GET', null) } as any)
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 200 with array of programs', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValue(chain([STORED_ROW]))
    const res = await listPrograms({ request: req('GET', null) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('Test Program')
  })

  it('returns 200 with empty array when no programs', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValue(chain([]))
    const res = await listPrograms({ request: req('GET', null) } as any)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})

// ── POST /admin/api/programs ──────────────────────────────────────────────────

describe('POST /admin/api/programs', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await POST({ request: req('POST', null, VALID_BODY) } as any)
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockRateLimit.mockResolvedValue(false)
    const res = await POST({ request: req('POST', null, VALID_BODY) } as any)
    expect(res.status).toBe(429)
    expect(await res.json()).toMatchObject({ error: 'Rate limit exceeded' })
  })

  it('returns 400 when name is missing', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await POST({ request: req('POST', null, { url: 'https://example.com' }) } as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when name is empty string', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await POST({ request: req('POST', null, { name: '', url: 'https://example.com' }) } as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when URL is invalid', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await POST({ request: req('POST', null, { name: 'Test', url: 'bad-url' }) } as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when URL uses HTTP instead of HTTPS', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await POST({ request: req('POST', null, { name: 'Test', url: 'http://example.com' }) } as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when name exceeds max length', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await POST({ request: req('POST', null, { name: 'x'.repeat(501), url: 'https://example.com' }) } as any)
    expect(res.status).toBe(400)
  })

  it('returns 409 with duplicate error when name already exists', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValue(chain([{ id: 1, name: 'Test Program' }]))
    const res = await POST({ request: req('POST', null, VALID_BODY) } as any)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('duplicate')
    expect(body.existing).toBe('Test Program')
  })

  it('returns 201 with created program on success', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValueOnce(chain([]))       // duplicate check: none found
    mockInsert.mockReturnValue(chain([STORED_ROW])) // insert: returns new row
    const res = await POST({ request: req('POST', null, VALID_BODY) } as any)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toBe('Test Program')
    expect(body.id).toBe(1)
    expect(mockLogAudit).toHaveBeenCalledWith('1', 'CREATE', 'program', 1)
  })

  it('applies default paid=false when omitted', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValueOnce(chain([]))
    mockInsert.mockReturnValue(chain([STORED_ROW]))
    const res = await POST({ request: req('POST', null, { name: 'Test', url: 'https://example.com' }) } as any)
    expect(res.status).toBe(201)
  })

  it('returns 400 when DB throws', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValueOnce(chain([]))
    mockInsert.mockReturnValue({
      values: () => ({ returning: () => Promise.reject(new Error('DB error')) }),
    })
    const res = await POST({ request: req('POST', null, VALID_BODY) } as any)
    expect(res.status).toBe(400)
  })
})

// ── GET /admin/api/programs/[id] ──────────────────────────────────────────────

describe('GET /admin/api/programs/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await GET({ request: req('GET', '1'), params: { id: '1' } } as any)
    expect(res.status).toBe(401)
  })

  it('returns 400 for non-numeric id', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await GET({ request: req('GET', 'abc'), params: { id: 'abc' } } as any)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Invalid ID' })
  })

  it('returns 404 when program not found', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValue(chain([]))
    const res = await GET({ request: req('GET', '999'), params: { id: '999' } } as any)
    expect(res.status).toBe(404)
  })

  it('returns 200 with program when found', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValue(chain([STORED_ROW]))
    const res = await GET({ request: req('GET', '1'), params: { id: '1' } } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(1)
    expect(body.name).toBe('Test Program')
  })
})

// ── PUT /admin/api/programs/[id] ──────────────────────────────────────────────

describe('PUT /admin/api/programs/[id]', () => {
  const UPDATE_BODY = { name: 'Updated Program', url: 'https://example.com' }

  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await PUT({ request: req('PUT', '1', UPDATE_BODY), params: { id: '1' } } as any)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockRateLimit.mockResolvedValue(false)
    const res = await PUT({ request: req('PUT', '1', UPDATE_BODY), params: { id: '1' } } as any)
    expect(res.status).toBe(429)
  })

  it('returns 400 for non-numeric id', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await PUT({ request: req('PUT', 'xyz', UPDATE_BODY), params: { id: 'xyz' } } as any)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Invalid ID' })
  })

  it('returns 400 when URL is invalid', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await PUT({
      request: req('PUT', '1', { url: 'not-a-url' }),
      params: { id: '1' },
    } as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when URL uses HTTP instead of HTTPS', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await PUT({
      request: req('PUT', '1', { url: 'http://example.com' }),
      params: { id: '1' },
    } as any)
    expect(res.status).toBe(400)
  })

  it('returns 409 conflict when optimistic lock timestamp differs', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValue(chain([{ updatedAt: new Date('2026-04-05T11:00:00Z') }]))
    const bodyWithStaleTimestamp = { ...UPDATE_BODY, updatedAt: '2026-04-05T10:00:00Z' }
    const res = await PUT({
      request: req('PUT', '1', bodyWithStaleTimestamp),
      params: { id: '1' },
    } as any)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('conflict')
  })

  it('returns 404 when record not found during optimistic lock check', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValue(chain([]))
    const bodyWithTimestamp = { ...UPDATE_BODY, updatedAt: '2026-04-05T10:00:00Z' }
    const res = await PUT({
      request: req('PUT', '1', bodyWithTimestamp),
      params: { id: '1' },
    } as any)
    expect(res.status).toBe(404)
  })

  it('returns 200 with updated program when timestamps match', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const ts = '2026-04-05T10:00:00Z'
    mockSelect.mockReturnValue(chain([{ updatedAt: new Date(ts) }]))
    mockUpdate.mockReturnValue(chain([{ ...STORED_ROW, name: 'Updated Program' }]))
    const bodyWithTimestamp = { ...UPDATE_BODY, updatedAt: ts }
    const res = await PUT({
      request: req('PUT', '1', bodyWithTimestamp),
      params: { id: '1' },
    } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Updated Program')
    expect(mockLogAudit).toHaveBeenCalledWith('1', 'UPDATE', 'program', 1)
  })

  it('returns 200 without optimistic lock check when no updatedAt provided', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockUpdate.mockReturnValue(chain([{ ...STORED_ROW, name: 'Updated Program' }]))
    const res = await PUT({
      request: req('PUT', '1', UPDATE_BODY),
      params: { id: '1' },
    } as any)
    expect(res.status).toBe(200)
  })

  it('returns 404 when update finds no record', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockUpdate.mockReturnValue(chain([]))
    const res = await PUT({ request: req('PUT', '1', UPDATE_BODY), params: { id: '1' } } as any)
    expect(res.status).toBe(404)
  })

  it('returns 400 when DB throws', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockUpdate.mockReturnValue({
      set: () => ({ where: () => ({ returning: () => Promise.reject(new Error('DB error')) }) }),
    })
    const res = await PUT({ request: req('PUT', '1', UPDATE_BODY), params: { id: '1' } } as any)
    expect(res.status).toBe(400)
  })
})

// ── DELETE /admin/api/programs/[id] ──────────────────────────────────────────

describe('DELETE /admin/api/programs/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await DELETE({ request: req('DELETE', '1'), params: { id: '1' } } as any)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockRateLimit.mockResolvedValue(false)
    const res = await DELETE({ request: req('DELETE', '1'), params: { id: '1' } } as any)
    expect(res.status).toBe(429)
  })

  it('returns 400 for non-numeric id', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    const res = await DELETE({ request: req('DELETE', 'abc'), params: { id: 'abc' } } as any)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Invalid ID' })
  })

  it('returns 204 on successful deletion', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockDelete.mockReturnValue(chain(undefined))
    const res = await DELETE({ request: req('DELETE', '1'), params: { id: '1' } } as any)
    expect(res.status).toBe(204)
    expect(mockLogAudit).toHaveBeenCalledWith('1', 'DELETE', 'program', 1)
  })

  it('returns 400 when DB throws during deletion', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockDelete.mockReturnValue({
      where: () => Promise.reject(new Error('constraint violation')),
    })
    const res = await DELETE({ request: req('DELETE', '1'), params: { id: '1' } } as any)
    expect(res.status).toBe(400)
  })
})
