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
  mutationLog: { userId: 'userId', createdAt: 'createdAt' },
}))

vi.mock('drizzle-orm', () => ({
  eq:  vi.fn(() => 'eq'),
  gte: vi.fn(() => 'gte'),
  and: vi.fn(() => 'and'),
  sql: vi.fn(() => 'count_sql'),
}))

import { checkMutationRateLimit } from '../lib/adminRateLimit'

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

describe('checkMutationRateLimit', () => {
  it('returns true and logs when count is below limit', async () => {
    mockSelect.mockReturnValue(selectChain([{ count: 0 }]))
    const result = await checkMutationRateLimit('user-1')
    expect(result).toBe(true)
    expect(mockInsert).toHaveBeenCalled()
  })

  it('returns true when count is exactly one below limit (99)', async () => {
    mockSelect.mockReturnValue(selectChain([{ count: 99 }]))
    const result = await checkMutationRateLimit('user-1')
    expect(result).toBe(true)
    expect(mockInsert).toHaveBeenCalled()
  })

  it('returns false and does not log when count equals limit (100)', async () => {
    mockSelect.mockReturnValue(selectChain([{ count: 100 }]))
    const result = await checkMutationRateLimit('user-1')
    expect(result).toBe(false)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns false when count exceeds limit', async () => {
    mockSelect.mockReturnValue(selectChain([{ count: 150 }]))
    const result = await checkMutationRateLimit('user-1')
    expect(result).toBe(false)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('passes userId to the query', async () => {
    const { eq } = await import('drizzle-orm')
    mockSelect.mockReturnValue(selectChain([{ count: 0 }]))
    await checkMutationRateLimit('specific-user-id')
    expect(eq).toHaveBeenCalledWith(expect.anything(), 'specific-user-id')
  })
})
