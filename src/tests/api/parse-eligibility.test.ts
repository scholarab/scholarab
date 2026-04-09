import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../../pages/admin/api/scholarships/parse-eligibility'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockGetSession, mockSelect, mockInsert, mockCreate } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSelect:     vi.fn(),
  mockInsert:     vi.fn(),
  mockCreate:     vi.fn(),
}))

vi.mock('../../lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}))

vi.mock('../../lib/db/client', () => ({
  db: {
    select: (...a: any[]) => mockSelect(...a),
    insert: (...a: any[]) => mockInsert(...a),
  },
}))

vi.mock('../../lib/db/schema', () => ({
  scholarships: { id: 'id', title: 'title', audience: 'audience', category: 'category', region: 'region' },
  parseLog: { userId: 'userId', createdAt: 'createdAt' },
}))

vi.mock('drizzle-orm', () => ({
  eq:  vi.fn(() => 'eq'),
  gte: vi.fn(() => 'gte'),
  and: vi.fn(() => 'and'),
  sql: vi.fn(() => 'count_sql'),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  // Must use regular function (not arrow) so `new Anthropic()` works correctly
  default: vi.fn(function (this: any) {
    this.messages = { create: mockCreate }
  }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const AUTHED = { user: { id: 'user-1', email: 'admin@test.com' } }

const STORED_SCHOLARSHIP = {
  id: 1,
  title: 'Test Scholarship',
  audience: 'Grade 12 students with financial need',
  category: 'Science',
  region: 'Alberta',
}

const VALID_ELIGIBILITY_JSON = JSON.stringify({
  grades: ['12'],
  schoolBoards: [],
  specificSchools: [],
  targetInstitutions: [],
  fields: ['STEM'],
  minAverage: 75,
  minAge: null,
  maxAge: null,
  genderRequired: null,
  indigenousRequired: false,
  bipocRequired: false,
  financialNeed: true,
  maxFamilyIncome: null,
  fosterCare: false,
  citizenship: 'canadian',
  apprenticeship: false,
  extracurriculars: [],
})

function selectChain(value: unknown) {
  const resolve = () => Promise.resolve(value)
  const c: Record<string, any> = {
    from:    () => c,
    where:   () => c,
    then:    (ok: any, fail: any) => resolve().then(ok, fail),
    catch:   (fail: any) => resolve().catch(fail),
  }
  return c
}

function req(body: object) {
  return new Request('http://localhost/admin/api/scholarships/parse-eligibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Set up the two select calls needed for a successful parse:
 *  1. Rate limit check → count=0
 *  2. Scholarship lookup → stored row
 */
function setupHappyPath() {
  mockSelect
    .mockReturnValueOnce(selectChain([{ count: 0 }]))    // rate limit: not exceeded
    .mockReturnValueOnce(selectChain([STORED_SCHOLARSHIP])) // scholarship found
  mockInsert.mockReturnValue({ values: () => Promise.resolve() })
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text: VALID_ELIGIBILITY_JSON }],
  })
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

// ── Auth & rate limit ─────────────────────────────────────────────────────────

describe('POST /admin/api/scholarships/parse-eligibility — auth & rate limit', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await POST({ request: req({ id: 1 }) } as any)
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 429 when parse rate limit is exceeded', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValue(selectChain([{ count: 20 }])) // count >= 20
    const res = await POST({ request: req({ id: 1 }) } as any)
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toContain('Rate limit')
  })

  it('returns 429 when count exceeds limit', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValue(selectChain([{ count: 50 }]))
    const res = await POST({ request: req({ id: 1 }) } as any)
    expect(res.status).toBe(429)
  })
})

// ── Config & input validation ─────────────────────────────────────────────────

describe('POST /admin/api/scholarships/parse-eligibility — validation', () => {
  it('returns 500 when ANTHROPIC_API_KEY is not configured', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValueOnce(selectChain([{ count: 0 }]))
    mockInsert.mockReturnValue({ values: () => Promise.resolve() })
    delete process.env.ANTHROPIC_API_KEY

    const res = await POST({ request: req({ id: 1 }) } as any)
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'ANTHROPIC_API_KEY not configured' })
  })

  it('returns 400 when id is not a number', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValueOnce(selectChain([{ count: 0 }]))
    mockInsert.mockReturnValue({ values: () => Promise.resolve() })
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'

    const res = await POST({ request: req({ id: 'not-a-number' }) } as any)
    expect(res.status).toBe(400)
  })

  it('returns 404 when scholarship is not found', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect
      .mockReturnValueOnce(selectChain([{ count: 0 }]))
      .mockReturnValueOnce(selectChain([]))   // no scholarship
    mockInsert.mockReturnValue({ values: () => Promise.resolve() })
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'

    const res = await POST({ request: req({ id: 999 }) } as any)
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ error: 'Not found' })
  })

  it('returns 400 when scholarship has no audience text', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect
      .mockReturnValueOnce(selectChain([{ count: 0 }]))
      .mockReturnValueOnce(selectChain([{ ...STORED_SCHOLARSHIP, audience: '' }]))
    mockInsert.mockReturnValue({ values: () => Promise.resolve() })
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'

    const res = await POST({ request: req({ id: 1 }) } as any)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'No audience text to parse' })
  })

  it('returns 400 when scholarship audience is null', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect
      .mockReturnValueOnce(selectChain([{ count: 0 }]))
      .mockReturnValueOnce(selectChain([{ ...STORED_SCHOLARSHIP, audience: null }]))
    mockInsert.mockReturnValue({ values: () => Promise.resolve() })
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'

    const res = await POST({ request: req({ id: 1 }) } as any)
    expect(res.status).toBe(400)
  })
})

// ── AI parsing ────────────────────────────────────────────────────────────────

describe('POST /admin/api/scholarships/parse-eligibility — AI parsing', () => {
  it('returns 200 with parsed eligibility when AI returns valid JSON', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    setupHappyPath()

    const res = await POST({ request: req({ id: 1 }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.eligibility).toBeDefined()
    expect(body.eligibility.grades).toEqual(['12'])
    expect(body.eligibility.financialNeed).toBe(true)
    expect(body.eligibility.citizenship).toBe('canadian')
  })

  it('strips markdown code fences from AI response', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect
      .mockReturnValueOnce(selectChain([{ count: 0 }]))
      .mockReturnValueOnce(selectChain([STORED_SCHOLARSHIP]))
    mockInsert.mockReturnValue({ values: () => Promise.resolve() })
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '```json\n' + VALID_ELIGIBILITY_JSON + '\n```' }],
    })

    const res = await POST({ request: req({ id: 1 }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.eligibility.grades).toEqual(['12'])
  })

  it('returns 502 when AI returns invalid JSON', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect
      .mockReturnValueOnce(selectChain([{ count: 0 }]))
      .mockReturnValueOnce(selectChain([STORED_SCHOLARSHIP]))
    mockInsert.mockReturnValue({ values: () => Promise.resolve() })
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not valid json at all' }],
    })

    const res = await POST({ request: req({ id: 1 }) } as any)
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('AI returned invalid JSON')
    // raw AI output must NOT be exposed
    expect(body.raw).toBeUndefined()
  })

  it('merges AI output with EMPTY_ELIGIBILITY defaults', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    // AI returns only a partial object — missing keys should get defaults
    const partialJson = JSON.stringify({ grades: ['11'], financialNeed: true })
    mockSelect
      .mockReturnValueOnce(selectChain([{ count: 0 }]))
      .mockReturnValueOnce(selectChain([STORED_SCHOLARSHIP]))
    mockInsert.mockReturnValue({ values: () => Promise.resolve() })
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: partialJson }],
    })

    const res = await POST({ request: req({ id: 1 }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    // Provided fields
    expect(body.eligibility.grades).toEqual(['11'])
    expect(body.eligibility.financialNeed).toBe(true)
    // Defaulted fields from EMPTY_ELIGIBILITY
    expect(Array.isArray(body.eligibility.schoolBoards)).toBe(true)
    expect(body.eligibility.indigenousRequired).toBe(false)
  })

  it('returns 500 when the DB throws during the operation', async () => {
    mockGetSession.mockResolvedValue(AUTHED)
    mockSelect.mockReturnValueOnce(selectChain([{ count: 0 }]))
    mockInsert.mockReturnValue({ values: () => Promise.resolve() })
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
    // Second select (scholarship lookup) throws
    mockSelect.mockReturnValueOnce({
      from: () => ({ where: () => Promise.reject(new Error('DB error')) }),
    })

    const res = await POST({ request: req({ id: 1 }) } as any)
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'Internal server error' })
  })
})
