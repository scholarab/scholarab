#!/usr/bin/env node
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { scholarships } from '../src/lib/db/schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local manually
const envPath = join(__dirname, '../.env.local')
try {
  const envContent = readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/)
    if (match) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
} catch { /* no .env.local */ }

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL not set in .env.local')

const db = drizzle(neon(url))

const jsonPath = join(__dirname, '../src/data/scholarships.json')
const entries: Array<{
  id: number
  title: string
  amount: string
  deadline?: string
  openDate?: string
  audience?: string
  url: string
  category?: string
  lastVerified?: string
  region?: string
  notes?: string
  applyViaGuidance?: boolean
  active?: boolean
}> = JSON.parse(readFileSync(jsonPath, 'utf8'))

const existing = await db.select({ title: scholarships.title }).from(scholarships)
const existingTitles = new Set(existing.map(r => r.title))

const toInsert = entries.filter(s => !existingTitles.has(s.title))

if (toInsert.length === 0) {
  console.log('DB already up to date — no new scholarships to insert.')
  process.exit(0)
}

await db.insert(scholarships).values(
  toInsert.map(s => ({
    title: s.title,
    amount: s.amount,
    deadline: s.deadline ?? null,
    openDate: s.openDate ?? null,
    audience: s.audience ?? null,
    url: s.url,
    category: s.category ?? null,
    lastVerified: s.lastVerified ?? null,
    region: s.region ?? null,
    notes: s.notes ?? null,
    applyViaGuidance: s.applyViaGuidance ?? false,
    active: s.active ?? true,
  }))
)

console.log(`Inserted ${toInsert.length} new scholarship(s):`)
toInsert.forEach(s => console.log(` + [${s.id}] ${s.title}`))
