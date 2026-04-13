#!/usr/bin/env node
/**
 * Full bidirectional sync: updates, inserts, and deactivates DB entries
 * to match the JSON files as the source of truth.
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { scholarships, researchPrograms } from '../src/lib/db/schema.js'
import { eq } from 'drizzle-orm'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
const envPath = join(__dirname, '../.env.local')
try {
  const envContent = readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/)
    if (match) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
} catch { /* no .env.local */ }

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL not set')
const db = drizzle(neon(url))

// ── SCHOLARSHIPS ──────────────────────────────────────────────────────────────

const schJson: any[] = JSON.parse(readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8'))
const schInDb = await db.select().from(scholarships)

const schJsonTitles = new Set(schJson.map(s => s.title))
let schInserted = 0, schUpdated = 0, schDeactivated = 0

for (const row of schInDb) {
  if (!schJsonTitles.has(row.title) && row.active) {
    await db.update(scholarships).set({ active: false }).where(eq(scholarships.id, row.id))
    schDeactivated++
    console.log(`  [scholarship] deactivated: "${row.title}"`)
  }
}

for (const s of schJson) {
  const existing = schInDb.find(r => r.title === s.title)
  const payload = {
    title: s.title, amount: s.amount, deadline: s.deadline ?? null,
    openDate: s.openDate ?? null, audience: s.audience ?? null, url: s.url,
    category: s.category ?? null, lastVerified: s.lastVerified ?? null,
    region: s.region ?? null, notes: s.notes ?? null,
    applyViaGuidance: s.applyViaGuidance ?? false, active: s.active ?? true,
  }
  if (existing) {
    const changed = (Object.keys(payload) as (keyof typeof payload)[]).some(k => (existing as any)[k] !== payload[k])
    if (changed) {
      await db.update(scholarships).set(payload).where(eq(scholarships.id, existing.id))
      schUpdated++
      console.log(`  [scholarship] updated:      "${s.title}"`)
    }
  } else {
    await db.insert(scholarships).values(payload)
    schInserted++
    console.log(`  [scholarship] inserted:     "${s.title}"`)
  }
}

console.log(`\nScholarships: +${schInserted} inserted, ~${schUpdated} updated, -${schDeactivated} deactivated\n`)

// ── PROGRAMS ─────────────────────────────────────────────────────────────────

const progJson: any[] = JSON.parse(readFileSync(join(__dirname, '../src/data/research-programs.json'), 'utf8'))
const progInDb = await db.select().from(researchPrograms)

const progJsonNames = new Set(progJson.map(p => p.name))
let progInserted = 0, progUpdated = 0, progDeactivated = 0

for (const row of progInDb) {
  if (!progJsonNames.has(row.name) && row.active) {
    await db.update(researchPrograms).set({ active: false }).where(eq(researchPrograms.id, row.id))
    progDeactivated++
    console.log(`  [program] deactivated: "${row.name}"`)
  }
}

for (const p of progJson) {
  const existing = progInDb.find(r => r.name === p.name)
  const payload = {
    name: p.name, emoji: p.emoji ?? null, category: p.category ?? null,
    provider: p.provider ?? null, grades: p.grades ?? null, duration: p.duration ?? null,
    paid: p.paid ?? false, stipend: p.stipend ?? null, location: p.location ?? null,
    eligibility: p.eligibility ?? null, deadline: p.deadline ?? null, url: p.url,
    description: p.description ?? null, lastVerified: p.lastVerified ?? null, active: true,
  }
  if (existing) {
    const changed = (Object.keys(payload) as (keyof typeof payload)[]).some(k => (existing as any)[k] !== payload[k])
    if (changed) {
      await db.update(researchPrograms).set(payload).where(eq(researchPrograms.id, existing.id))
      progUpdated++
      console.log(`  [program] updated:      "${p.name}"`)
    }
  } else {
    await db.insert(researchPrograms).values(payload)
    progInserted++
    console.log(`  [program] inserted:     "${p.name}"`)
  }
}

console.log(`\nPrograms: +${progInserted} inserted, ~${progUpdated} updated, -${progDeactivated} deactivated`)
