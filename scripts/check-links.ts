#!/usr/bin/env node
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Agent } from 'undici'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface Item { id: unknown; title?: string; name?: string; url?: string }

const scholarships: Item[] = JSON.parse(readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8'))
const programs: Item[] = JSON.parse(readFileSync(join(__dirname, '../src/data/research-programs.json'), 'utf8'))

// Hosts whose WAFs block requests from CI runners no matter what headers we
// send. Verified manually; re-check when adding or removing an entry.
const ignoreList: { host: string; reason: string }[] = JSON.parse(
  readFileSync(join(__dirname, 'link-checker-ignore.json'), 'utf8')
)
const ignoredHosts = new Set(ignoreList.map(e => e.host))

// Dormant listings are checked too. They used to be skipped, which is how all
// seven CPA Education Foundation URLs sat on a dead path from whenever CPA
// restructured its site until August 2026; the entries were between cycles, so
// nothing ever looked at them, and they were still wrong when they reopened.
const items = [
  ...scholarships.map(s => ({ id: s.id, label: s.title ?? String(s.id), url: s.url })),
  ...programs.map(p => ({ id: p.id, label: p.name ?? String(p.id), url: p.url })),
]

type Flagged = { id: unknown; name: string; url: string; error: string }
// broken: the page is gone (404/410, DNS failure) and the listing needs a new URL.
// suspect: the request was refused or flaky (403/405/429, timeout, reset);
// usually bot-blocking, so a human should verify before touching the data.
const broken: Flagged[] = []
const suspect: Flagged[] = []

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-CA,en;q=0.9',
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * A dispatcher with a connect timeout long enough for a congested runner.
 *
 * Every timeout this checker has ever reported reads `Connect Timeout Error
 * (attempted address: HOST:443, timeout: 10000ms)`, and 10000 is not a number
 * this file chose: it is undici's default connect timeout, and the one thing
 * `AbortSignal.timeout` cannot influence, because the signal governs the whole
 * request while the connect timeout fires inside the socket layer first. Two
 * entries in link-checker-ignore.json say exactly that and then work around it
 * by muting the host.
 *
 * That workaround does not hold, because the hosts it fires on are not a fixed
 * set. Three consecutive runs on 2026-08-26 reported six different sites, all
 * with this error, and all six connected in about a tenth of a second from a
 * normal network. What is slow is the runner's outbound path at that moment,
 * not any of the sites, so muting them one run at a time would work through
 * the corpus a host at a time and leave nothing actually checked.
 *
 * 20s, with the request signal moved above it so the socket layer is what
 * gives up first and the error still names the phase that failed.
 */
const dispatcher = new Agent({
  connect: { timeout: 20_000 },
  headersTimeout: 20_000,
  bodyTimeout: 20_000,
})

async function fetchStatus(url: string): Promise<{ status?: number; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(25_000),
      redirect: 'follow',
      headers: BROWSER_HEADERS,
      dispatcher,
    } as RequestInit & { dispatcher: Agent })
    await res.body?.cancel()
    return { status: res.status }
  } catch (e: unknown) {
    const msg = e instanceof Error ? (e.cause instanceof Error ? `${e.message}: ${e.cause.message}` : e.message) : 'Unknown error'
    return { error: msg }
  }
}

type Verdict = { kind: 'ok' } | { kind: 'broken' | 'suspect'; error: string }

const transient = (r: { status?: number; error?: string }) =>
  !!r.error || (!!r.status && (r.status >= 500 || r.status === 429))

async function checkUrl(url: string): Promise<Verdict> {
  // Two retries with backoff, not one. A single 2s retry was not enough for
  // hosts that drop connections under burst; every studentaid.alberta.ca
  // listing failed the 2026-08-03 run on a connect timeout and every one of
  // them was live in a browser.
  let result = await fetchStatus(url)
  for (let attempt = 0; attempt < 2 && transient(result); attempt++) {
    await sleep(2_000 * (attempt + 1))
    result = await fetchStatus(url)
  }
  if (result.error) {
    const dnsFailure = /ENOTFOUND|EAI_AGAIN/i.test(result.error)
    return { kind: dnsFailure ? 'broken' : 'suspect', error: result.error }
  }
  const status = result.status!
  if (status < 400) return { kind: 'ok' }
  if (status === 404 || status === 410) return { kind: 'broken', error: `HTTP ${status}` }
  return { kind: 'suspect', error: `HTTP ${status}` }
}

console.log(`Checking ${items.length} URLs...`)

// Group by host and walk each host's URLs one at a time. The old flat batch of
// 10 opened up to 10 sockets against a single host; studentaid.alberta.ca
// alone owns 16 listings, so a run would routinely fire seven simultaneous
// connections at it and collect seven connect timeouts from a host that is
// perfectly healthy in a browser. Hosts still run in parallel with each other,
// so the wall-clock cost is set by the busiest host, not by the total.
const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '')

const byHost = new Map<string, typeof items>()
const noUrl: typeof items = []
for (const item of items) {
  if (!item.url) { noUrl.push(item); continue }
  const h = hostOf(item.url)
  const list = byHost.get(h)
  if (list) list.push(item); else byHost.set(h, [item])
}

for (const item of noUrl) {
  broken.push({ id: item.id, name: item.label, url: '', error: 'missing url' })
}

const HOST_CONCURRENCY = 8
const PER_HOST_DELAY_MS = 400

async function checkHost(host: string, hostItems: typeof items): Promise<void> {
  if (ignoredHosts.has(host)) {
    for (const item of hostItems) console.log(`  [${item.id}] ${item.label}: skipped (known bot-blocking host)`)
    return
  }
  for (const [i, item] of hostItems.entries()) {
    if (i > 0) await sleep(PER_HOST_DELAY_MS)
    const verdict = await checkUrl(item.url!)
    if (verdict.kind === 'ok') continue
    const entry = { id: item.id, name: item.label, url: item.url ?? '', error: verdict.error }
    ;(verdict.kind === 'broken' ? broken : suspect).push(entry)
  }
}

const hosts = [...byHost.entries()]
for (let i = 0; i < hosts.length; i += HOST_CONCURRENCY) {
  await Promise.all(hosts.slice(i, i + HOST_CONCURRENCY).map(([h, list]) => checkHost(h, list)))
}

// Bare-origin URLs: a 200 proves the host is alive, never that it still
// describes the award. Alberta Computers for Schools pointed at acfs.org; a
// Florida safety-day event that answered 200 for months, and the Charmaine
// Letourneau listing pointed at a foundation homepage that lists dozens of
// funds. Both passed every status check. This is a report, not a failure:
// plenty of single-purpose providers (teamupscience.com, technovationchallenge
// .org) legitimately have nothing deeper to link to, so a human decides.
const bareOrigin = items.filter(it => {
  if (!it.url) return false
  try {
    const u = new URL(it.url)
    return (u.pathname === '/' || u.pathname === '') && !u.search && !u.hash
  } catch { return false }
})
if (bareOrigin.length > 0) {
  console.log(`\n${bareOrigin.length} listing(s) point at a bare homepage. Confirm the award is still described there:`)
  for (const b of bareOrigin) console.log(`  [${b.id}] ${b.label}: ${b.url}`)
}

if (broken.length > 0) {
  console.log(`\nFound ${broken.length} broken link(s):`)
  for (const b of broken) console.log(`  [${b.id}] ${b.name}: ${b.error}`)
}
if (suspect.length > 0) {
  console.log(`\nFound ${suspect.length} suspect link(s) (likely bot-blocking, verify manually):`)
  for (const s of suspect) console.log(`  [${s.id}] ${s.name}: ${s.error}`)
}

if (broken.length > 0 || suspect.length > 0) {
  console.log(`REPORT_JSON=${JSON.stringify({ broken, suspect })}`)
  process.exit(1)
} else {
  console.log('All links OK')
}
