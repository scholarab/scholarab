import { describe, it, expect } from 'vitest'
import { fingerprint, stampAll, newest } from './lastmod.ts'

describe('fingerprint', () => {
  it('ignores key order, which JSON.stringify would not', () => {
    expect(fingerprint({ a: 1, b: 2 })).toBe(fingerprint({ b: 2, a: 1 }))
  })

  it('changes when any value changes', () => {
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }))
  })

  it('sees a change nested inside an array', () => {
    expect(fingerprint({ tags: ['x', 'y'] })).not.toBe(fingerprint({ tags: ['x', 'z'] }))
  })

  it('distinguishes a missing field from a null one', () => {
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 1, b: null }))
  })

  it('hashes a source file text as itself', () => {
    expect(fingerprint('hello')).toBe(fingerprint('hello'))
    expect(fingerprint('hello')).not.toBe(fingerprint('hellp'))
  })

  it('does not collide across the shapes it is actually given', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 5000; i++) seen.add(fingerprint({ id: i, name: `Listing ${i}`, deadline: '2026-03-01' }))
    expect(seen.size).toBe(5000)
  })
})

describe('stampAll', () => {
  const day = '2026-08-23'

  it('stamps today on a URL it has never seen', () => {
    expect(stampAll({}, [{ url: '/a/', hash: 'h1' }], day)).toEqual({ '/a/': { hash: 'h1', date: day } })
  })

  it('leaves an unchanged URL on its old date', () => {
    const prev = { '/a/': { hash: 'h1', date: '2026-04-02' } }
    expect(stampAll(prev, [{ url: '/a/', hash: 'h1' }], day)['/a/']!.date).toBe('2026-04-02')
  })

  it('moves the date the day the content changes', () => {
    const prev = { '/a/': { hash: 'h1', date: '2026-04-02' } }
    expect(stampAll(prev, [{ url: '/a/', hash: 'h2' }], day)['/a/']).toEqual({ hash: 'h2', date: day })
  })

  it('drops a URL that no longer exists', () => {
    const prev = { '/gone/': { hash: 'h1', date: '2026-04-02' } }
    expect(stampAll(prev, [{ url: '/a/', hash: 'h1' }], day)).not.toHaveProperty('/gone/')
  })

  it('writes keys in sorted order, so the committed diff shows only real changes', () => {
    const out = stampAll({}, [{ url: '/c/', hash: 'x' }, { url: '/a/', hash: 'y' }, { url: '/b/', hash: 'z' }], day)
    expect(Object.keys(out)).toEqual(['/a/', '/b/', '/c/'])
  })

  it('is idempotent: a second run on its own output changes nothing', () => {
    const entries = [{ url: '/a/', hash: 'h1' }, { url: '/b/', hash: 'h2' }]
    const once = stampAll({}, entries, day)
    expect(stampAll(once, entries, '2026-09-30')).toEqual(once)
  })
})

describe('newest', () => {
  it('returns the latest date', () => {
    expect(newest(['2026-04-02', '2026-08-23', '2026-07-01'])).toBe('2026-08-23')
  })

  it('ignores holes rather than returning one', () => {
    expect(newest([null, '2026-04-02', undefined])).toBe('2026-04-02')
  })

  it('returns null when there is nothing to report', () => {
    expect(newest([null, undefined])).toBeNull()
  })
})
