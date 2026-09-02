#!/usr/bin/env node
/**
 * Copy detection.
 *
 * Every `description` and `notes` field in src/data was written by hand, in a
 * voice nobody reproduces by accident. A site that independently researched the
 * same awards would list the same deadlines and dollar amounts; those are
 * facts, and facts are not owned, but it would not land on the same sentences.
 * Verbatim prose is the part that proves copying rather than research.
 *
 * Two modes:
 *
 *   tsx scripts/check-copies.ts snapshot
 *     Writes a dated manifest of every prose field and its hash to
 *     private/fingerprints.json (gitignored). The manifest is a convenience;
 *     the authoritative dated proof of authorship is this repo's git history,
 *     which timestamps every sentence and is hosted by a third party.
 *
 *   tsx scripts/check-copies.ts scan <url> [<url> ...]
 *     Fetches each URL and reports which ScholarAB prose appears in it.
 *
 * The manifest is deliberately gitignored. A canary published next to the data
 * it protects is not a canary.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { createHash } from 'crypto'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const privateDir = join(root, 'private')
const manifestPath = join(privateDir, 'fingerprints.json')

interface Item {
  id: unknown
  title?: string
  name?: string
  description?: string
  notes?: string
  [key: string]: unknown
}

interface Print {
  id: unknown
  label: string
  field: 'description' | 'notes'
  /** The phrase we actually search for: long enough to be unmistakable. */
  phrase: string
  sha256: string
}

/** Decode the entities a rendered page will have where the JSON has raw text. */
function decodeEntities(s: string): string {
  const named: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ldquo: '"', rdquo: '"', lsquo: "'", rsquo: "'", mdash: '—', ndash: '–', hellip: '…',
  }
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m)
}

/**
 * Normalize both sides to plain text so the comparison survives the trip
 * through HTML: entities, tags splitting a sentence, and smart quotes all
 * differ between the JSON source and any rendered copy of it.
 */
const norm = (s: string) =>
  decodeEntities(s)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
const sha = (s: string) => createHash('sha256').update(norm(s)).digest('hex').slice(0, 16)

function load(): Print[] {
  const files: [string, string][] = [
    ['scholarships.json', 'title'],
    ['research-programs.json', 'name'],
  ]
  const prints: Print[] = []
  for (const [file, labelKey] of files) {
    const items: Item[] = JSON.parse(readFileSync(join(root, 'src/data', file), 'utf8'))
    for (const it of items) {
      const label = String(it[labelKey] ?? it.id)
      for (const field of ['description', 'notes'] as const) {
        const text = it[field]
        if (!text || typeof text !== 'string') continue
        // Longest sentence in the field: the most distinctive, least likely to
        // collide with boilerplate the issuer itself publishes.
        const phrase = text
          .split(/(?<=[.!?])\s+/)
          .map(s => s.trim())
          .filter(s => s.length >= 40)
          .sort((a, b) => b.length - a.length)[0]
        if (!phrase) continue
        prints.push({ id: it.id, label, field, phrase, sha256: sha(phrase) })
      }
    }
  }
  return prints
}

function snapshot() {
  const prints = load()
  if (!existsSync(privateDir)) mkdirSync(privateDir, { recursive: true })
  const manifest = {
    generated: new Date().toISOString(),
    note: 'Authorship proof of record is this repo git history. This file is a convenience index for scanning suspect sites.',
    count: prints.length,
    prints,
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`Wrote ${prints.length} fingerprints to private/fingerprints.json`)
  console.log(`Corpus hash: ${sha(prints.map(p => p.sha256).join(''))}`)
}

async function scan(urls: string[]) {
  const prints = load()
  console.log(`Scanning ${urls.length} URL(s) against ${prints.length} fingerprints.\n`)
  let anyHit = false

  for (const url of urls) {
    let body: string
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) {
        console.log(`  ${url}\n    could not fetch: HTTP ${res.status}\n`)
        continue
      }
      body = norm(await res.text())
    } catch (err) {
      console.log(`  ${url}\n    could not fetch: ${(err as Error).message}\n`)
      continue
    }

    const hits = prints.filter(p => body.includes(norm(p.phrase)))
    if (hits.length === 0) {
      console.log(`  ${url}\n    clean: no ScholarAB prose found\n`)
      continue
    }

    anyHit = true
    console.log(`  ${url}`)
    console.log(`    ${hits.length} verbatim match(es):`)
    for (const h of hits.slice(0, 12)) {
      console.log(`      [${h.id}] ${h.label} (${h.field})`)
      console.log(`          "${h.phrase.slice(0, 90)}${h.phrase.length > 90 ? '...' : ''}"`)
    }
    if (hits.length > 12) console.log(`      ...and ${hits.length - 12} more`)
    console.log()
  }

  if (anyHit) {
    console.log('Verbatim prose found. Before doing anything:')
    console.log('  1. Archive the page (web.archive.org/save) so the evidence survives an edit.')
    console.log('  2. Check whether they credited ScholarAB and used a compatible license.')
    console.log('     Attribution + CC BY-SA means they complied. That is allowed and fine.')
    console.log('  3. If uncredited or relicensed, a polite email asking for attribution')
    console.log('     resolves this the overwhelming majority of the time. Start there.')
    process.exitCode = 1
  }
}

const [mode, ...rest] = process.argv.slice(2)
if (mode === 'snapshot') {
  snapshot()
} else if (mode === 'scan' && rest.length > 0) {
  await scan(rest)
} else {
  console.log('Usage:')
  console.log('  tsx scripts/check-copies.ts snapshot')
  console.log('  tsx scripts/check-copies.ts scan <url> [<url> ...]')
  process.exitCode = 1
}
