export const prerender = false

import type { APIRoute } from 'astro'
import { db } from '../../lib/db/client'
import { subscribers } from '../../lib/db/schema'
import { loadScholarships } from '../../lib/data-loader'
import { jsonOk, jsonError } from '../../lib/api-response'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const POST: APIRoute = async ({ request }) => {
  let body: unknown
  try { body = await request.json() } catch { return jsonError('Invalid JSON', 400) }

  const { email, scholarshipId } = body as Record<string, unknown>

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return jsonError('Valid email required', 400)
  }
  if (!scholarshipId || typeof scholarshipId !== 'number' || !Number.isInteger(scholarshipId)) {
    return jsonError('Valid scholarshipId required', 400)
  }

  const scholarships = await loadScholarships()
  const scholarship = scholarships.find(s => s.id === scholarshipId)
  if (!scholarship) return jsonError('Scholarship not found', 404)
  if (!scholarship.deadline) return jsonError('This scholarship has no deadline', 400)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(scholarship.deadline + 'T00:00:00')
  if (deadline <= today) return jsonError('This scholarship deadline has passed', 400)

  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  try {
    await db.insert(subscribers).values({
      email: email.toLowerCase().trim(),
      scholarshipId,
      token,
    }).onConflictDoNothing()
  } catch {
    return jsonError('Internal server error', 500)
  }

  return jsonOk({ ok: true })
}
