import { describe, it, expect, beforeEach, vi } from 'vitest'

// Pattern: reset module cache + clear storage before each test,
// then import fresh inside the test body.
beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

// ── getSaved ──────────────────────────────────────────────────────────────────

describe('getSaved', () => {
  it('returns empty array when localStorage is empty', async () => {
    const { getSaved } = await import('./tracker')
    expect(getSaved()).toEqual([])
  })

  it('returns numeric ids from localStorage', async () => {
    localStorage.setItem('scholarab_saved', JSON.stringify([1, 2, 3]))
    const { getSaved } = await import('./tracker')
    expect(getSaved()).toEqual([1, 2, 3])
  })

  it('coerces string ids to numbers', async () => {
    localStorage.setItem('scholarab_saved', JSON.stringify(['1', '2', '3']))
    const { getSaved } = await import('./tracker')
    expect(getSaved()).toEqual([1, 2, 3])
  })

  it('deduplicates ids', async () => {
    localStorage.setItem('scholarab_saved', JSON.stringify([1, 1, 2, 2, 3]))
    const { getSaved } = await import('./tracker')
    expect(getSaved()).toEqual([1, 2, 3])
  })

  it('drops non-numeric values', async () => {
    localStorage.setItem('scholarab_saved', JSON.stringify([1, 'abc', null, true, 2]))
    const { getSaved } = await import('./tracker')
    expect(getSaved()).toEqual([1, 2])
  })

  it('handles corrupted JSON gracefully', async () => {
    localStorage.setItem('scholarab_saved', 'not-valid-json{{')
    const { getSaved } = await import('./tracker')
    expect(getSaved()).toEqual([])
  })

  it('re-normalises string ids and writes back to localStorage', async () => {
    localStorage.setItem('scholarab_saved', JSON.stringify(['5', '10']))
    const { getSaved } = await import('./tracker')
    getSaved()
    const stored = JSON.parse(localStorage.getItem('scholarab_saved')!)
    expect(stored).toEqual([5, 10])
  })

  it('uses cached value on second call — ignores subsequent localStorage changes', async () => {
    const { getSaved } = await import('./tracker')
    getSaved()                                                         // primes cache with []
    localStorage.setItem('scholarab_saved', JSON.stringify([99]))     // mutate storage after caching
    expect(getSaved()).toEqual([])                                     // still returns cached []
  })

  it('invalidates cache when another tab fires a storage event', async () => {
    localStorage.setItem('scholarab_saved', JSON.stringify([1, 2]))
    const { getSaved } = await import('./tracker')
    getSaved()                                                         // primes cache with [1, 2]
    localStorage.setItem('scholarab_saved', JSON.stringify([3, 4]))   // simulate other-tab write
    window.dispatchEvent(new StorageEvent('storage', { key: 'scholarab_saved' }))
    expect(getSaved()).toEqual([3, 4])                                 // cache invalidated, re-reads
  })
})

// ── toggleSaved ───────────────────────────────────────────────────────────────

describe('toggleSaved', () => {
  it('adds id when not yet saved', async () => {
    const { toggleSaved, getSaved } = await import('./tracker')
    toggleSaved(42)
    expect(getSaved()).toContain(42)
  })

  it('removes id when already saved', async () => {
    const { toggleSaved, getSaved } = await import('./tracker')
    toggleSaved(42)
    toggleSaved(42)
    expect(getSaved()).not.toContain(42)
  })

  it('returns the updated list', async () => {
    const { toggleSaved } = await import('./tracker')
    expect(toggleSaved(7)).toContain(7)
  })

  it('persists to localStorage', async () => {
    const { toggleSaved } = await import('./tracker')
    toggleSaved(7)
    expect(JSON.parse(localStorage.getItem('scholarab_saved')!)).toContain(7)
  })

  it('accumulates multiple ids', async () => {
    const { toggleSaved, getSaved } = await import('./tracker')
    toggleSaved(1)
    toggleSaved(2)
    toggleSaved(3)
    expect(getSaved()).toEqual([1, 2, 3])
  })

  it('removes only the toggled id, keeps others', async () => {
    const { toggleSaved, getSaved } = await import('./tracker')
    toggleSaved(1); toggleSaved(2); toggleSaved(3)
    toggleSaved(2)
    expect(getSaved()).toEqual([1, 3])
  })
})

// ── getSavedPrograms ──────────────────────────────────────────────────────────

describe('getSavedPrograms', () => {
  it('returns empty array when localStorage is empty', async () => {
    const { getSavedPrograms } = await import('./tracker')
    expect(getSavedPrograms()).toEqual([])
  })

  it('returns saved program ids', async () => {
    localStorage.setItem('scholarab_saved_programs', JSON.stringify([10, 20]))
    const { getSavedPrograms } = await import('./tracker')
    expect(getSavedPrograms()).toEqual([10, 20])
  })

  it('coerces string ids to numbers', async () => {
    localStorage.setItem('scholarab_saved_programs', JSON.stringify(['10', '20']))
    const { getSavedPrograms } = await import('./tracker')
    expect(getSavedPrograms()).toEqual([10, 20])
  })

  it('deduplicates program ids', async () => {
    localStorage.setItem('scholarab_saved_programs', JSON.stringify([5, 5, 6]))
    const { getSavedPrograms } = await import('./tracker')
    expect(getSavedPrograms()).toEqual([5, 6])
  })

  it('re-normalises string ids and writes back', async () => {
    localStorage.setItem('scholarab_saved_programs', JSON.stringify(['3', '7']))
    const { getSavedPrograms } = await import('./tracker')
    getSavedPrograms()
    const stored = JSON.parse(localStorage.getItem('scholarab_saved_programs')!)
    expect(stored).toEqual([3, 7])
  })

  it('handles corrupted JSON gracefully', async () => {
    localStorage.setItem('scholarab_saved_programs', 'not-valid-json{{')
    const { getSavedPrograms } = await import('./tracker')
    expect(getSavedPrograms()).toEqual([])
  })
})

// ── toggleSavedProgram ────────────────────────────────────────────────────────

describe('toggleSavedProgram', () => {
  it('adds program id when not yet saved', async () => {
    const { toggleSavedProgram, getSavedPrograms } = await import('./tracker')
    toggleSavedProgram(99)
    expect(getSavedPrograms()).toContain(99)
  })

  it('removes program id when already saved', async () => {
    const { toggleSavedProgram, getSavedPrograms } = await import('./tracker')
    toggleSavedProgram(99)
    toggleSavedProgram(99)
    expect(getSavedPrograms()).not.toContain(99)
  })

  it('persists to localStorage under programs key', async () => {
    const { toggleSavedProgram } = await import('./tracker')
    toggleSavedProgram(55)
    expect(JSON.parse(localStorage.getItem('scholarab_saved_programs')!)).toContain(55)
  })

  it('does not affect scholarship saves', async () => {
    const { toggleSaved, toggleSavedProgram, getSaved, getSavedPrograms } = await import('./tracker')
    toggleSaved(1)
    toggleSavedProgram(2)
    expect(getSaved()).toEqual([1])
    expect(getSavedPrograms()).toEqual([2])
  })

  it('returns the updated programs list', async () => {
    const { toggleSavedProgram } = await import('./tracker')
    expect(toggleSavedProgram(33)).toContain(33)
  })
})
