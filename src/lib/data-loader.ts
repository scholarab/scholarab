import type { EligibilityCriteria } from './eligibility-types'
import { eligibilitySchema } from './eligibility-types'
import { getEnv } from 'astro/env/runtime'
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
  /**
   * An authored clause appended to the derived SERP snippet. JSON-only, like
   * Program.metaDescription: there is no column, so the DB path reports null
   * and the dev server renders the snippet without it. See scholarshipMeta.
   */
  metaDetail?: string | null
  /**
   * Extra region hubs this listing belongs on, beyond its own `region`.
   *
   * A handful of awards name a list of eligible communities rather than one
   * city: the Calgary Black Chambers awards are open to graduates of Airdrie,
   * Chestermere, Cochrane, Okotoks and five more. `region` can only hold one
   * of those, so before this field an Airdrie student's own hub could not show
   * them an award they are plainly eligible for. JSON-only, like metaDetail.
   */
  alsoOpenTo?: string[] | null
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
  /**
   * An authored SERP snippet that overrides the one derived from
   * `description`. JSON-only: there is no column for it, so the DB path always
   * reports null and the dev server renders the derived snippet while the
   * build renders this. See programMeta in src/lib/meta.ts.
   */
  metaDescription?: string | null
  lastVerified: string | null
  active: boolean
}

let scholarshipCache: { data: Scholarship[]; exp: number } | null = null
let programCache:     { data: Program[];     exp: number } | null = null

const hasDbUrl = () =>
  getEnv('DATABASE_URL') ?? import.meta.env.DATABASE_URL ?? process.env.DATABASE_URL

// Shared cache + DB-with-JSON-fallback skeleton for both loaders.
async function loadItems<T>(
  cache: { data: T[]; exp: number } | null,
  setCache: (c: { data: T[]; exp: number }) => void,
  fromDb: () => Promise<T[]>,
  fromJson: () => Promise<T[]>,
): Promise<T[]> {
  if (cache && Date.now() < cache.exp) return cache.data
  if (hasDbUrl()) {
    try {
      const result = await fromDb()
      setCache({ data: result, exp: Date.now() + CACHE_TTL_MS })
      return result
    } catch (e) {
      console.error('DB load failed, falling back to JSON:', e)
    }
  }
  return fromJson()
}

export function loadScholarships(): Promise<Scholarship[]> {
  return loadItems(
    scholarshipCache,
    c => { scholarshipCache = c },
    async () => {
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
      return rows.map(r => ({
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
        notes: null, // admin-only field, not fetched on public path
        applyViaGuidance: r.applyViaGuidance ?? false,
        active: r.active ?? true,
        eligibility: parseEligibility(r.eligibility),
        metaDetail: null,
      }))
    },
    loadScholarshipsFromJson,
  )
}

/**
 * The committed JSON, never the database.
 *
 * `loadScholarships` prefers Postgres whenever DATABASE_URL is bound, which is
 * always true inside the Worker. That is fine for anything that only needs the
 * currently-active set, but it is wrong for resolving an id that came from a
 * page: pages are prerendered from this JSON with DATABASE_URL blanked (see
 * the build script), and the two stores have diverged badly. Callers that must
 * agree with what the site actually rendered use this instead.
 */
export async function loadScholarshipsFromJson(): Promise<Scholarship[]> {
  const data = await import('../data/scholarships.json')
  return (data.default as Array<Record<string, unknown>>).map(s => ({ ...(s as Omit<Scholarship, 'eligibility'>), openDate: (s.openDate as string | null) ?? null, eligibility: parseEligibility(s.eligibility) }))
}

export function loadPrograms(): Promise<Program[]> {
  return loadItems(
    programCache,
    c => { programCache = c },
    async () => {
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
      return rows.map(r => ({
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
        metaDescription: null,
        lastVerified: r.lastVerified ?? null,
        active: r.active ?? true,
      }))
    },
    loadProgramsFromJson,
  )
}

/** The committed JSON, never the database. See loadScholarshipsFromJson. */
export async function loadProgramsFromJson(): Promise<Program[]> {
  const data = await import('../data/research-programs.json')
  // Most JSON entries omit `active` entirely (only retired programs carry
  // active: false); default it to true so `p.active` checks don't drop them.
  return (data.default as Array<Record<string, unknown>>).map(p => ({
    ...(p as unknown as Program),
    metaDescription: (p.metaDescription as string | undefined) ?? null,
    active: (p.active as boolean | undefined) ?? true,
  }))
}
