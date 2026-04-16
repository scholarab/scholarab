import type { APIRoute } from 'astro'
import { checkAdminPassword, createSessionCookie, SESSION_COOKIE } from '../../../lib/adminAuth'
import { jsonError } from '../../../lib/api-response'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  try {
    const { password } = await request.json()
    if (!password || !(await checkAdminPassword(password))) {
      return jsonError('Invalid credentials', 401)
    }
    const value = await createSessionCookie()
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 8}`,
      },
    })
  } catch {
    return jsonError('Invalid request', 400)
  }
}
