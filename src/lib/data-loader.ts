import { z } from 'zod'
import type { EligibilityCriteria } from './eligibility-types'

// ── Zod schema for EligibilityCriteria ───────────────────────────────────────
export const eligibilitySchema = z.object({
  grades: z.array(z.string()).default([]),
  schoolBoards: z.array(z.string()).default([]),
  specificSchools: z.array(z.string()).default([]),
  targetInstitutions: z.array(z.string()).default([]),
  fields: z.array(z.string()).default([]),
  minAverage: z.number().nullable().default(null),
  minAge: z.number().nullable().default(null),
  maxAge: z.number().nullable().default(null),
  genderRequired: z.literal('female').nullable().default(null),
  indigenousRequired: z.coerce.boolean().default(false),
  bipocRequired: z.coerce.boolean().default(false),
  financialNeed: z.coerce.boolean().default(false),
  maxFamilyIncome: z.number().nullable().default(null),
  fosterCare: z.coerce.boolean().default(false),
  citizenship: z.enum(['canadian', 'permanent_resident', 'any']).default('any'),
  apprenticeship: z.coerce.boolean().default(false),
  extracurriculars: z.array(z.string()).default([]),
})

function parseEligibility(raw: unknown): EligibilityCriteria | null {
  if (raw === null || raw === undefined) return null
  const result = eligibilitySchema.safeParse(raw)
  if (!result.success) {
    console.warn('eligibility parse failed:', result.error.issues)
    return null
  }
  return result.data as EligibilityCriteria
}

export type Scholarship = {
  id: number
  title: string
  amount: string
  deadline: string | null
  openDate: string | null
  audience: string | null
  url: string
  category: string | null
  lastVerified: string | null
  region: string | null
  notes: string | null
  applyViaGuidance: boolean
  active: boolean
  eligibility: EligibilityCriteria | null
}

export type Program = {
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
  active: boolean
}

const CACHE_TTL = 5 * 60_000 // 5 minutes

let scholarshipCache: { data: Scholarship[]; exp: number } | null = null
let programCache:     { data: Program[];     exp: number } | null = null

export async function loadScholarships(): Promise<Scholarship[]> {
  if (scholarshipCache && Date.now() < scholarshipCache.exp) return scholarshipCache.data
  if (process.env.DATABASE_URL) {
    try {
      const { db } = await import('./db/client')
      const { scholarships } = await import('./db/schema')
      const { eq } = await import('drizzle-orm')
      const rows = await db.select().from(scholarships).where(eq(scholarships.active, true))
      const result = rows.map(r => ({
        id: r.id,
        title: r.title,
        amount: r.amount,
        deadline: r.deadline ?? null,
        openDate: r.openDate ?? null,
        audience: r.audience ?? null,
        url: r.url,
        category: r.category ?? null,
        lastVerified: r.lastVerified ?? null,
        region: r.region ?? null,
        notes: r.notes ?? null,
        applyViaGuidance: r.applyViaGuidance ?? false,
        active: r.active ?? true,
        eligibility: parseEligibility(r.eligibility),
      }))
      scholarshipCache = { data: result, exp: Date.now() + CACHE_TTL }
      return result
    } catch (e) {
      console.error('DB load failed, falling back to JSON:', e)
    }
  }
  const data = await import('../data/scholarships.json')
  return (data.default as any[]).map(s => ({ ...s, openDate: s.openDate ?? null, eligibility: null }))
}

export async function loadPrograms(): Promise<Program[]> {
  if (programCache && Date.now() < programCache.exp) return programCache.data
  if (process.env.DATABASE_URL) {
    try {
      const { db } = await import('./db/client')
      const { researchPrograms } = await import('./db/schema')
      const { eq } = await import('drizzle-orm')
      const rows = await db.select().from(researchPrograms).where(eq(researchPrograms.active, true))
      const result = rows.map(r => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji ?? null,
        category: r.category ?? null,
        provider: r.provider ?? null,
        grades: r.grades ?? null,
        duration: r.duration ?? null,
        paid: r.paid ?? false,
        stipend: r.stipend ?? null,
        location: r.location ?? null,
        eligibility: r.eligibility ?? null,
        deadline: r.deadline ?? null,
        url: r.url,
        description: r.description ?? null,
        lastVerified: r.lastVerified ?? null,
        active: r.active ?? true,
      }))
      programCache = { data: result, exp: Date.now() + CACHE_TTL }
      return result
    } catch (e) {
      console.error('DB load failed, falling back to JSON:', e)
    }
  }
  const data = await import('../data/research-programs.json')
  return data.default as Program[]
}
