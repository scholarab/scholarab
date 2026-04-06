import type { APIRoute } from 'astro'
import Anthropic from '@anthropic-ai/sdk'
import { auth } from '../../../../lib/auth'
import { db } from '../../../../lib/db/client'
import { scholarships } from '../../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import type { EligibilityCriteria } from '../../../../lib/eligibility-types'
import { EMPTY_ELIGIBILITY } from '../../../../lib/eligibility-types'

export const prerender = false

// Per-user rate limit: max 20 AI parse requests per hour
const parseRateLimit = new Map<string, { count: number; reset: number }>()
function checkParseRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = parseRateLimit.get(userId)
  if (!entry || now > entry.reset) {
    parseRateLimit.set(userId, { count: 1, reset: now + 3_600_000 })
    return true
  }
  if (entry.count >= 20) return false
  entry.count++
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
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  if (!checkParseRateLimit(session.user.id)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded — max 20 AI parses per hour' }), { status: 429 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500 })
  }

  try {
    const { id } = await request.json()
    if (typeof id !== 'number') {
      return new Response(JSON.stringify({ error: 'id must be a number' }), { status: 400 })
    }

    const [scholarship] = await db
      .select({ id: scholarships.id, title: scholarships.title, audience: scholarships.audience, category: scholarships.category, region: scholarships.region })
      .from(scholarships)
      .where(eq(scholarships.id, id))
    if (!scholarship) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

    if (!scholarship.audience?.trim()) {
      return new Response(JSON.stringify({ error: 'No audience text to parse' }), { status: 400 })
    }

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: buildPrompt(scholarship.title, scholarship.audience, scholarship.category, scholarship.region),
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    let parsed: EligibilityCriteria
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return new Response(JSON.stringify({ error: 'AI returned invalid JSON', raw: cleaned }), { status: 502 })
    }

    // Merge with defaults to ensure all keys are present
    const eligibility: EligibilityCriteria = { ...EMPTY_ELIGIBILITY, ...parsed }

    return new Response(JSON.stringify({ eligibility }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}
