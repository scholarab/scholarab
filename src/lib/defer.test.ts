import { describe, it, expect, vi } from 'vitest'
import { defer } from './defer'

describe('defer', () => {
  it('hands the work to waitUntil when the Workers ctx is present', async () => {
    const waitUntil = vi.fn()
    let done = false
    const work = Promise.resolve().then(() => { done = true })

    await defer({ runtime: { ctx: { waitUntil } } }, work)

    expect(waitUntil).toHaveBeenCalledTimes(1)
    await waitUntil.mock.calls[0]![0]
    expect(done).toBe(true)
  })

  it('awaits the work inline when there is no ctx (dev, tests)', async () => {
    let done = false
    await defer({}, Promise.resolve().then(() => { done = true }))
    expect(done).toBe(true)
  })

  it('awaits inline when locals is undefined', async () => {
    let done = false
    await defer(undefined, Promise.resolve().then(() => { done = true }))
    expect(done).toBe(true)
  })

  // A failed analytics write must never turn into a 500 for the visitor.
  it('swallows a rejected job instead of propagating it', async () => {
    await expect(defer({}, Promise.reject(new Error('db down')))).resolves.toBeUndefined()
  })

  it('swallows a rejected job handed to waitUntil', async () => {
    const waitUntil = vi.fn()
    await defer({ runtime: { ctx: { waitUntil } } }, Promise.reject(new Error('db down')))
    await expect(waitUntil.mock.calls[0]![0]).resolves.toBeUndefined()
  })

  it('falls back to an inline await when waitUntil itself throws', async () => {
    let done = false
    const waitUntil = () => { throw new Error('outside request scope') }
    await defer({ runtime: { ctx: { waitUntil } } }, Promise.resolve().then(() => { done = true }))
    expect(done).toBe(true)
  })
})
