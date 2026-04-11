import type { EligibilityCriteria } from './eligibility-types'
import { eligibilitySchema } from './eligibility-types'
import { CACHE_TTL_MS } from './constants'

export { eligibilitySchema } from './eligibility-types'

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

const CACHE_TTL = CACHE_TTL_MS

let scholarshipCache: { data: Scholarship[]; exp: number } | null = null
let programCache:     { data: Program[];     exp: number } | null = null

export async function loadScholarships(): Promise<Scholarship[]> {
  if (scholarshipCache && Date.now() < scholarshipCache.exp) return scholarshipCache.data
  if (process.env.DATABASE_URL) {
    try {
      const { db } = await import('./db/client')
      const { scholarships } = await import('./db/schema')
      const { eq } = await import('drizzle-orm')
      const rows = await db.select({
        id: scholarships.id,
        title: scholarships.title,
        amount: scholarships.amount,
        deadline: scholarships.deadline,
        openDate: scholarships.openDate,
        audience: scholarships.audience,
        url: scholarships.url,
        category: scholarships.category,
        lastVerified: scholarships.lastVerified,
        region: scholarships.region,
        applyViaGuidance: scholarships.applyViaGuidance,
        active: scholarships.active,
        eligibility: scholarships.eligibility,
      }).from(scholarships).where(eq(scholarships.active, true))
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
        notes: null, // admin-only field — not fetched on public path
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
      const rows = await db.select({
        id: researchPrograms.id,
        name: researchPrograms.name,
        emoji: researchPrograms.emoji,
        category: researchPrograms.category,
        provider: researchPrograms.provider,
        grades: researchPrograms.grades,
        duration: researchPrograms.duration,
        paid: researchPrograms.paid,
        stipend: researchPrograms.stipend,
        location: researchPrograms.location,
        eligibility: researchPrograms.eligibility,
        deadline: researchPrograms.deadline,
        url: researchPrograms.url,
        description: researchPrograms.description,
        lastVerified: researchPrograms.lastVerified,
        active: researchPrograms.active,
      }).from(researchPrograms).where(eq(researchPrograms.active, true))
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
