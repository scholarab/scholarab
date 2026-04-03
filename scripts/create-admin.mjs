import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { createHash, randomBytes } from 'crypto'

const sql = neon(process.env.DATABASE_URL)
const db = drizzle(sql)

// Simple bcrypt-compatible hash using better-auth's expected format
// better-auth uses its own hashing — we use their API instead
async function createUser(email, password, name) {
  // Use better-auth's built-in API to create user
  const baseURL = process.env.BETTER_AUTH_URL || 'http://localhost:4321'

  const res = await fetch(`${baseURL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed: ${res.status} ${err}`)
  }

  const data = await res.json()
  console.log('✅ Admin account created!')
  console.log('   Email:', email)
  console.log('   Name:', name)
  return data
}

const email = process.argv[2] || 'admin@scholarab.ca'
const password = process.argv[3] || randomBytes(8).toString('hex')
const name = process.argv[4] || 'Admin'

console.log('Creating admin user...')
if (!process.argv[3]) {
  console.log('   Auto-generated password:', password)
  console.log('   (pass your own: node scripts/create-admin.mjs email password name)')
}

createUser(email, password, name).catch(err => {
  console.error('❌ Error:', err.message)
  console.error('Make sure the dev server is running: npm run dev')
  process.exit(1)
})
