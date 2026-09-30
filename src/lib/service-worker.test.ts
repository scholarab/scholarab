import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(resolve('public/sw.js'), 'utf8')
const origin = 'https://www.scholarab.ca'
type RequestLike = { url: string; method: string; mode: string }
type CacheKey = string | { url: string }
const urlOf = (key: CacheKey) => new URL(typeof key === 'string' ? key : key.url, origin).href

// Execute the shipped worker's events with an in-memory CacheStorage and a
// controlled network. No server, credentials, or real browser storage is used.
function worker() {
  const handlers = new Map<string, (event: any) => void>()
  const fetched: string[] = []
  const network = vi.fn(async (request: CacheKey) => new Response(`network:${urlOf(request)}`))
  class MemoryCache {
    entries = new Map<string, Response>()
    async add(path: string) {
      fetched.push(path)
      const response = await network(path)
      if (!response.ok) throw new Error(`Failed to cache ${path}`)
      await this.put(path, response)
    }
    async put(key: CacheKey, response: Response) { this.entries.set(urlOf(key), response.clone()) }
    async match(key: CacheKey) { return this.entries.get(urlOf(key))?.clone() }
    async keys() { return [...this.entries.keys()].map(url => ({ url })) }
    async delete(key: CacheKey) { return this.entries.delete(urlOf(key)) }
  }
  const stores = new Map<string, MemoryCache>()
  const caches = {
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new MemoryCache())
      return stores.get(name)!
    },
    async keys() { return [...stores.keys()] },
    async delete(name: string) { return stores.delete(name) },
    async match(key: CacheKey) {
      for (const cache of stores.values()) {
        const response = await cache.match(key)
        if (response) return response
      }
    },
  }
  runInNewContext(source, {
    URL, caches, fetch: network,
    self: {
      location: { origin }, skipWaiting() {}, clients: { claim() {} },
      addEventListener(name: string, handler: (event: any) => void) { handlers.set(name, handler) },
    },
  })
  async function dispatch(name: string, request?: RequestLike) {
    const pending: Promise<unknown>[] = []
    let response: Promise<Response | undefined> | undefined
    handlers.get(name)!({
      request,
      waitUntil(promise: Promise<unknown>) { pending.push(promise) },
      respondWith(promise: Promise<Response | undefined>) { response = promise },
    })
    const intercepted = response !== undefined
    const result = await response
    await Promise.all(pending)
    return { intercepted, response: result }
  }
  const request = (path: string, overrides: Partial<RequestLike> = {}) => dispatch('fetch', {
    url: new URL(path, origin).href, method: 'GET', mode: 'navigate', ...overrides,
  })
  return { dispatch, request, network, fetched, caches }
}

describe('service worker offline behavior', () => {
  it('installs only the self-contained fallback, without fetching unseen pages', async () => {
    const sw = worker()
    await sw.dispatch('install')
    expect(sw.fetched).toEqual(['/offline'])
    expect(await sw.caches.match('/offline')).toBeDefined()
    for (const path of ['/', '/scholarships/', '/programs/', '/saved/', '/about/']) {
      expect(await sw.caches.match(path)).toBeUndefined()
    }
  })

  it('exposes a failed fallback install instead of activating incomplete offline support', async () => {
    const sw = worker()
    sw.network.mockRejectedValue(new Error('offline fallback unavailable'))
    await expect(sw.dispatch('install')).rejects.toThrow('offline fallback unavailable')
    expect(sw.network).toHaveBeenCalledTimes(1)
  })

  it('returns fresh responses online and keeps a visited page available offline', async () => {
    const sw = worker()
    await sw.dispatch('install')
    sw.network.mockResolvedValue(new Response('first visit'))
    expect(await (await sw.request('/scholarships/example/')).response?.text()).toBe('first visit')
    sw.network.mockResolvedValue(new Response('updated listing'))
    expect(await (await sw.request('/scholarships/example/')).response?.text()).toBe('updated listing')
    sw.network.mockRejectedValue(new Error('offline'))
    expect(await (await sw.request('/scholarships/example/')).response?.text()).toBe('updated listing')
  })

  it('uses the offline page for an unvisited navigation but not a missing asset', async () => {
    const sw = worker()
    await sw.dispatch('install')
    sw.network.mockRejectedValue(new Error('offline'))
    expect(await (await sw.request('/never-visited/')).response?.text()).toBe(`network:${origin}/offline`)
    expect((await sw.request('/missing.js', { mode: 'cors' })).response).toBeUndefined()
  })

  it('keeps at most 60 runtime entries without evicting the fallback', async () => {
    const sw = worker()
    await sw.dispatch('install')
    for (let i = 0; i < 65; i++) await sw.request(`/visited-${i}/`)
    expect(await sw.caches.match('/visited-0/')).toBeUndefined()
    expect(await sw.caches.match('/visited-4/')).toBeUndefined()
    expect(await sw.caches.match('/visited-5/')).toBeDefined()
    expect(await sw.caches.match('/visited-64/')).toBeDefined()
    expect(await sw.caches.match('/offline')).toBeDefined()
    const keys = await (await sw.caches.open((await sw.caches.keys())[0]!)).keys()
    expect(keys.filter(key => new URL(key.url).pathname.startsWith('/visited-'))).toHaveLength(60)
  })

  it('bypasses API, authenticated routes, writes, and external requests', async () => {
    const sw = worker()
    for (const path of ['/api/alert', '/admin/scholarships', 'https://provider.example/award']) {
      expect((await sw.request(path)).intercepted).toBe(false)
    }
    expect((await sw.request('/scholarships/', { method: 'POST' })).intercepted).toBe(false)
    expect(sw.network).not.toHaveBeenCalled()
    expect(await sw.caches.keys()).toEqual([])
  })

  it('preserves existing v9 visited pages during an update and removes older cache versions', async () => {
    const sw = worker()
    await (await sw.caches.open('scholarab-v9')).put('/saved/', new Response('existing offline shortlist page'))
    await (await sw.caches.open('scholarab-v8')).put('/obsolete/', new Response('obsolete'))
    sw.network.mockResolvedValue(new Response('new fallback'))
    await sw.dispatch('install')
    await sw.dispatch('activate')
    sw.network.mockRejectedValue(new Error('offline'))
    expect(await (await sw.request('/saved/')).response?.text()).toBe('existing offline shortlist page')
    expect(await sw.caches.keys()).toEqual(['scholarab-v9'])
  })

  it('does not replace a useful cached response with an HTTP failure', async () => {
    const sw = worker()
    await sw.request('/scholarships/example/')
    sw.network.mockResolvedValue(new Response('unavailable', { status: 503 }))
    expect((await sw.request('/scholarships/example/')).response?.status).toBe(503)
    sw.network.mockRejectedValue(new Error('offline'))
    expect(await (await sw.request('/scholarships/example/')).response?.text()).toBe(`network:${origin}/scholarships/example/`)
  })
})
