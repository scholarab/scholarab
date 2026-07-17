#!/usr/bin/env node
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

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

const items = [
  ...scholarships.filter(s => (s as Item & { active?: boolean }).active !== false).map(s => ({ id: s.id, label: s.title ?? String(s.id), url: s.url })),
  ...programs.filter(p => (p as Item & { active?: boolean }).active !== false).map(p => ({ id: p.id, label: p.name ?? String(p.id), url: p.url })),
]

type Flagged = { id: unknown; name: string; url: string; error: string }
// broken: the page is gone (404/410, DNS failure) and the listing needs a new URL.
// suspect: the request was refused or flaky (403/405/429, timeout, reset) —
// usually bot-blocking, so a human should verify before touching the data.
const broken: Flagged[] = []
const suspect: Flagged[] = []

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-CA,en;q=0.9',
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fetchStatus(url: string): Promise<{ status?: number; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
      headers: BROWSER_HEADERS,
    })
    await res.body?.cancel()
    return { status: res.status }
  } catch (e: unknown) {
    const msg = e instanceof Error ? (e.cause instanceof Error ? `${e.message}: ${e.cause.message}` : e.message) : 'Unknown error'
    return { error: msg }
  }
}

type Verdict = { kind: 'ok' } | { kind: 'broken' | 'suspect'; error: string }

async function checkUrl(url: string): Promise<Verdict> {
  let result = await fetchStatus(url)
  // One retry for transient failures: network errors, timeouts, 5xx, 429.
  if (result.error || (result.status && (result.status >= 500 || result.status === 429))) {
    await sleep(2_000)
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

const CONCURRENCY = 10
for (let i = 0; i < items.length; i += CONCURRENCY) {
  const batch = items.slice(i, i + CONCURRENCY)
  const results = await Promise.all(
    batch.map(async item => {
      if (!item.url) return { item, verdict: { kind: 'broken', error: 'missing url' } as Verdict }
      const host = new URL(item.url).hostname.replace(/^www\./, '')
      if (ignoredHosts.has(host)) return { item, verdict: { kind: 'ok' } as Verdict, ignored: true }
      return { item, verdict: await checkUrl(item.url) }
    })
  )
  for (const { item, verdict, ignored } of results) {
    if (ignored) console.log(`  [${item.id}] ${item.label}: skipped (known bot-blocking host)`)
    if (verdict.kind === 'ok') continue
    const entry = { id: item.id, name: item.label, url: item.url ?? '', error: verdict.error }
    ;(verdict.kind === 'broken' ? broken : suspect).push(entry)
  }
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
