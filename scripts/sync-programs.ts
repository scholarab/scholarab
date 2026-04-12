#!/usr/bin/env node
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { researchPrograms } from '../src/lib/db/schema.js'

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

const jsonPath = join(__dirname, '../src/data/research-programs.json')
const programs: Array<{
  id: number
  name: string
  emoji: string | null
  category: string | null
  provider: string | null
  grades: string | null
  duration: string | null
  paid: boolean
  stipend: string | null
  location: string | null
  eligibility: string | null
  deadline: string | null
  url: string
  description: string | null
  lastVerified: string | null
}> = JSON.parse(readFileSync(jsonPath, 'utf8'))

const existing = await db.select({ name: researchPrograms.name }).from(researchPrograms)
const existingNames = new Set(existing.map(r => r.name))

const toInsert = programs.filter(p => !existingNames.has(p.name))

if (toInsert.length === 0) {
  console.log('DB already up to date — no new programs to insert.')
  process.exit(0)
}

await db.insert(researchPrograms).values(
  toInsert.map(p => ({
    name: p.name,
    emoji: p.emoji,
    category: p.category,
    provider: p.provider,
    grades: p.grades,
    duration: p.duration,
    paid: p.paid,
    stipend: p.stipend,
    location: p.location,
    eligibility: p.eligibility,
    deadline: p.deadline,
    url: p.url,
    description: p.description,
    lastVerified: p.lastVerified,
    active: true,
  }))
)

console.log(`Inserted ${toInsert.length} new program(s):`)
toInsert.forEach(p => console.log(` + [${p.id}] ${p.name}`))
