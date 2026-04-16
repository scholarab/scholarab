import type { APIRoute } from 'astro'
import Anthropic from '@anthropic-ai/sdk'
import { getEnv } from 'astro/env/runtime'
import { isAdminRequest } from '../../../../lib/adminAuth'
import { db } from '../../../../lib/db/client'
import { scholarships, parseLog } from '../../../../lib/db/schema'
import { eq, gte, and, sql } from 'drizzle-orm'
import type { EligibilityCriteria } from '../../../../lib/eligibility-types'
import { EMPTY_ELIGIBILITY } from '../../../../lib/eligibility-types'
import { jsonError } from '../../../../lib/api-response'
import { AI_PARSE_LIMIT, AI_PARSE_WINDOW_MS } from '../../../../lib/constants'

export const prerender = false

async function checkAndLogParseRateLimit(): Promise<boolean> {
  const windowStart = new Date(Date.now() - AI_PARSE_WINDOW_MS)
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(parseLog)
    .where(and(eq(parseLog.userId, 'admin'), gte(parseLog.createdAt, windowStart)))
  const count = rows[0]?.count ?? 0
  if (count >= AI_PARSE_LIMIT) return false
  await db.insert(parseLog).values({ userId: 'admin' })
  return true
}

const SCHEMA_DESC = `{
  grades: string[],              // Only grades explicitly mentioned. Values: "10","11","12","post-secondary"
  schoolBoards: string[],        // Only if a specific board is mentioned. Values: "MHPSD","CBE","CCSD","Edmonton Public Schools","Edmonton Catholic Schools","Lethbridge School Division"
  specificSchools: string[],     // Only if specific school names are mentioned
  targetInstitutions: string[],  // Only if a specific institution is required. Values: "University of Calgary","University of Alberta","MacEwan University","Mount Royal University","University of Lethbridge","Medicine Hat College","any"
  fields: string[],              // Values: "STEM","health","business","arts","trades","agriculture","education","music","social_work","environmental","engineering","law","criminal_justice","humanities"
  minAverage: number | null,     // Minimum academic average as integer percentage (65, 75, 80, 85, 90, 95). null if not stated.
  minAge: number | null,
  maxAge: number | null,
  genderRequired: "female" | null,  // "female" only if explicitly restricted to girls/women/female-identifying. null otherwise.
  indigenousRequired: boolean,      // true only if First Nations/Métis/Inuit identity is explicitly required
  bipocRequired: boolean,
  financialNeed: boolean,
  maxFamilyIncome: number | null,   // Dollar amount cap if stated (e.g. 65000 for "$65,000"). null otherwise.
  fosterCare: boolean,
  citizenship: "canadian" | "permanent_resident" | "any",  // "canadian" for most AB scholarships. "permanent_resident" if both citizens and PRs are accepted. "any" if truly open to international.
  apprenticeship: boolean,          // true if RAP or CTS apprenticeship enrollment is required
  extracurriculars: string[]        // Values: "volunteer","music","sports","4-H","science_fair","RAP"
}`

function buildPrompt(title: string, audience: string, category: string | null, region: string | null): string {
  return `You are parsing a scholarship's eligibility requirements into structured JSON.

Scholarship title: "${title}"
Who can apply: "${audience}"
Category: ${category ?? 'unknown'}
Region: ${region ?? 'unknown'}

Return ONLY a JSON object matching this exact schema. Be conservative — only mark something as required if it is explicitly stated. Empty arrays and false/null are the safe defaults.

Schema:
${SCHEMA_DESC}

Rules:
- "grades" should be empty [] if any grade level can apply
- "specificSchools" should only contain schools named explicitly, not implied by a school board
- If the audience is broad (e.g., "All Canadian students"), use empty arrays and false for all flags
- Do NOT infer requirements that are not stated
- Return only valid JSON, no explanation, no markdown`
}

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return jsonError('Unauthorized', 401)

  if (!(await checkAndLogParseRateLimit())) {
    return jsonError(`Rate limit exceeded — max ${AI_PARSE_LIMIT} AI parses per hour`, 429)
  }

  const apiKey = getEnv('ANTHROPIC_API_KEY') ?? import.meta.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) return jsonError('ANTHROPIC_API_KEY not configured', 500)

  try {
    const { id } = await request.json()
    if (typeof id !== 'number') return jsonError('id must be a number', 400)

    const [scholarship] = await db
      .select({ id: scholarships.id, title: scholarships.title, audience: scholarships.audience, category: scholarships.category, region: scholarships.region })
      .from(scholarships)
      .where(eq(scholarships.id, id))
    if (!scholarship) return jsonError('Not found', 404)

    if (!scholarship.audience?.trim()) return jsonError('No audience text to parse', 400)

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(scholarship.title, scholarship.audience, scholarship.category, scholarship.region) }],
    })

    const first = message.content[0]
    const text = first?.type === 'text' ? first.text.trim() : ''
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    let parsed: EligibilityCriteria
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return jsonError('AI returned invalid JSON', 502)
    }

    const eligibility: EligibilityCriteria = { ...EMPTY_ELIGIBILITY, ...parsed }
    return new Response(JSON.stringify({ eligibility }), { status: 200 })
  } catch (e) {
    console.error('[POST /admin/api/scholarships/parse-eligibility]', e)
    return jsonError('Internal server error', 500)
  }
}
