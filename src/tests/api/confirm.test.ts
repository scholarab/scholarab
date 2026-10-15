// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { readFileSync, readdirSync } from 'node:fs'

const state = vi.hoisted(() => ({ db: null as any }))
vi.mock('../../lib/db/client', () => ({ db: new Proxy({}, { get: (_, key) => state.db[key] }) }))
vi.mock('../../data/runtime-catalogue.json', () => ({ default: {
  scholarships: [
    { id: 1, title: 'Example award' },
    { id: 2, title: 'Second award' },
    { id: 3, title: 'Third <award>' },
    // A combo's worth, for a set signed up at once.
    ...Array.from({ length: 50 }, (_, n) => ({ id: 100 + n, title: `Set award ${n}` })),
  ],
  programs: [{ id: 1, name: 'Example program' }],
} }))

const { GET, POST } = await import('../../pages/api/confirm')

let pg: PGlite
beforeAll(async () => {
  pg = new PGlite()
  await pg.exec(readFileSync('drizzle/bootstrap.sql', 'utf8'))
  for (const f of readdirSync('drizzle/migrations').filter(f => /^\d{4}.*\.sql$/.test(f) && Number(f.slice(0, 4)) >= 13).sort())
    await pg.exec(readFileSync(`drizzle/migrations/${f}`, 'utf8'))
  state.db = drizzle(pg)
}, 30000)
beforeEach(async () => { await pg.exec('TRUNCATE subscribers CASCADE') })
afterAll(async () => pg.close())

type Row = { email?: string; itemType?: string; itemId: number; token: string; confirmed?: boolean; age?: string }
async function add(...rows: Row[]) {
  for (const r of rows)
    await pg.query(
      `insert into subscribers (email, item_type, item_id, token, confirmed_at, created_at)
       values ($1, $2, $3, $4, ${r.confirmed ? `now() - interval '1 day'` : 'null'}, now() - $5::interval)`,
      [r.email ?? 'student@example.org', r.itemType ?? 'scholarship', r.itemId, r.token, r.age ?? '5 minutes'])
}
const confirmedTokens = async () =>
  (await pg.query<{ token: string }>('select token from subscribers where confirmed_at is not null order by token')).rows.map(r => r.token)
const idOf = async (token: string) =>
  (await pg.query<{ id: number }>('select id from subscribers where token = $1', [token])).rows[0]!.id

const get = (url: string) =>
  GET({ request: new Request(url) } as Parameters<typeof GET>[0])

function post(token?: string, also: (number | string)[] = []) {
  const body = new FormData()
  if (token !== undefined) body.set('token', token)
  for (const id of also) body.append('also', String(id))
  return POST({
    request: new Request('http://localhost/api/confirm', { method: 'POST', body }),
  } as Parameters<typeof POST>[0])
}

/** What a student's browser submits after opening the confirm page. */
async function submitPage(token: string) {
  const html = await (await get(`http://localhost/api/confirm?token=${token}`)).text()
  return post(token, [...html.matchAll(/name="also" value="(\d+)"/g)].map(m => m[1]!))
}

describe('GET /api/confirm', () => {
  it('renders a button and writes nothing', async () => {
    // Mail security stacks (Safe Links, Proofpoint) fetch every URL in a
    // message. If GET confirmed, the recipient's own gateway would supply the
    // consent, which is the exact thing double opt-in exists to obtain from
    // a human.
    await add({ itemId: 1, token: 'a' }, { itemId: 2, token: 'b' })
    const res = await get('http://localhost/api/confirm?token=a')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('<button type="submit">')
    expect(await confirmedTokens()).toEqual([])
  })

  it('keeps the single-reminder page when nothing else is waiting', async () => {
    await add({ itemId: 1, token: 'a' })
    const html = await (await get('http://localhost/api/confirm?token=a')).text()
    expect(html).toContain('Confirm your reminder<')
    expect(html).not.toContain('name="also"')
  })

  it('lists the other sign-ups waiting on the same address by name', async () => {
    await add(
      { itemId: 1, token: 'a' },
      { itemId: 2, token: 'b' },
      { itemType: 'program', itemId: 1, token: 'c' },
      { itemId: 3, token: 'other', email: 'someone@example.org' },
    )
    const html = await (await get('http://localhost/api/confirm?token=a')).text()
    // Every award the click turns on is named, the emailed one first
    expect(html).toContain('<li>Example award</li><li>Second award</li><li>Example program</li>')
    expect(html).toContain('Yes, remind me about all 3')
    expect(html).not.toContain('Third')
    expect(html).not.toContain(`value="${await idOf('a')}"`)
  })

  it('names the one other award when the emailed one is already on', async () => {
    await add({ itemId: 1, token: 'a', confirmed: true }, { itemId: 2, token: 'b' })
    const html = await (await get('http://localhost/api/confirm?token=a')).text()
    expect(html).toContain('<li>Second award</li></ul>')
    expect(html).not.toContain('Example award')
    expect(html).toContain('>Yes, remind me</button>')
  })

  it('leaves out confirmed, stale and removed-listing sign-ups', async () => {
    await add(
      { itemId: 1, token: 'a' },
      { itemId: 2, token: 'done', confirmed: true },
      { itemId: 3, token: 'stale', age: '8 days' },
      { itemId: 99, token: 'gone' },
    )
    const html = await (await get('http://localhost/api/confirm?token=a')).text()
    expect(html).not.toContain('name="also"')
  })

  it('escapes listing names', async () => {
    await add({ itemId: 1, token: 'a' }, { itemId: 3, token: 'b' })
    const html = await (await get('http://localhost/api/confirm?token=a')).text()
    expect(html).toContain('<li>Third &lt;award&gt;</li>')
  })

  it('escapes the token it echoes back into the form', async () => {
    const res = await get('http://localhost/api/confirm?token=a"><script>x</script>')
    const html = await res.text()
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&quot;&gt;&lt;script&gt;')
  })

  it('rejects a request with no token', async () => {
    const res = await get('http://localhost/api/confirm')
    expect(res.status).toBe(400)
    expect(res.headers.get('Content-Type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('Open the full link in your ScholarAB email')
    expect(html).toContain('href="/"')
  })
})

describe('POST /api/confirm', () => {
  it('records consent for the matching token', async () => {
    await add({ itemId: 1, token: 'a' })
    const res = await post('a')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain("You're all set")
    expect(await confirmedTokens()).toEqual(['a'])
  })

  it('turns on a second award saved minutes after the first with one click', async () => {
    // 2026-10-14: the second sign-up got no email of its own (one confirmation
    // per address per 15 minutes), and confirming the first left it waiting a
    // day for the sweep to ask again.
    await add({ itemId: 1, token: 'a', age: '20 minutes' }, { itemId: 2, token: 'b', age: '15 minutes' })
    await submitPage('a')
    expect(await confirmedTokens()).toEqual(['a', 'b'])
  })

  it('still confirms the others when the emailed one was confirmed earlier', async () => {
    await add({ itemId: 1, token: 'a', confirmed: true }, { itemId: 2, token: 'b' })
    await submitPage('a')
    expect(await confirmedTokens()).toEqual(['a', 'b'])
  })

  it('only confirms what the page listed, not sign-ups made after it opened', async () => {
    await add({ itemId: 1, token: 'a' }, { itemId: 2, token: 'b' })
    const html = await (await get('http://localhost/api/confirm?token=a')).text()
    await add({ itemId: 3, token: 'c' })
    await post('a', [...html.matchAll(/name="also" value="(\d+)"/g)].map(m => m[1]!))
    expect(await confirmedTokens()).toEqual(['a', 'b'])
  })

  it('ignores ids from another address or past the waiting window', async () => {
    await add(
      { itemId: 1, token: 'a' },
      { itemId: 2, token: 'stranger', email: 'someone@example.org' },
      { itemId: 3, token: 'stale', age: '8 days' },
    )
    await post('a', [await idOf('stranger'), await idOf('stale'), 'x', -1])
    expect(await confirmedTokens()).toEqual(['a'])
  })

  it('confirms nothing for an unknown token, whatever ids it sends', async () => {
    await add({ itemId: 1, token: 'a' })
    await post('does-not-exist', [await idOf('a')])
    expect(await confirmedTokens()).toEqual([])
  })

  it('only ever sets confirmed_at where it is still null', async () => {
    // Clicking a year-old link a second time must not move the consent date
    // forward; that date is the record of when consent was actually given.
    await add({ itemId: 1, token: 'a', confirmed: true })
    const before = (await pg.query<{ c: string }>('select confirmed_at::text c from subscribers')).rows[0]!.c
    await post('a')
    expect((await pg.query<{ c: string }>('select confirmed_at::text c from subscribers')).rows[0]!.c).toBe(before)
  })

  it('answers the same for an unknown token', async () => {
    // Otherwise this endpoint tells you which tokens are live.
    await add({ itemId: 1, token: 'a' })
    const known = await post('a')
    const unknown = await post('does-not-exist')
    expect(await unknown.text()).toBe(await known.text())
  })

  it('rejects a submission with no token', async () => {
    expect((await post()).status).toBe(400)
  })

  it('offers recovery for an unreadable form without recording consent', async () => {
    await add({ itemId: 1, token: 'a' })
    const res = await POST({
      request: new Request('http://localhost/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
    } as Parameters<typeof POST>[0])
    expect(res.status).toBe(400)
    expect(res.headers.get('Content-Type')).toContain('text/html')
    expect(await res.text()).toContain('Open the full link in your ScholarAB email')
    expect(await confirmedTokens()).toEqual([])
  })
})

describe('a set signed up at once', () => {
  // /api/alert writes a set as one insert, so its rows share one created_at.
  const addSet = (size: number) => pg.query(
    `insert into subscribers (email, item_type, item_id, token, created_at)
     select 'student@example.org', 'scholarship', 100 + n, 'set' || n, now() - interval '1 minute'
     from generate_series(0, $1::int - 1) n`, [size])

  it('lists every row its email named straight after the emailed one, ahead of older sign-ups', async () => {
    await add({ itemId: 2, token: 'old1', age: '2 days' }, { itemId: 3, token: 'old2', age: '3 days' })
    await addSet(50)
    const html = await (await get('http://localhost/api/confirm?token=set0')).text()
    const listed = [...html.matchAll(/<li>([^<]*)<\/li>/g)].map(m => m[1])
    expect(listed.slice(0, 50)).toEqual(Array.from({ length: 50 }, (_, n) => `Set award ${n}`))
    // The emailed row plus 50 more, so the oldest waiting one fills the last place.
    expect(listed).toHaveLength(51)
    expect(listed[50]).toBe('Third &lt;award&gt;')
    expect(html).toContain('Yes, remind me about all 51')
  })

  it('turns the whole set on with one click', async () => {
    await add({ itemId: 2, token: 'old1', age: '2 days' }, { itemId: 3, token: 'old2', age: '3 days' })
    await addSet(50)
    await submitPage('set0')
    const on = await confirmedTokens()
    expect(on).toHaveLength(51)
    expect(on).toEqual(expect.arrayContaining(Array.from({ length: 50 }, (_, n) => `set${n}`)))
    expect(on).not.toContain('old1')
  })

  it('never takes more than a set from a forged form', async () => {
    await addSet(50)
    await add({ itemId: 1, token: 'own' }, { itemId: 2, token: 'x' }, { itemId: 3, token: 'y' })
    const others = (await pg.query<{ id: number }>("select id from subscribers where token <> 'own' order by id")).rows.map(r => r.id)
    expect(others).toHaveLength(52)
    await post('own', others)
    // The emailed row and the first 50 ids sent, never all 52.
    expect(await confirmedTokens()).toHaveLength(51)
    expect(await confirmedTokens()).not.toContain('y')
  })
})
