import { neon } from '@neondatabase/serverless'
import scholarshipsData from '../src/data/scholarships.json' with { type: 'json' }
import programsData from '../src/data/research-programs.json' with { type: 'json' }

const sql = neon(process.env.DATABASE_URL)

async function seed() {
  console.log('Seeding scholarships...')
  for (const s of scholarshipsData) {
    await sql`
      INSERT INTO scholarships (id, title, amount, deadline, open_date, audience, url, category, last_verified, region, notes, apply_via_guidance, active)
      VALUES (${s.id}, ${s.title}, ${s.amount}, ${s.deadline || null}, ${s.openDate || null}, ${s.audience || null}, ${s.url}, ${s.category || null}, ${s.lastVerified || null}, ${s.region || null}, ${s.notes || null}, ${s.applyViaGuidance || false}, ${s.active !== false})
      ON CONFLICT (id) DO NOTHING
    `
  }

  // Fix sequence
  await sql`SELECT setval('scholarships_id_seq', (SELECT MAX(id) FROM scholarships))`

  console.log('Seeding programs...')
  for (const p of programsData) {
    await sql`
      INSERT INTO research_programs (id, name, emoji, category, provider, grades, duration, paid, stipend, location, eligibility, deadline, url, description, last_verified)
      VALUES (${p.id}, ${p.name}, ${p.emoji || null}, ${p.category || null}, ${p.provider || null}, ${p.grades || null}, ${p.duration || null}, ${p.paid || false}, ${p.stipend || null}, ${p.location || null}, ${p.eligibility || null}, ${p.deadline || null}, ${p.url}, ${p.description || null}, ${p.lastVerified || null})
      ON CONFLICT (id) DO NOTHING
    `
  }

  await sql`SELECT setval('research_programs_id_seq', (SELECT MAX(id) FROM research_programs))`

  console.log('Done! Seeded', scholarshipsData.length, 'scholarships and', programsData.length, 'programs')
}

seed().catch(console.error)
