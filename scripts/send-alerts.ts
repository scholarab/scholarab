#!/usr/bin/env node
// Sends deadline reminder emails via Resend.
// Run daily via GitHub Actions. Requires DATABASE_URL and RESEND_API_KEY.
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { neon } from '@neondatabase/serverless'
import { generateSlug } from '../src/lib/utils.ts'
import { parseCadence } from '../src/lib/alerts.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DATABASE_URL = process.env.DATABASE_URL
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.ALERT_FROM_EMAIL ?? 'ScholarAB <alerts@scholarab.ca>'
// scholarab.ca has no MX record, so replies to the From address bounce.
const REPLY_TO = process.env.ALERT_REPLY_TO ?? 'contact.scholarab@gmail.com'
const BASE_URL = process.env.SITE_URL ?? 'https://www.scholarab.ca'

if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1) }
if (!RESEND_API_KEY) { console.error('RESEND_API_KEY not set'); process.exit(1) }

interface Item { id: number; title?: string; name?: string; amount?: string; deadline?: string; url: string; active: boolean }

const scholarships: Item[] = JSON.parse(readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8'))
const programs: Item[] = JSON.parse(readFileSync(join(__dirname, '../src/data/research-programs.json'), 'utf8'))

const sql = neon(DATABASE_URL)
const today = new Date()
today.setHours(0, 0, 0, 0)
const MILESTONES = process.env.TEST_DAYS ? [parseInt(process.env.TEST_DAYS)] : [30, 14, 3]
// CATCH_UP=1: one-off mode — remind every subscriber whose item still has a
// future deadline, using the real days-left count instead of milestone days.
// Used to catch everyone up after the alert pipeline was down. DRY_RUN=1
// prints the plan without sending.
const CATCH_UP = process.env.CATCH_UP === '1'
const DRY_RUN = process.env.DRY_RUN === '1'
// Both of these are manual overrides aimed at a specific day, so honouring a
// subscriber's chosen milestones would make them send nothing at all.
const IGNORE_CADENCE = CATCH_UP || !!process.env.TEST_DAYS

interface SubscriberRow { email: string; token: string; cadence: string }

/**
 * Subscribers for one item, with their cadence. Falls back to a query without
 * the column so a run that beats 0009_subscriber_cadence.sql still mails on
 * every milestone rather than failing the whole job.
 */
let cadenceColumnMissing = false
async function subscribersFor(itemType: string, itemId: number): Promise<SubscriberRow[]> {
  if (!cadenceColumnMissing) {
    try {
      return await sql`
        SELECT email, token, cadence FROM subscribers
        WHERE item_type = ${itemType} AND item_id = ${itemId}
      ` as SubscriberRow[]
    } catch (e) {
      cadenceColumnMissing = true
      console.error('[alerts] no cadence column — mailing every milestone. Apply drizzle/migrations/0009_subscriber_cadence.sql:', e)
    }
  }
  const rows = await sql`
    SELECT email, token FROM subscribers
    WHERE item_type = ${itemType} AND item_id = ${itemId}
  ` as { email: string; token: string }[]
  return rows.map(r => ({ ...r, cadence: '' }))
}

function daysUntil(deadline: string): number {
  return Math.round((new Date(deadline + 'T00:00:00').getTime() - today.getTime()) / 86_400_000)
}

function formatDate(str: string): string {
  return new Date(str + 'T00:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function emailHtml(rawLabel: string, rawAmount: string | undefined, deadline: string, applyUrl: string, unsubscribeUrl: string, daysLeft: number): string {
  const label = escapeHtml(rawLabel)
  const amount = rawAmount ? escapeHtml(rawAmount) : undefined
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,system-ui,sans-serif">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <div style="background:#0a0a0f;padding:24px 32px">
    <span style="font-size:20px;font-weight:700;color:#fff">Scholar<span style="color:#22d3a5">AB</span></span>
  </div>
  <div style="padding:32px">
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#888">${daysLeft} day${daysLeft === 1 ? '' : 's'} left to apply</p>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a0a0f;line-height:1.3">${label}</h1>
    ${amount ? `<p style="margin:0 0 4px;font-size:18px;font-weight:600;color:#0c8060">${amount}</p>` : ''}
    <p style="margin:0 0 24px;font-size:14px;color:#666">Deadline: ${formatDate(deadline)}</p>
    <a href="${applyUrl}" style="display:inline-block;background:#0c8060;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">Apply Now →</a>
  </div>
  <div style="padding:16px 32px 24px;border-top:1px solid #f0f0f0">
    <p style="margin:0;font-size:12px;color:#aaa">
      You signed up for deadline reminders on <a href="${BASE_URL}" style="color:#0c8060;text-decoration:none">ScholarAB</a>.
      <a href="${unsubscribeUrl}" style="color:#aaa">Unsubscribe</a>
    </p>
  </div>
</div>
</body></html>`
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

let sent = 0
let errors = 0

const allItems = [
  // `active !== false`: most program entries don't carry the field at all —
  // requiring truthy `active` silently excluded them from alerts.
  ...scholarships.filter(s => s.active !== false && s.deadline).map(s => ({ ...s, itemType: 'scholarship', label: s.title!, detailUrl: `${BASE_URL}/scholarships/${generateSlug(s.title!)}` })),
  ...programs.filter(p => p.active !== false && p.deadline && p.deadline !== 'TBA' && p.deadline !== 'Ongoing').map(p => ({ ...p, itemType: 'program', label: p.name!, detailUrl: `${BASE_URL}/programs/${generateSlug(p.name!)}` })),
]

const targets = CATCH_UP
  ? allItems.map(item => ({ item, days: daysUntil(item.deadline!) })).filter(t => t.days > 0)
  : MILESTONES.flatMap(m => allItems.filter(item => daysUntil(item.deadline!) === m).map(item => ({ item, days: m })))

for (const { item, days } of targets) {
  const rows = await subscribersFor(item.itemType, item.id)

  for (const { email, token, cadence } of rows) {
    // Skip anyone who did not pick this milestone. CATCH_UP is a deliberate
    // one-off sweep after an outage and TEST_DAYS is a manual probe, so both
    // ignore the cadence — the point there is that everyone hears once.
    if (!IGNORE_CADENCE && !(parseCadence(cadence) as number[]).includes(days)) continue
    // Resend rejects reserved test domains with a 422, which would fail the
    // whole run — skip them rather than count them as errors.
    if (/@example\.(com|org|net)$/i.test(email)) {
      console.log(`  skipped test address ${email} (${item.itemType} ${item.id})`)
      continue
    }
    const subject = `${days} day${days === 1 ? '' : 's'} left: ${item.label} closes ${formatDate(item.deadline!)}`
    const html = emailHtml(item.label, item.amount, item.deadline!, item.detailUrl, `${BASE_URL}/api/unsubscribe?token=${token}`, days)
    if (DRY_RUN) {
      sent++
      console.log(`  would send ${days}d → ${email} (${item.itemType} ${item.id}: ${item.label})`)
      continue
    }
    try {
      await sendEmail(email, subject, html)
      sent++
      console.log(`  sent ${days}d → ${email} (${item.itemType} ${item.id})`)
    } catch (e) {
      errors++
      console.error(`  failed ${email} (${item.itemType} ${item.id}):`, e)
    }
  }
}

console.log(`Done. Sent: ${sent}, Errors: ${errors}`)
if (errors > 0) process.exit(1)
