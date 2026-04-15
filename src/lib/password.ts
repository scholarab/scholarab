/**
 * PBKDF2 password hashing via Web Crypto API.
 *
 * Why not scrypt (better-auth default):
 *   better-auth uses @noble/hashes scrypt (N=16384, r=16) — pure JavaScript,
 *   ~200–400 ms of CPU. Cloudflare Workers cap CPU at 50 ms per invocation,
 *   so scrypt blows the limit and the Worker crashes with error 1102, which
 *   surfaces as "Invalid credentials" on the login form.
 *
 * Why PBKDF2 here:
 *   crypto.subtle.deriveBits() is a native, hardware-accelerated operation in
 *   CF Workers and is NOT counted against the JavaScript CPU time limit.
 *   600 000 iterations of PBKDF2-SHA256 is the OWASP recommended minimum and
 *   completes in < 5 ms wall-clock time on CF infrastructure.
 *
 * Hash format: pbkdf2:sha256:<iterations>:<saltHex>:<keyHex>
 */

const ITERATIONS = 600_000
const KEY_BYTES  = 32   // 256-bit output
const SALT_BYTES = 16

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

async function derive(password: string, salt: ArrayBuffer, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password.normalize('NFKC')),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    KEY_BYTES * 8,
  )
}

export async function hashPassword(password: string): Promise<string> {
  const saltBuf = new ArrayBuffer(SALT_BYTES)
  crypto.getRandomValues(new Uint8Array(saltBuf))
  const key = await derive(password, saltBuf, ITERATIONS)
  return `pbkdf2:sha256:${ITERATIONS}:${toHex(saltBuf)}:${toHex(key)}`
}

export async function verifyPassword({
  hash,
  password,
}: {
  hash: string
  password: string
}): Promise<boolean> {
  const parts = hash.split(':')
  if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false

  const [, , iterStr, saltHex, expectedHex] = parts
  const iterations = parseInt(iterStr!, 10)
  const saltBytes  = fromHex(saltHex!)
  const derived    = await derive(password, saltBytes.buffer as ArrayBuffer, iterations)
  const actual     = toHex(derived)

  // Constant-time comparison
  if (actual.length !== expectedHex!.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expectedHex!.charCodeAt(i)
  }
  return diff === 0
}
