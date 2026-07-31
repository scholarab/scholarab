// Pure data shaping for the /app mobile app screen (claude.ai/design
// "ScholarAB Mobile App"). Framework-free and side-effect-free so the DOM
// controller in app-client.ts stays thin and this stays unit-testable.
//
// The design file ships a hand-written DATA array with fields the real
// database does not have (per-listing `saves`/`qs` counts, `effort`,
// `steps`, an `@handle`, an `org`). Those are prototype filler: the wire
// shape below carries only fields that exist in scholarships.json, and the
// helpers here derive the design's labels from them.
import { EMPTY_ELIGIBILITY, type EligibilityCriteria, type StudentProfile } from './eligibility-types.ts'

/** Compact wire shape serialized into the page — short keys, empty fields dropped. */
export interface WireItem {
  i: number                        // id
  t: string                        // title
  a: string                        // amount, as written ("$1,000", "Varies")
  d?: string | null                // deadline ISO
  o?: string | null                // openDate ISO
  c?: string | null                // category
  r?: string | null                // region
  b?: string | null                // audience — the design's "blurb"
  u: string                        // official url
  v?: string | null                // lastVerified ISO
  g?: boolean                      // applyViaGuidance
  x?: boolean                      // inactive (active: false)
  e?: Partial<EligibilityCriteria> | null
}

export interface Listing {
  id: number
  title: string
  amount: string
  amountValue: number
  deadline: string | null
  openDate: string | null
  category: string | null
  region: string | null
  audience: string | null
  url: string
  slug: string
  verified: string | null
  guidance: boolean
  active: boolean
  eligibility: EligibilityCriteria | null
}

// ── Expansion ─────────────────────────────────────────────────────────────────

/** First dollar figure in the string — same rule as utils.parseAmount. */
export function amountValue(amount: string | null | undefined): number {
  const m = String(amount ?? '').match(/\$[\d,]+/)
  return m ? parseInt(m[0].replace(/[$,]/g, ''), 10) || 0 : 0
}

export function slugify(title: string): string {
  return String(title).toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
}

/**
 * Restore a compacted eligibility object to the full shape the matcher reads.
 * The serializer drops nulls, `false`s and empty arrays; matchScholarship
 * dereferences `.grades.length` and friends unconditionally, so the defaults
 * have to come back before it ever sees the object.
 */
export function expandEligibility(e: Partial<EligibilityCriteria> | null | undefined): EligibilityCriteria | null {
  if (!e) return null
  return { ...EMPTY_ELIGIBILITY, ...e }
}

export function expandItem(w: WireItem): Listing {
  return {
    id: w.i,
    title: w.t,
    amount: w.a,
    amountValue: amountValue(w.a),
    deadline: w.d ?? null,
    openDate: w.o ?? null,
    category: w.c ?? null,
    region: w.r ?? null,
    audience: w.b ?? null,
    url: w.u,
    slug: slugify(w.t),
    verified: w.v ?? null,
    guidance: w.g === true,
    active: w.x !== true,
    eligibility: expandEligibility(w.e),
  }
}

// ── Dates and status ──────────────────────────────────────────────────────────

const DAY_MS = 86400000

export function midnight(d: Date = new Date()): Date {
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  return t
}

export function isoToMs(iso: string): number {
  return new Date(iso + 'T00:00:00').getTime()
}

/**
 * Whole days from `today` to the deadline. Rounded, not ceiled: midnight to
 * midnight is a whole number of days except across a DST change, where ceil
 * overcounts by one and disagrees with the site's other day chips.
 */
export function daysUntil(iso: string, today: Date): number {
  return Math.max(0, Math.round((isoToMs(iso) - today.getTime()) / DAY_MS))
}

export type Status = 'active' | 'future' | 'closed'

/** Mirrors list-core.getScholarshipStatus on the app's own item shape. */
export function statusOf(l: Listing, today: Date): Status {
  const todayMs = today.getTime()
  if (l.openDate && todayMs < isoToMs(l.openDate)) return 'future'
  if (l.deadline && todayMs > isoToMs(l.deadline)) return 'closed'
  // Curator-closed with a future deadline is a next-cycle listing whose open
  // date isn't known yet — not accepting applications now.
  if (!l.active) return 'future'
  return 'active'
}

export interface Chip {
  text: string
  /** on cream surfaces */
  bg: string
  fg: string
  /** on the feed's dark/photo cards */
  feedBg: string
  feedFg: string
  urgent: boolean
}

const RUST = '#B8541F'
const CREAM_ON_RUST = '#FFF3E8'

/**
 * The design's urgencyOf, widened to the states the real data actually has
 * (the mock only ever had open listings with a dated deadline).
 */
export function chipFor(l: Listing, today: Date): Chip {
  const status = statusOf(l, today)
  if (status === 'closed') {
    return { text: 'CLOSED', bg: 'rgba(20,25,21,0.08)', fg: 'rgba(20,25,21,0.55)', feedBg: 'rgba(242,240,233,0.15)', feedFg: '#F2F0E9', urgent: false }
  }
  if (status === 'future') {
    const text = l.openDate ? `OPENS ${shortDate(l.openDate)}` : 'OPENING SOON'
    return { text, bg: 'rgba(14,140,100,0.12)', fg: '#0E8C64', feedBg: 'rgba(47,211,160,0.18)', feedFg: '#2FD3A0', urgent: false }
  }
  if (!l.deadline) {
    return { text: 'OPEN · NO FIXED DATE', bg: 'rgba(14,140,100,0.12)', fg: '#0E8C64', feedBg: 'rgba(47,211,160,0.18)', feedFg: '#2FD3A0', urgent: false }
  }
  const days = daysUntil(l.deadline, today)
  if (days === 0) {
    return { text: 'CLOSES TODAY', bg: 'rgba(184,84,31,0.14)', fg: RUST, feedBg: 'rgba(184,84,31,0.9)', feedFg: CREAM_ON_RUST, urgent: true }
  }
  if (days === 1) {
    return { text: 'CLOSES TOMORROW', bg: 'rgba(184,84,31,0.14)', fg: RUST, feedBg: 'rgba(184,84,31,0.9)', feedFg: CREAM_ON_RUST, urgent: true }
  }
  if (days <= 10) {
    return { text: `${days} DAYS LEFT`, bg: 'rgba(184,84,31,0.1)', fg: RUST, feedBg: 'rgba(184,84,31,0.85)', feedFg: CREAM_ON_RUST, urgent: true }
  }
  return { text: `${days} DAYS · START NOW`, bg: 'rgba(20,25,21,0.07)', fg: 'rgba(20,25,21,0.7)', feedBg: 'rgba(242,240,233,0.15)', feedFg: '#F2F0E9', urgent: false }
}

export function shortDate(iso: string): string {
  return new Date(iso + 'T00:00:00')
    .toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    .toUpperCase()
}

export function longDate(iso: string): string {
  return new Date(iso + 'T00:00:00')
    .toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Labels the design shows, derived from real fields ─────────────────────────

/** Two-letter mark for the feed rail avatar and the match rows. */
export function initialsOf(title: string): string {
  const words = title.replace(/[^A-Za-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'SA'
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (words[0]![0]! + words[1]![0]!).toUpperCase()
}

/**
 * The design's `org` line. The data has no separate provider column — region
 * and category are what actually identify a listing at a glance.
 */
export function orgLine(l: Listing): string {
  return [l.region, l.category].filter(Boolean).join(' · ') || 'Alberta'
}

/** The design's `tags` line ("#stem #environment #medhat"). */
export function hashTags(l: Listing): string {
  const slug = (s: string) => '#' + s.toLowerCase().replace(/[^a-z0-9]+/g, '')
  const out = [l.category, l.region].filter(Boolean).map(s => slug(s as string))
  out.push(l.guidance ? '#viaschool' : '#applyonline')
  return out.join(' ')
}

/** The design's feed `stamp` ("STEM · MEDICINE HAT · HAND-CHECKED JUL 28"). */
export function feedStamp(l: Listing): string {
  const parts = [l.category ?? 'SCHOLARSHIP', (l.region ?? 'ALBERTA').toUpperCase()]
  if (l.verified) parts.push(`HAND-CHECKED ${shortDate(l.verified)}`)
  return parts.map(p => p.toUpperCase()).join(' · ')
}

/**
 * The design's "WHAT YOU NEED" checklist. The data has no per-listing
 * requirements, so these stay generic and true — the same wording the
 * detail pages use for "HOW TO APPLY".
 */
export function applySteps(l: Listing): string[] {
  const when = l.deadline ? ` before ${longDate(l.deadline)}` : ''
  return l.guidance
    ? [
        'Talk to your school guidance counsellor about this award.',
        'Ask about internal school deadlines, which can be earlier than the listed one.',
        `Submit your application through your school${when}.`,
      ]
    : [
        'Read the full requirements on the official website.',
        'Prepare your documents and any references it asks for.',
        `Submit through the official website${when}.`,
      ]
}

/** "$120,000" → "$120k"; "Varies" stays as written. */
export function shortMoney(amount: string): string {
  const n = amountValue(amount)
  if (n === 0) return amount
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'k'
  return '$' + n
}

export function moneyTotal(n: number): string {
  return n >= 1000 ? '$' + Math.round(n / 1000) + 'k' : '$' + n
}

// ── Selection ─────────────────────────────────────────────────────────────────

/** Expired listings never belong in the app — same rule as the quiz results. */
export function openListings(items: Listing[], today: Date): Listing[] {
  return items.filter(l => statusOf(l, today) !== 'closed')
}

/** Soonest real deadline first; undated listings last. */
export function byDeadline(a: Listing, b: Listing): number {
  const am = a.deadline ? isoToMs(a.deadline) : Infinity
  const bm = b.deadline ? isoToMs(b.deadline) : Infinity
  if (am !== bm) return am - bm
  return b.amountValue - a.amountValue
}

export function searchListings(items: Listing[], query: string): Listing[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(l =>
    l.title.toLowerCase().includes(q) ||
    (l.audience ?? '').toLowerCase().includes(q) ||
    (l.category ?? '').toLowerCase().includes(q) ||
    (l.region ?? '').toLowerCase().includes(q),
  )
}

export function filterCategory(items: Listing[], category: string): Listing[] {
  return category === 'ALL' ? items : items.filter(l => (l.category ?? '').toUpperCase() === category)
}

/** Category chips, ordered by how many open listings each holds. */
export function categoryKeys(items: Listing[]): string[] {
  const counts = new Map<string, number>()
  for (const l of items) {
    if (!l.category) continue
    const k = l.category.toUpperCase()
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(e => e[0])
}

// Regions that count as "near you" for a given quiz city. Alberta-wide and
// National awards are open to the student too, but the Nearby feed is about
// the local ones with the better odds, so it stays city-only plus Alberta.
export function nearbyListings(items: Listing[], city: string | null): Listing[] {
  if (!city) return items.filter(l => l.region === 'Alberta')
  return items.filter(l => l.region === city || (city !== 'Other Alberta' && l.region === 'Alberta'))
}

// ── Quiz profile ──────────────────────────────────────────────────────────────

export const QUIZ_STORAGE_KEY = 'scholarab_quiz_answers_v4'

export interface StoredQuiz { step: number; answers: Record<string, string> }

/**
 * Rebuild the matcher's StudentProfile from stored quiz answers — the same
 * mapping EligibilityQuiz does, so /app and /match agree on who qualifies.
 * Returns null when the quiz has not been taken far enough to know the city.
 */
export function profileFromAnswers(answers: Record<string, string> | null | undefined): StudentProfile | null {
  if (!answers) return null
  const city = answers.city
  if (!city) return null
  const field = answers.field
  const avg = answers.average
  return {
    grade: (answers.grade ?? '12') as StudentProfile['grade'],
    city,
    schoolBoard: null,
    specificSchool: null,
    targetInstitution: answers.institution && answers.institution !== '' ? answers.institution : null,
    fields: field ? [field] : [],
    averagePercent: avg ? parseInt(avg) : null,
    identifiesAsFemale: null,
    identifiesAsIndigenous: null,
    identifiesAsBIPOC: null,
    hasFinancialNeed: null,
    familyIncome: null,
    inFosterCare: null,
    inApprenticeship: null,
    extracurriculars: [],
    citizenship: null,
  }
}

const FIELD_LABELS: Record<string, string> = {
  STEM: 'STEM',
  health: 'HEALTH',
  business: 'BUSINESS',
  arts: 'ARTS',
  trades: 'TRADES',
}

/** The profile chips on the Match and Me screens. */
export function profileChips(answers: Record<string, string> | null | undefined): string[] {
  if (!answers) return []
  const out: string[] = []
  const grade = answers.grade
  if (grade) out.push(grade === 'post-secondary' ? 'POST-SECONDARY' : `GRADE ${grade}`)
  if (answers.city) out.push(answers.city.toUpperCase())
  const field = answers.field
  if (field && FIELD_LABELS[field]) out.push(FIELD_LABELS[field]!)
  return out
}

// ── Saved screen ──────────────────────────────────────────────────────────────

export interface WeekDay { dow: string; num: string; iso: string; kind: 'past' | 'today' | 'due' | 'future' }

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Monday-to-Sunday strip around `today`, with deadline days marked. */
export function weekStrip(today: Date, deadlines: Set<string>): WeekDay[] {
  const start = new Date(today)
  // getDay(): 0 = Sunday. Shift back to the Monday of this week.
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const todayMs = today.getTime()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const iso = toIso(d)
    const kind: WeekDay['kind'] =
      d.getTime() === todayMs ? 'today'
      : deadlines.has(iso) ? 'due'
      : d.getTime() < todayMs ? 'past'
      : 'future'
    return { dow: DOW[d.getDay()]!, num: String(d.getDate()), iso, kind }
  })
}

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Five weekly buckets starting this week — filled when a saved deadline falls
 * inside. This replaces the design's "submission streak", which counted
 * applications the site has no way to know about.
 */
export function deadlineWeeks(today: Date, deadlines: string[]): boolean[] {
  const start = new Date(today)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const startMs = start.getTime()
  const weeks = [false, false, false, false, false]
  for (const iso of deadlines) {
    const idx = Math.floor((isoToMs(iso) - startMs) / (7 * DAY_MS))
    if (idx >= 0 && idx < weeks.length) weeks[idx] = true
  }
  return weeks
}

/**
 * How much of the run-up to a deadline is already gone, as a 0–100 percentage.
 * Replaces the design's per-item "3 / 4 steps" progress, which the site has no
 * application tracking to back. Assumes a 60-day working window.
 */
export function timePressure(l: Listing, today: Date): number {
  if (!l.deadline) return 0
  const days = daysUntil(l.deadline, today)
  const WINDOW = 60
  return Math.max(4, Math.min(100, Math.round(((WINDOW - Math.min(days, WINDOW)) / WINDOW) * 100)))
}
