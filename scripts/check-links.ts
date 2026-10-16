#!/usr/bin/env node
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Agent, fetch } from 'undici'
import { connect, rootCertificates } from 'node:tls'
import { X509Certificate } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { groupLinkTargets, forEachHost, reviewedLinkFailure, requestLink, type LinkException } from './link-targets.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface Item { id: unknown; title?: string; name?: string; url?: string }

const scholarships: Item[] = JSON.parse(readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8'))
const programs: Item[] = JSON.parse(readFileSync(join(__dirname, '../src/data/research-programs.json'), 'utf8'))

// Existing host exclusions and dated, URL-specific browser reviews. New
// reviews still request the URL and only match its verified refusal status.
const ignoreList: LinkException[] = JSON.parse(
  readFileSync(join(__dirname, 'link-checker-ignore.json'), 'utf8')
)
const ignoredHosts = new Set(ignoreList.flatMap(e => 'host' in e ? [e.host] : []))
const reviewDate = new Date().toISOString().slice(0, 10)
let reviewedFailures = 0

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

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

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
 *
 * fetch comes from the same undici package as this Agent. Node's global fetch
 * bundles its own undici, and once the package moved to v8 every request
 * failed with "invalid onRequestStart method", so the whole corpus quietly
 * fell through to curl (issue #40).
 */
const dispatcher = new Agent({
  connect: { timeout: 20_000 },
  headersTimeout: 20_000,
  bodyTimeout: 20_000,
})

async function fetchStatus(url: string): Promise<{ status?: number; error?: string }> {
  const signal = AbortSignal.timeout(25_000)
  let current = url
  // Redirects are followed one hop at a time so each host can get its own completed chain.
  for (let hop = 0; hop <= 10; hop++) {
    const host = new URL(current).hostname
    let result = await fetchHop(current, await issuerAgents.get(host) ?? dispatcher, signal)
    if (result.error?.includes('unable to verify the first certificate')) {
      const completed = await issuerDispatcher(host)
      if (completed) result = await fetchHop(current, completed, signal)
    }
    if (!result.location) return result
    current = new URL(result.location, current).href
  }
  return { error: 'Too many redirects' }
}

async function fetchHop(url: string, via: Agent, signal: AbortSignal): Promise<{ status?: number; error?: string; location?: string }> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal,
      redirect: 'manual',
      headers: BROWSER_HEADERS,
      dispatcher: via,
    })
    await res.body?.cancel()
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null
    return location ? { status: res.status, location } : { status: res.status }
  } catch (e: unknown) {
    const msg = e instanceof Error ? (e.cause instanceof Error ? `${e.message}: ${e.cause.message}` : e.message) : 'Unknown error'
    return { error: msg }
  }
}

/**
 * Some servers send only their own certificate and leave out the intermediate
 * that links it to a root. Browsers fetch that intermediate from the address
 * the certificate names (Authority Information Access) and load the page, so a
 * student never sees a problem, but Node does not, and York's award pages
 * failed every hosted run this way because one of its two servers drops the
 * intermediate (issue #40). Fetch it the same way a browser does and verify
 * against Node's own roots plus that one certificate, so a chain that does not
 * end at a trusted root still fails.
 */
const issuerAgents = new Map<string, Promise<Agent | undefined>>()

function issuerDispatcher(host: string): Promise<Agent | undefined> {
  let pending = issuerAgents.get(host)
  if (!pending) {
    pending = loadIssuer(host).then(pem => pem ? new Agent({
      connect: { timeout: 20_000, ca: [...rootCertificates, pem] },
      headersTimeout: 20_000,
      bodyTimeout: 20_000,
    }) : undefined, () => undefined)
    issuerAgents.set(host, pending)
  }
  return pending
}

async function loadIssuer(host: string): Promise<string | undefined> {
  const leaf = await new Promise<X509Certificate | undefined>(resolve => {
    // Unverified on purpose: this socket only reads the certificate, it never sends a request.
    const socket = connect({ host, port: 443, servername: host, rejectUnauthorized: false, timeout: 20_000 }, () => {
      const raw = socket.getPeerCertificate().raw
      socket.end()
      resolve(raw ? new X509Certificate(raw) : undefined)
    })
    socket.on('error', () => resolve(undefined))
    socket.on('timeout', () => { socket.destroy(); resolve(undefined) })
  })
  const issuerUrl = leaf?.infoAccess?.match(/CA Issuers - URI:(https?:\/\/\S+)/)?.[1]
  if (!leaf || !issuerUrl) return undefined
  const res = await fetch(issuerUrl, { signal: AbortSignal.timeout(20_000), dispatcher })
  if (!res.ok) return undefined
  const issuer = new X509Certificate(Buffer.from(await res.arrayBuffer()))
  return leaf.checkIssued(issuer) ? issuer.toString() : undefined
}

type Verdict = { kind: 'ok' } | { kind: 'broken' | 'suspect'; error: string }

const exec = promisify(execFile)

// Some providers close undici's connection or never send it headers while
// their pages load through the platform HTTP client. Keep TLS verification
// enabled and use curl only as an alternative for an existing retry slot.
async function fetchWithCurl(url: string): Promise<{ status?: number; error?: string }> {
  try {
    const { stdout } = await exec('curl', [
      '--proto', '=http,https', '--proto-redir', '=http,https', '--location', '--max-redirs', '10',
      '--connect-timeout', '20', '--max-time', '25', '--silent', '--show-error',
      '--output', '/dev/null', '--write-out', '%{http_code}', '--user-agent', BROWSER_HEADERS['User-Agent'], url,
    ], { timeout: 30_000, maxBuffer: 16_384 })
    const status = Number(stdout.trim())
    return Number.isInteger(status) && status >= 100 && status <= 599
      ? { status } : { error: 'curl returned no valid HTTP status' }
  } catch (error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : 'unknown'
    // Keep final failures visible without leaking command arguments or output.
    return { error: `curl transport failed (code ${code})` }
  }
}

async function checkUrl(url: string): Promise<Verdict> {
  const result = await requestLink(url, fetchStatus, fetchWithCurl, sleep)
  if (result.error) {
    const dnsFailure = /ENOTFOUND|curl transport failed \(code 6\)/i.test(result.error)
    return { kind: dnsFailure ? 'broken' : 'suspect', error: result.error }
  }
  const status = result.status!
  if (status < 400) return { kind: 'ok' }
  if (status === 404 || status === 410) return { kind: 'broken', error: `HTTP ${status}` }
  return { kind: 'suspect', error: `HTTP ${status}` }
}

console.log(`Checking ${groupLinkTargets(items).size} unique URLs for ${items.length} listings...`)

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
  for (const [i, [url, listings]] of [...groupLinkTargets(hostItems)].entries()) {
    if (i > 0) await sleep(PER_HOST_DELAY_MS)
    const verdict = await checkUrl(url)
    if (verdict.kind === 'ok') continue
    if (reviewedLinkFailure(url, verdict, ignoreList, reviewDate)) {
      reviewedFailures++
      console.log(`  ${url}: ${verdict.error} (browser-verified exception; still checked for other failures)`)
      continue
    }
    for (const item of listings) {
      const entry = { id: item.id, name: item.label, url, error: verdict.error }
      ;(verdict.kind === 'broken' ? broken : suspect).push(entry)
    }
  }
}

await forEachHost([...byHost.entries()], HOST_CONCURRENCY, ([host, list]) => checkHost(host, list))

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
  console.log(`No broken or unreviewed link failures. ${reviewedFailures} URL-specific browser-verified exception(s); legacy host exclusions remain in link-checker-ignore.json.`)
}
