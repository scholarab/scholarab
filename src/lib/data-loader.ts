import type { EligibilityCriteria } from './eligibility-types'
import { eligibilitySchema } from './eligibility-types'

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

export function loadScholarships(): Promise<Scholarship[]> { return loadScholarshipsFromJson() }

/** Public data is the deployed JSON snapshot. Admin drafts are isolated in
 * catalogue_entries and never affect the public site before publication. */
let scholarshipJson: Scholarship[] | undefined
export async function loadScholarshipsFromJson(): Promise<Scholarship[]> {
  if (scholarshipJson) return scholarshipJson
  const data = await import('../data/scholarships.json')
  return scholarshipJson = (data.default as Array<Record<string, unknown>>).map(s => ({ ...(s as Omit<Scholarship, 'eligibility'>), openDate: (s.openDate as string | null) ?? null, eligibility: parseEligibility(s.eligibility) }))
}

export function loadPrograms(): Promise<Program[]> { return loadProgramsFromJson() }

/** The committed JSON, never the database. See loadScholarshipsFromJson. */
let programJson: Program[] | undefined
export async function loadProgramsFromJson(): Promise<Program[]> {
  if (programJson) return programJson
  const data = await import('../data/research-programs.json')
  // Most JSON entries omit `active` entirely (only retired programs carry
  // active: false); default it to true so `p.active` checks don't drop them.
  return programJson = (data.default as Array<Record<string, unknown>>).map(p => ({
    ...(p as unknown as Program),
    metaDescription: (p.metaDescription as string | undefined) ?? null,
    active: (p.active as boolean | undefined) ?? true,
  }))
}
