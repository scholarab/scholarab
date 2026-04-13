#!/usr/bin/env node
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { scholarships } from '../src/lib/db/schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
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

// UFCW Local 401 (id 153) incorrectly got minAverage:80 — revert to null
const [row] = await db
  .select({ id: scholarships.id, title: scholarships.title, eligibility: scholarships.eligibility })
  .from(scholarships)
  .where(eq(scholarships.id, 153))

if (!row) { console.log('ID 153 not found'); process.exit(1) }
console.log(`[${row.id}] ${row.title}`)

const elig = (row.eligibility as Record<string, unknown> | null) ?? {}
console.log(`  current minAverage: ${elig.minAverage ?? null}`)

const fixed = { ...elig, minAverage: null }
await db.update(scholarships).set({ eligibility: fixed, updatedAt: new Date() }).where(eq(scholarships.id, 153))
console.log('  ✓ Reverted minAverage → null')
