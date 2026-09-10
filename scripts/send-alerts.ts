#!/usr/bin/env node
// Sends deadline reminder emails via Resend.
// Run daily via GitHub Actions. Requires DATABASE_URL and RESEND_API_KEY.
import { claimRecipient, deliverMail, mailKey, type MailPayload } from '../src/lib/mail-delivery.ts'
import { calendarDaysUntil } from '../src/lib/calendar.ts'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { neon } from '@neondatabase/serverless'
import { generateSlug } from '../src/lib/utils.ts'
import { parseCadence } from '../src/lib/alerts.ts'
import { CONFIRM_SUBJECT, confirmEmailHtml } from '../src/lib/confirm-email.ts'
import { listUnsubscribeHeaders, senderIdentityHtml } from '../src/lib/email-identity.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DATABASE_URL = process.env.DATABASE_URL
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.ALERT_FROM_EMAIL ?? 'ScholarAB <alerts@scholarab.ca>'
// scholarab.ca has no MX record, so replies to the From address bounce.
const REPLY_TO = process.env.ALERT_REPLY_TO ?? 'contact.scholarab@gmail.com'
const BASE_URL = process.env.SITE_URL ?? 'https://www.scholarab.ca'
// CASL s.6(2)(b): a postal address has to travel in the message itself.
const MAILING_ADDRESS = process.env.ALERT_MAILING_ADDRESS

if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1) }
if (!RESEND_API_KEY) { console.error('RESEND_API_KEY not set'); process.exit(1) }

interface Item { id: number; title?: string; name?: string; amount?: string; deadline?: string; url: string; active: boolean }

const scholarships: Item[] = JSON.parse(readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8'))
const programs: Item[] = JSON.parse(readFileSync(join(__dirname, '../src/data/research-programs.json'), 'utf8'))

const sql = neon(DATABASE_URL)
const MILESTONES = process.env.TEST_DAYS ? [parseInt(process.env.TEST_DAYS)] : [30, 14, 3]
// CATCH_UP=1: one-off mode; remind every subscriber whose item still has a
// future deadline, using the real days-left count instead of milestone days.
// Used to catch everyone up after the alert pipeline was down. DRY_RUN=1
// prints the plan without sending.
const CATCH_UP = process.env.CATCH_UP === '1'
const DRY_RUN = process.env.DRY_RUN === '1'
// Both of these are manual overrides aimed at a specific day, so honouring a
// subscriber's chosen milestones would make them send nothing at all.
const IGNORE_CADENCE = CATCH_UP || !!process.env.TEST_DAYS

interface SubscriberRow { id:number; email:string; token:string; cadence:string; item_type:string; item_id:number }
const query = (text:string,params?:unknown[]) => sql.query(text,params)
function daysUntil(deadline:string):number { return calendarDaysUntil(deadline) }

function formatDate(str: string): string {
  return new Date(str + 'T00:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function emailHtml(rawLabel: string, rawAmount: string | undefined, deadline: string, rawApplyUrl: string, unsubscribeUrl: string, daysLeft: number): string {
  const label = escapeHtml(rawLabel)
  const amount = rawAmount ? escapeHtml(rawAmount) : undefined
  // Escaped like the two above it, which it was not. validate-data.ts checks
  // that every listing url parses, and `new URL()` accepts a quote in a path
  // quite happily, so an unescaped one here would end the href attribute and
  // let the rest of the value become markup of its own.
  const applyUrl = escapeHtml(rawApplyUrl)
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
    ${senderIdentityHtml({
      preamble: 'You asked ScholarAB for deadline reminders and confirmed the request by email.',
      mailingAddress: MAILING_ADDRESS,
      unsubscribeUrl,
      siteUrl: BASE_URL,
    })}
  </div>
</div>
</body></html>`
}

/**
 * `unsubscribeUrl` is required rather than optional: every message this script
 * sends has a subscription behind it, and a missing one would silently drop
 * the one-click headers rather than fail loudly. See listUnsubscribeHeaders.
 */
async function sendEmail(row: {id:number; email:string; token:string}, kind:'confirm'|'reminder', identity:string, subject:string, html:string, unsubscribeUrl:string): Promise<boolean> {
  const payload:MailPayload = {from:FROM,to:[row.email],reply_to:REPLY_TO,subject,html,headers:listUnsubscribeHeaders(unsubscribeUrl)}
  return await deliverMail(query,await mailKey(identity),row.id,kind,payload,RESEND_API_KEY!) === 'sent'
}

let sent = 0
let errors = 0

/**
 * Double opt-in safety net.
 *
 * /api/alert mails the confirmation itself the moment someone signs up, but
 * only if RESEND_API_KEY is bound to the Worker and Resend answers. When it
 * isn't, the row lands with confirmed_at and confirm_sent_at both null and
 * nothing would ever ask the person to confirm; they'd get silence instead of
 * reminders. This job has the key by definition, so it sweeps them.
 *
 * confirm_sent_at is what stops this from re-asking every morning: one
 * confirmation per sign-up, and someone who ignores it is left alone.
 *
 * Three limits on the query below, because without them this sweep was an
 * amplifier rather than a safety net. /api/alert caps confirmation mail per
 * address, but a suppressed send does not drop the row; it leaves it here
 * with confirm_sent_at still null. So anyone could POST one victim's address
 * against a different itemId 20 times per 15 minutes, have 19 of the 20
 * "suppressed", and let this job mail every one of them in a single burst
 * from the real alerts@ address. Roughly 1,900 messages a day to one inbox,
 * signed by our own domain.
 *
 *   DISTINCT ON (email)  one confirmation per address per run, so the
 *                        amplification factor is 1, which is the number
 *                        double opt-in is supposed to guarantee.
 *   NOT EXISTS           and not even that one if the address already had a
 *                        confirmation in the last day, whoever sent it.
 *   created_at window    a row nobody has confirmed in a week is not waiting
 *                        on us; without this the drip would run for years.
 *
 * The honest case is untouched: one sign-up the Worker could not mail is one
 * row, swept on the next run.
 */
const CONFIRM_SWEEP_COOLDOWN = '24 hours'
const CONFIRM_SWEEP_MAX_AGE = '7 days'

async function sendPendingConfirmations(): Promise<void> {
  let pending: { id: number; email: string; token: string; item_type: string; item_id: number; cadence:string }[]
  try {
    pending = await sql`
      SELECT DISTINCT ON (s.email) s.id, s.email, s.token, s.item_type, s.item_id, s.cadence
      FROM subscribers s
      WHERE s.confirmed_at IS NULL
        AND s.confirm_sent_at IS NULL
        AND s.created_at > now() - ${CONFIRM_SWEEP_MAX_AGE}::interval
        AND NOT EXISTS (
          SELECT 1 FROM subscribers r
          WHERE r.email = s.email
            AND r.confirm_sent_at > now() - ${CONFIRM_SWEEP_COOLDOWN}::interval
        )
      ORDER BY s.email, s.id
    ` as typeof pending
  } catch (e) {
    console.error('[confirm] cannot read pending confirmations. Is 0010 applied?', e)
    return
  }
  if (pending.length === 0) return
  console.log(`Confirmations pending: ${pending.length}`)

  for (const row of pending) {
    const list = row.item_type === 'program' ? programs : scholarships
    const item = list.find(i => i.id === row.item_id)
    // A sign-up for a listing that has since been removed has nothing to
    // confirm. Left alone rather than deleted; that is a curator's call.
    if (!item) continue
    const label = item.title ?? item.name ?? 'your saved listing'
    if (/@example\.(com|org|net)$/i.test(row.email)) continue
    if (DRY_RUN) {
      console.log(`  would ask ${row.id} to confirm (${row.item_type} ${row.item_id})`)
      continue
    }
    try {
      if (!(await claimRecipient(query,row.email))) continue
      const confirmUrl = `${BASE_URL}/api/confirm?token=${row.token}`
      if (!(await sendEmail(row,'confirm',`confirm/${confirmUrl}`,CONFIRM_SUBJECT,
        confirmEmailHtml(label,confirmUrl,MAILING_ADDRESS,row.cadence),
        `${BASE_URL}/api/unsubscribe?token=${row.token}`))) continue
      await sql`UPDATE subscribers SET confirm_sent_at = now() WHERE id = ${row.id}`
      console.log(`  asked ${row.id} to confirm (${row.item_type} ${row.item_id})`)
    } catch (e) {
      errors++
      console.error(`  confirm failed ${row.id}:`, e)
    }
  }
}

await sendPendingConfirmations()

const allItems = [
  // `active !== false`: most program entries don't carry the field at all;
  // requiring truthy `active` silently excluded them from alerts.
  ...scholarships.filter(s => s.active !== false && s.deadline).map(s => ({ ...s, itemType: 'scholarship', label: s.title!, detailUrl: `${BASE_URL}/scholarships/${generateSlug(s.title!)}` })),
  ...programs.filter(p => p.active !== false && p.deadline && p.deadline !== 'TBA' && p.deadline !== 'Ongoing').map(p => ({ ...p, itemType: 'program', label: p.name!, detailUrl: `${BASE_URL}/programs/${generateSlug(p.name!)}` })),
]

const targets = CATCH_UP
  ? allItems.map(item => ({ item, days: daysUntil(item.deadline!) })).filter(t => t.days > 0)
  : MILESTONES.flatMap(m => allItems.filter(item => daysUntil(item.deadline!) === m).map(item => ({ item, days: m })))

// One recipient read for all target items, not one HTTP round trip per listing.
const targetKeys = targets.map(({item})=>`${item.itemType}:${item.id}`)
const recipients = targetKeys.length ? await sql`
  SELECT id,email,token,cadence,item_type,item_id FROM subscribers
  WHERE confirmed_at IS NOT NULL AND (item_type || ':' || item_id::text) = ANY(${targetKeys}::text[])` as SubscriberRow[] : []
const byItem = new Map<string,SubscriberRow[]>()
for (const row of recipients) {
  const key=`${row.item_type}:${row.item_id}`
  const bucket=byItem.get(key) ?? [];bucket.push(row);byItem.set(key,bucket)
}
for (const {item,days} of targets) {
  for (const row of byItem.get(`${item.itemType}:${item.id}`) ?? []) {
    if (!IGNORE_CADENCE && !(parseCadence(row.cadence) as number[]).includes(days)) continue
    if (/@example\.(com|org|net)$/i.test(row.email)) continue
    const subject = `${days} day${days === 1 ? '' : 's'} left: ${item.label} closes ${formatDate(item.deadline!)}`
    const unsubscribeUrl = `${BASE_URL}/api/unsubscribe?token=${row.token}`
    const html = emailHtml(item.label,item.amount,item.deadline!,item.detailUrl,unsubscribeUrl,days)
    if (DRY_RUN) {sent++;console.log(`would send ${days}d to subscription ${row.id}`);continue}
    try {
      // Catch-up is one logical send per subscription/deadline, even on rerun.
      const milestone=CATCH_UP?'catch-up':String(days)
      if(await sendEmail(row,'reminder',`reminder/${row.token}/${item.deadline}/${milestone}`,subject,html,unsubscribeUrl)) sent++
    } catch(e) {errors++;console.error(`delivery failed for subscription ${row.id}`,e instanceof Error?e.message:'unknown')}
  }
}
// Retry unsettled payloads within the provider's deduplication window, even if
// the calendar milestone has passed. Unsubscribe cascades delete the payload.
if(!DRY_RUN) {
  const retries=await sql`SELECT d.key,d.subscription_id,d.kind,d.payload,s.email
    FROM mail_deliveries d JOIN subscribers s ON s.id=d.subscription_id
    WHERE d.state <> 'sent' AND d.created_at > now()-interval '23 hours'
      AND d.updated_at < now()-interval '2 minutes'
      AND ((d.kind='reminder' AND s.confirmed_at IS NOT NULL) OR (d.kind='confirm' AND s.confirmed_at IS NULL))`
  for(const row of retries) {
    try {
      if(row.kind==='confirm' && !(await claimRecipient(query,row.email))) continue
      if(await deliverMail(query,row.key,row.subscription_id,row.kind,row.payload,RESEND_API_KEY!)==='sent') {
        sent++
        if(row.kind==='confirm') await sql`UPDATE subscribers SET confirm_sent_at=now() WHERE id=${row.subscription_id}`
      }
    } catch {errors++}
  }
  const [blocked]=await sql`SELECT count(*)::int AS n FROM mail_deliveries WHERE state <> 'sent' AND created_at <= now()-interval '23 hours'`
  if(blocked!.n) {errors++;console.error(`${blocked!.n} ambiguous deliveries need provider reconciliation; automatic resend withheld`)}
}
console.log(`Done. Sent: ${sent}, Errors: ${errors}`)
if(errors>0) process.exit(1)
