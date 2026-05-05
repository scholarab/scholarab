#!/usr/bin/env node
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface Item { id: unknown; title?: string; name?: string; url?: string }

const scholarships: Item[] = JSON.parse(readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8'))
const programs: Item[] = JSON.parse(readFileSync(join(__dirname, '../src/data/research-programs.json'), 'utf8'))

const items = [
  ...scholarships.filter(s => (s as Item & { active?: boolean }).active !== false).map(s => ({ id: s.id, label: s.title ?? String(s.id), url: s.url })),
  ...programs.filter(p => (p as Item & { active?: boolean }).active !== false).map(p => ({ id: p.id, label: p.name ?? String(p.id), url: p.url })),
]

type BrokenLink = { id: unknown; name: string; url: string; error: string }
const broken: BrokenLink[] = []

async function checkUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
      headers: { 'User-Agent': 'ScholarAB-LinkChecker/1.0' },
    })
    if (res.status >= 400) return `HTTP ${res.status}`
    return null
  } catch (e: unknown) {
    return e instanceof Error ? e.message : 'Unknown error'
  }
}

console.log(`Checking ${items.length} URLs...`)

const CONCURRENCY = 10
for (let i = 0; i < items.length; i += CONCURRENCY) {
  const batch = items.slice(i, i + CONCURRENCY)
  const results = await Promise.all(
    batch.map(async item => {
      if (!item.url) return { item, error: 'missing url' }
      const error = await checkUrl(item.url)
      return { item, error }
    })
  )
  for (const { item, error } of results) {
    if (error) broken.push({ id: item.id, name: item.label, url: item.url ?? '', error })
  }
}

if (broken.length > 0) {
  console.log(`\nFound ${broken.length} broken link(s):`)
  for (const b of broken) console.log(`  [${b.id}] ${b.name}: ${b.error}`)
  console.log(`BROKEN_LINKS_JSON=${JSON.stringify(broken)}`)
  process.exit(1)
} else {
  console.log('All links OK')
}
