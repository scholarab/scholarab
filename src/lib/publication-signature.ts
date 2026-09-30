import { stableJson } from './catalogue'

/**
 * Proof that a publication request came from the admin API.
 *
 * scripts/publish-drafts.ts turns a row in publication_requests into a commit
 * on main, and main deploys to the live site. Without this, anyone who could
 * write to the database could publish anything, say a phishing link in place
 * of a scholarship's apply URL, and the build's validation would pass it: a
 * phishing URL is still a URL. So the Worker signs each request with a key the
 * database never holds (a Worker secret and a GitHub Actions secret), and the
 * publisher refuses any request whose signature does not match.
 *
 * The signature covers the request id and the exact changes, in stableJson
 * form so it survives the jsonb round trip, which reorders keys.
 */
const LABEL = 'scholarab/publication/v1'

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

function message(id: string, changes: unknown) {
  return new TextEncoder().encode(`${LABEL}\n${id}\n${stableJson(changes)}`)
}

export async function signPublication(secret: string, id: string, changes: unknown): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), message(id, changes))
  return Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time: crypto.subtle.verify compares the MACs itself. */
export async function verifyPublication(secret: string, id: string, changes: unknown, signature: unknown): Promise<boolean> {
  if (typeof signature !== 'string' || !/^[0-9a-f]{64}$/.test(signature)) return false
  const bytes = new Uint8Array(signature.match(/../g)!.map(h => parseInt(h, 16)))
  return crypto.subtle.verify('HMAC', await hmacKey(secret), bytes, message(id, changes))
}
