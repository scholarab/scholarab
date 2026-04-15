/**
 * Reset the admin password directly in the DB using PBKDF2.
 * Usage: DATABASE_URL=<url> node scripts/reset-admin-password.mjs <email> <new-password>
 *
 * Must match the PBKDF2 scheme in src/lib/password.ts
 */
import { neon } from '@neondatabase/serverless'

const email    = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('Usage: DATABASE_URL=<url> node scripts/reset-admin-password.mjs <email> <new-password>')
  process.exit(1)
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL env var is required')
  process.exit(1)
}

const ITERATIONS = 600_000
const KEY_BYTES  = 32
const SALT_BYTES = 16

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const key  = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw.normalize('NFKC')), { name: 'PBKDF2' }, false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, KEY_BYTES * 8)
  return `pbkdf2:sha256:${ITERATIONS}:${toHex(salt.buffer)}:${toHex(derived)}`
}

const sql = neon(url)

const [user] = await sql`SELECT id FROM "user" WHERE email = ${email}`
if (!user) {
  console.error(`No user found with email: ${email}`)
  console.error('Create the account first: node scripts/create-admin.mjs')
  process.exit(1)
}

const hash = await hashPassword(password)

const result = await sql`
  UPDATE account
  SET    password   = ${hash},
         updated_at = now()
  WHERE  user_id     = ${user.id}
    AND  provider_id = 'credential'
`

if (result.count === 0) {
  const { randomUUID } = await import('crypto')
  await sql`
    INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
    VALUES (${randomUUID()}, ${email}, 'credential', ${user.id}, ${hash}, now(), now())
  `
  console.log('Created new credential row and set password.')
} else {
  console.log('Password updated successfully.')
}

console.log('Email:', email)
console.log('Done — you can now sign in with the new password.')
