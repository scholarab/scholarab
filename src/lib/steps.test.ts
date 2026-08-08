import { describe, it, expect, beforeEach, vi } from 'vitest'

// Same pattern as tracker.test.ts: the module memoizes localStorage in a
// module-level cache, so each test needs a fresh import.
beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

const KEY = 'scholarab_app_steps'

const read = (): unknown => JSON.parse(localStorage.getItem(KEY) || 'null')

describe('getSteps', () => {
  it('returns four untouched steps for an unknown id', async () => {
    const { getSteps } = await import('./steps')
    expect(getSteps(1)).toEqual([false, false, false, false])
  })

  it('reads stored ticks back', async () => {
    localStorage.setItem(KEY, JSON.stringify({ 7: [true, false, true, false] }))
    const { getSteps } = await import('./steps')
    expect(getSteps(7)).toEqual([true, false, true, false])
  })

  it('pads and truncates a wrong-length row', async () => {
    localStorage.setItem(KEY, JSON.stringify({ 7: [true], 8: [true, true, true, true, true, true] }))
    const { getSteps } = await import('./steps')
    expect(getSteps(7)).toEqual([true, false, false, false])
    expect(getSteps(8)).toHaveLength(4)
  })

  it('survives unparseable storage', async () => {
    localStorage.setItem(KEY, '{not json')
    const { getSteps } = await import('./steps')
    expect(getSteps(1)).toEqual([false, false, false, false])
  })

  // An array here would make Object.entries yield '0','1',… and invent ticks
  // for ids 0 and 1.
  it('ignores a stored array', async () => {
    localStorage.setItem(KEY, JSON.stringify([[true, true, true, true]]))
    const { getSteps } = await import('./steps')
    expect(getSteps(0)).toEqual([false, false, false, false])
  })

  it('drops non-numeric keys', async () => {
    localStorage.setItem(KEY, JSON.stringify({ 'abc': [true, true, true, true], 3: [true, false, false, false] }))
    const { getSteps } = await import('./steps')
    expect(getSteps(3)).toEqual([true, false, false, false])
    expect(read()).toBeTruthy()
  })
})

describe('toggleStep', () => {
  it('flips one step and persists it', async () => {
    const { toggleStep, getSteps } = await import('./steps')
    expect(toggleStep(5, 2)).toEqual([false, false, true, false])
    expect(getSteps(5)).toEqual([false, false, true, false])
    expect(read()).toEqual({ 5: [false, false, true, false] })
  })

  it('flips back off', async () => {
    const { toggleStep } = await import('./steps')
    toggleStep(5, 0)
    expect(toggleStep(5, 0)).toEqual([false, false, false, false])
  })

  // An all-false row is indistinguishable from never having been touched, and
  // keeping one per browsed listing would grow the row without bound.
  it('prunes the id once its last tick is cleared', async () => {
    const { toggleStep } = await import('./steps')
    toggleStep(5, 0)
    expect(read()).toEqual({ 5: [true, false, false, false] })
    toggleStep(5, 0)
    expect(read()).toEqual({})
  })

  it('keeps other ids when one is pruned', async () => {
    const { toggleStep, getSteps } = await import('./steps')
    toggleStep(1, 0)
    toggleStep(2, 1)
    toggleStep(1, 0)
    expect(getSteps(2)).toEqual([false, true, false, false])
    expect(read()).toEqual({ 2: [false, true, false, false] })
  })

  it('ignores an out-of-range index rather than growing the row', async () => {
    const { toggleStep, getSteps } = await import('./steps')
    expect(toggleStep(5, 4)).toEqual([false, false, false, false])
    expect(toggleStep(5, -1)).toEqual([false, false, false, false])
    expect(toggleStep(5, 1.5)).toEqual([false, false, false, false])
    expect(getSteps(5)).toHaveLength(4)
    expect(read()).toBeNull()
  })
})

describe('totalStepsDone', () => {
  it('sums ticks across the given ids only', async () => {
    const { toggleStep, totalStepsDone } = await import('./steps')
    toggleStep(1, 0)
    toggleStep(1, 1)
    toggleStep(2, 0)
    toggleStep(3, 0)
    expect(totalStepsDone([1, 2, 3])).toBe(4)
    expect(totalStepsDone([1])).toBe(2)
    expect(totalStepsDone([])).toBe(0)
  })

  // Ticks outlive un-saving on purpose: removing an award and putting it back
  // should not silently discard the work already logged against it.
  it('leaves ticks intact for an id it is not asked about', async () => {
    const { toggleStep, totalStepsDone, getSteps } = await import('./steps')
    toggleStep(9, 3)
    expect(totalStepsDone([1, 2])).toBe(0)
    expect(getSteps(9)).toEqual([false, false, false, true])
  })

  it('ignores unknown ids', async () => {
    const { totalStepsDone } = await import('./steps')
    expect(totalStepsDone([404])).toBe(0)
  })
})

describe('cross-tab writes', () => {
  it('drops the cache when another tab writes the key', async () => {
    const { getSteps, STEPS_KEY } = await import('./steps')
    expect(getSteps(1)).toEqual([false, false, false, false])

    // Another tab ticks a step. localStorage is shared in the test environment,
    // but this tab's memoized copy is not, so the event has to invalidate it.
    localStorage.setItem(STEPS_KEY, JSON.stringify({ 1: [true, true, false, false] }))
    window.dispatchEvent(new StorageEvent('storage', { key: STEPS_KEY }))

    expect(getSteps(1)).toEqual([true, true, false, false])
  })

  it('ignores writes to other keys', async () => {
    const { toggleStep, getSteps } = await import('./steps')
    toggleStep(1, 0)
    localStorage.setItem('scholarab_saved', '[1]')
    window.dispatchEvent(new StorageEvent('storage', { key: 'scholarab_saved' }))
    expect(getSteps(1)).toEqual([true, false, false, false])
  })
})

describe('unwritable storage', () => {
  it('keeps ticks for the session when persisting throws', async () => {
    const { toggleStep, getSteps } = await import('./steps')
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    try {
      expect(toggleStep(4, 1)).toEqual([false, true, false, false])
      // Lost on reload, but the UI must still respond in private mode.
      expect(getSteps(4)).toEqual([false, true, false, false])
    } finally {
      spy.mockRestore()
    }
  })
})
