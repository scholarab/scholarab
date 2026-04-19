#!/usr/bin/env node
/**
 * Enriches src/data/scholarships.json with:
 *   - description: 2–3 sentence plain-English summary
 *   - eligibility: structured EligibilityCriteria object
 *
 * Uses Claude Haiku via the Anthropic SDK. Idempotent — skips entries
 * that already have a description. Writes after every batch so it's
 * safe to kill and resume.
 *
 * Requires ANTHROPIC_API_KEY in environment or .env.local.
 * Run: npx tsx scripts/enrich-scholarships.ts
 */

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { eligibilitySchema } from '../src/lib/eligibility-types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load .env.local ───────────────────────────────────────────────────────────
try {
  const raw = readFileSync(join(__dirname, '../.env.local'), 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.+)$/)
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim()
  }
} catch { /* no .env.local */ }

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY is not set.')
  console.error('Add it to .env.local:  ANTHROPIC_API_KEY=sk-ant-...')
  process.exit(1)
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const JSON_PATH = join(__dirname, '../src/data/scholarships.json')

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawScholarship {
  id: number
  title: string
  amount: string
  deadline?: string | null
  openDate?: string | null
  audience?: string | null
  url: string
  category?: string | null
  lastVerified?: string | null
  region?: string | null
  notes?: string | null
  applyViaGuidance?: boolean
  active?: boolean
  description?: string | null
  eligibility?: unknown
}

// ── Tool schema ───────────────────────────────────────────────────────────────

const ENRICH_TOOL: Anthropic.Tool = {
  name: 'enrich_scholarship',
  description: 'Return a description and structured eligibility for the scholarship.',
  input_schema: {
    type: 'object' as const,
    properties: {
      description: {
        type: 'string',
        description: '2–3 sentence plain-English summary for a scholarship detail page.',
      },
      eligibility: {
        type: 'object',
        description: 'Structured eligibility criteria.',
        properties: {
          grades: {
            type: 'array', items: { type: 'string' },
            description: 'Subset of ["10","11","12"]. ["12"] for graduating seniors entering post-secondary; ["10","11","12"] for any HS student; [] if already in post-secondary or grade unspecified.',
          },
          schoolBoards: {
            type: 'array', items: { type: 'string' },
            description: 'School board abbreviations if board-specific: "MHPSD" (Medicine Hat Public), "PRSD" (Prairie Rose Catholic), "CBE" (Calgary Board of Education), "CCSD" (Calgary Catholic), "EPS" (Edmonton Public), "ECSD" (Edmonton Catholic), "EPSB". Leave empty if not board-specific.',
          },
          specificSchools: {
            type: 'array', items: { type: 'string' },
            description: 'Specific school names if school-specific (e.g. "Medicine Hat High School"). Empty otherwise.',
          },
          targetInstitutions: {
            type: 'array', items: { type: 'string' },
            description: 'Named institutions if specified (e.g. "Medicine Hat College"), or ["any"] if any post-secondary is explicitly OK, or [] if unclear.',
          },
          fields: {
            type: 'array', items: { type: 'string' },
            description: 'Subset of ["STEM","health","business","arts","trades","agriculture"]. Empty if any field accepted.',
          },
          minAverage: {
            type: ['number', 'null'],
            description: 'Minimum academic average as integer percentage (e.g. 75). null if not stated.',
          },
          minAge: { type: ['number', 'null'], description: 'Minimum age or null.' },
          maxAge: { type: ['number', 'null'], description: 'Maximum age or null.' },
          genderRequired: {
            type: ['string', 'null'],
            enum: ['female', null],
            description: '"female" only if the scholarship is explicitly for women/girls. null otherwise.',
          },
          indigenousRequired: {
            type: 'boolean',
            description: 'true only if the scholarship explicitly requires Indigenous identity (First Nations, Métis, Inuit).',
          },
          bipocRequired: {
            type: 'boolean',
            description: 'true only if the scholarship explicitly requires BIPOC / racialized identity.',
          },
          financialNeed: {
            type: 'boolean',
            description: 'true only if financial need is explicitly required (labelled "bursary", mentions income cap, or states "demonstrated need").',
          },
          maxFamilyIncome: {
            type: ['number', 'null'],
            description: 'Family income cap in CAD dollars, or null.',
          },
          fosterCare: {
            type: 'boolean',
            description: 'true only if the scholarship requires history of government/foster care.',
          },
          citizenship: {
            type: 'string',
            enum: ['canadian', 'permanent_resident', 'any'],
            description: '"canadian" for most Canadian/Alberta programs; "permanent_resident" if PRs are included but international students are not; "any" if open to international students.',
          },
          apprenticeship: {
            type: 'boolean',
            description: 'true if the student must be enrolled in RAP / CTS / apprenticeship.',
          },
          extracurriculars: {
            type: 'array', items: { type: 'string' },
            description: 'Subset of ["volunteer","music","sports","4-H","science_fair","arts","RAP"]. Only include if the scholarship specifically requires or favours that activity.',
          },
        },
        required: [
          'grades','schoolBoards','specificSchools','targetInstitutions','fields',
          'minAverage','minAge','maxAge','genderRequired','indigenousRequired',
          'bipocRequired','financialNeed','maxFamilyIncome','fosterCare',
          'citizenship','apprenticeship','extracurriculars',
        ],
      },
    },
    required: ['description', 'eligibility'],
  },
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(s: RawScholarship): string {
  return `You are enriching an Alberta high school scholarship database for ScholarAB, a free student directory.

SCHOLARSHIP:
  Title:    ${s.title}
  Amount:   ${s.amount}
  Audience: ${s.audience ?? 'not specified'}
  Category: ${s.category ?? 'General'}
  Region:   ${s.region ?? 'Alberta'}
  Notes:    ${s.notes ?? 'none'}

DESCRIPTION RULES:
- 2–3 sentences total
- Plain English suitable for a scholarship detail page
- Explain who offers the award, what it's for, and who is eligible
- Do not lead with the title or amount

ELIGIBILITY RULES:
- grades: ["12"] for graduating seniors / entering post-secondary; ["10","11","12"] for open HS; ["11"] if Grade 11 only
- financialNeed: true ONLY if labelled bursary or explicitly needs-based
- indigenousRequired / bipocRequired: true ONLY if explicitly required
- genderRequired: "female" ONLY if girls/women explicitly required
- citizenship: "canadian" for most Canadian/Alberta programs
- schoolBoards: fill if board-specific (CBE, CCSD, MHPSD, PRSD, EPS, ECSD…)
- specificSchools: fill if tied to a single named school
- targetInstitutions: named institution if specified, ["any"] if any post-sec OK, [] if unclear

Call the enrich_scholarship tool with your answer.`
}

// ── Enrich one scholarship ────────────────────────────────────────────────────

async function enrich(s: RawScholarship): Promise<{ description: string; eligibility: unknown }> {
  const resp = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    tools: [ENRICH_TOOL],
    tool_choice: { type: 'tool', name: 'enrich_scholarship' },
    messages: [{ role: 'user', content: buildPrompt(s) }],
  })

  const toolUse = resp.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error(`No tool_use block returned for scholarship ${s.id}`)
  }

  const input = toolUse.input as { description: string; eligibility: unknown }
  const parsed = eligibilitySchema.safeParse(input.eligibility)
  if (!parsed.success) {
    console.warn(`  ⚠ Eligibility validation warning [${s.id}] ${s.title}:`, parsed.error.issues)
  }

  return {
    description: input.description,
    eligibility: parsed.success ? parsed.data : input.eligibility,
  }
}

// ── Sleep helper ──────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const scholarships: RawScholarship[] = JSON.parse(readFileSync(JSON_PATH, 'utf8'))

  const todo = scholarships.filter(s => !s.description)
  const already = scholarships.length - todo.length

  if (already > 0) console.log(`⏭  Skipping ${already} already-enriched entries.`)
  if (todo.length === 0) {
    console.log('✅ All scholarships already enriched.')
    return
  }

  console.log(`\n🔄 Enriching ${todo.length} scholarships with Claude Haiku...\n`)

  const BATCH = 5
  let done = 0
  let failed = 0

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH)

    await Promise.all(batch.map(async (s) => {
      try {
        const result = await enrich(s)
        const idx = scholarships.findIndex(x => x.id === s.id)
        if (idx !== -1) {
          scholarships[idx] = { ...scholarships[idx], ...result }
        }
        done++
        console.log(`  ✓ [${s.id}] ${s.title}`)
      } catch (err) {
        failed++
        console.error(`  ✗ [${s.id}] ${s.title}: ${(err as Error).message}`)
      }
    }))

    // Write after every batch — safe to resume if interrupted
    writeFileSync(JSON_PATH, JSON.stringify(scholarships, null, 2) + '\n', 'utf8')

    if (i + BATCH < todo.length) await sleep(500)
  }

  console.log(`\n✅ Done. ${done} enriched, ${failed} failed, ${already} skipped.`)
  if (failed > 0) console.log('Re-run the script to retry failed entries.')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
