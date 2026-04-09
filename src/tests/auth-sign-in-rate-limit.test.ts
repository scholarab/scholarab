import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSelect, mockInsert } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
}))

vi.mock('../lib/db/client', () => ({
  db: {
    select: (...a: any[]) => mockSelect(...a),
    insert: (...a: any[]) => mockInsert(...a),
  },
}))

vi.mock('../lib/db/schema', () => ({
  authRateLimit: { ip: 'ip', createdAt: 'createdAt' },
}))

vi.mock('drizzle-orm', () => ({
  eq:  vi.fn(() => 'eq'),
  gte: vi.fn(() => 'gte'),
  and: vi.fn(() => 'and'),
  sql: vi.fn(() => 'count_sql'),
}))

import { checkSignInRateLimit } from '../lib/authSignInRateLimit'

function selectChain(value: unknown) {
  const resolve = () => Promise.resolve(value)
  const c: Record<string, any> = {
    from:  () => c,
    where: () => c,
    then:  (ok: any, fail: any) => resolve().then(ok, fail),
    catch: (fail: any) => resolve().catch(fail),
  }
  return c
}

beforeEach(() => {
  vi.clearAllMocks()
  mockInsert.mockReturnValue({ values: () => Promise.resolve() })
})

describe('checkSignInRateLimit', () => {
  it('returns true and logs when count is below limit', async () => {
    mockSelect.mockReturnValue(selectChain([{ count: 0 }]))
    const result = await checkSignInRateLimit('1.2.3.4')
    expect(result).toBe(true)
    expect(mockInsert).toHaveBeenCalled()
  })

  it('returns true when count is exactly one below limit (9)', async () => {
    mockSelect.mockReturnValue(selectChain([{ count: 9 }]))
    const result = await checkSignInRateLimit('1.2.3.4')
    expect(result).toBe(true)
    expect(mockInsert).toHaveBeenCalled()
  })

  it('returns false and does not log when count equals limit (10)', async () => {
    mockSelect.mockReturnValue(selectChain([{ count: 10 }]))
    const result = await checkSignInRateLimit('1.2.3.4')
    expect(result).toBe(false)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns false when count exceeds limit', async () => {
    mockSelect.mockReturnValue(selectChain([{ count: 25 }]))
    const result = await checkSignInRateLimit('1.2.3.4')
    expect(result).toBe(false)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('passes IP to the query', async () => {
    const { eq } = await import('drizzle-orm')
    mockSelect.mockReturnValue(selectChain([{ count: 0 }]))
    await checkSignInRateLimit('5.6.7.8')
    expect(eq).toHaveBeenCalledWith(expect.anything(), '5.6.7.8')
  })
})
