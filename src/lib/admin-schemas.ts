// Zod schemas for the admin CRUD routes. Create and Update share the same
// field definitions; Update loosens the required fields and drops defaults
// (an omitted boolean on PUT must not overwrite the stored value).
import { z } from 'zod'
import { eligibilitySchema } from './data-loader'
import { httpsUrl } from './validators'

const scholarshipOptionalFields = {
  deadline: z.string().max(50).optional().nullable(),
  openDate: z.string().max(50).optional().nullable(),
  audience: z.string().max(5000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  lastVerified: z.string().max(50).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  eligibility: eligibilitySchema.optional().nullable(),
}

export const scholarshipCreateSchema = z.object({
  title: z.string().min(1).max(500),
  amount: z.string().min(1).max(100),
  url: httpsUrl,
  applyViaGuidance: z.boolean().default(false),
  active: z.boolean().default(true),
  ...scholarshipOptionalFields,
})

export const scholarshipUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  amount: z.string().min(1).max(100).optional(),
  url: httpsUrl.optional(),
  applyViaGuidance: z.boolean().optional(),
  active: z.boolean().optional(),
  ...scholarshipOptionalFields,
})

const programOptionalFields = {
  emoji: z.string().max(10).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  provider: z.string().max(200).optional().nullable(),
  grades: z.string().max(200).optional().nullable(),
  duration: z.string().max(200).optional().nullable(),
  stipend: z.string().max(200).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  eligibility: z.string().max(10000).optional().nullable(),
  deadline: z.string().max(50).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  lastVerified: z.string().max(50).optional().nullable(),
}

export const programCreateSchema = z.object({
  name: z.string().min(1).max(500),
  url: httpsUrl,
  paid: z.boolean().default(false),
  active: z.boolean().default(true),
  ...programOptionalFields,
})

export const programUpdateSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  url: httpsUrl.optional(),
  paid: z.boolean().optional(),
  active: z.boolean().optional(),
  ...programOptionalFields,
})
