/**
 * Reset the admin password directly in the DB.
 * Usage: DATABASE_URL=<url> node scripts/reset-admin-password.mjs <email> <new-password>
 *
 * Uses the same scrypt parameters as better-auth v1.x
 */
import { neon } from '@neondatabase/serverless'
import { scryptAsync } from '@noble/hashes/scrypt.js'
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js'

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

async function hashPassword(pw) {
  const salt = bytesToHex(randomBytes(16))
  const key  = await scryptAsync(pw.normalize('NFKC'), salt, {
    N: 16384, r: 16, p: 1, dkLen: 64,
    maxmem: 128 * 16384 * 16 * 2,
  })
  return `${salt}:${bytesToHex(key)}`
}

const sql = neon(url)

// Look up the user
const [user] = await sql`SELECT id FROM "user" WHERE email = ${email}`
if (!user) {
  console.error(`No user found with email: ${email}`)
  console.error('Create the account first: node scripts/create-admin.mjs')
  process.exit(1)
}

const hash = await hashPassword(password)

// Update the password in the account table (email provider)
const result = await sql`
  UPDATE account
  SET    password   = ${hash},
         updated_at = now()
  WHERE  user_id     = ${user.id}
    AND  provider_id = 'credential'
`

if (result.count === 0) {
  // No credential account row — insert one
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
