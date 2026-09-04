import { z } from 'zod'

// Structured eligibility criteria stored per scholarship (parsed from audience text by AI, admin-side only)
export type EligibilityCriteria = {
  grades: string[]              // "10" | "11" | "12" | "post-secondary"
  schoolBoards: string[]        // e.g. "MHPSD", "CBE", "CCSD", "Edmonton Public Schools"
  specificSchools: string[]     // specific school names
  targetInstitutions: string[]  // e.g. "University of Calgary", "Medicine Hat College"
  fields: string[]              // e.g. "STEM", "health", "business", "trades"
  minAverage: number | null     // minimum academic average as integer percentage (65, 75, 80…)
  minAge: number | null
  maxAge: number | null
  genderRequired: 'female' | null  // null = open to all genders
  indigenousRequired: boolean
  bipocRequired: boolean
  financialNeed: boolean
  maxFamilyIncome: number | null   // dollar amount cap (e.g. 65000)
  fosterCare: boolean
  citizenship: 'canadian' | 'permanent_resident' | 'any'
  apprenticeship: boolean          // requires RAP / CTS apprenticeship enrollment
  extracurriculars: string[]       // "volunteer" | "music" | "sports" | "4-H" | "science_fair" | "RAP"
}

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

export const EMPTY_ELIGIBILITY: EligibilityCriteria = {
  grades: [],
  schoolBoards: [],
  specificSchools: [],
  targetInstitutions: [],
  fields: [],
  minAverage: null,
  minAge: null,
  maxAge: null,
  genderRequired: null,
  indigenousRequired: false,
  bipocRequired: false,
  financialNeed: false,
  maxFamilyIncome: null,
  fosterCare: false,
  citizenship: 'any',
  apprenticeship: false,
  extracurriculars: [],
}

// Student's self-reported profile; never leaves the browser
export type StudentProfile = {
  grade: '10' | '11' | '12' | 'post-secondary'
  city: string                     // "Medicine Hat" | "Calgary" | "Edmonton" | "Lethbridge" | "Red Deer" | "Airdrie" | "Brooks" | "Other Alberta"
  schoolBoard: string | null
  specificSchool: string | null
  targetInstitution: string | null
  fields: string[]
  averagePercent: number | null

  // All identity fields are nullable; null means "student did not answer"
  // Only hard-filters when the student explicitly answered
  identifiesAsFemale: boolean | null
  identifiesAsIndigenous: boolean | null
  identifiesAsBIPOC: boolean | null

  hasFinancialNeed: boolean | null
  familyIncome: number | null
  inFosterCare: boolean | null
  inApprenticeship: boolean | null
  extracurriculars: string[]
  citizenship: 'canadian_citizen' | 'permanent_resident' | 'other' | null
}

export type MatchResult = {
  match: boolean
  confidence: number   // 0–1
  reasons: string[]    // human-readable reasons for non-match
  /** Human-readable reasons this DID match, in the order they were scored.
   *  Empty on a rejection, and empty on a match that cleared every filter
   *  without any specificity signal firing. */
  signals: string[]
}

export type ConfidenceTier = 'strong' | 'good' | 'possible'
