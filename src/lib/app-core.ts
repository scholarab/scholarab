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
  return dueChip(daysUntil(l.deadline, today))
}

/** Shared urgency chip for anything active with a dated deadline. */
function dueChip(days: number): Chip {
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

/**
 * Regions that count as "near you". National awards are open to the student
 * too, but the Nearby feed is about the local ones with the better odds, so it
 * is the student's own city plus everything Alberta-wide. "Other Alberta" is
 * not a region any listing carries, so those students get the Alberta-wide set
 * — dropping it left them with a permanently empty Nearby feed.
 */
export function nearbyListings(items: Listing[], city: string | null): Listing[] {
  return items.filter(l => l.region === 'Alberta' || (city !== null && l.region === city))
}

// ── Research programs (saved-tab support) ─────────────────────────────────────
// Program deadlines are looser than scholarship ones: the column holds an ISO
// date, "TBA", "Ongoing", or null. Only a real date is clock-driven.

export interface WireProgram {
  i: number                 // id
  n: string                 // name
  d?: string | null         // deadline: ISO | 'TBA' | 'Ongoing' | null
  u: string                 // official url
  c?: string | null         // category
  pr?: string | null        // provider
  p?: boolean               // paid
  s?: string | null         // stipend
  g?: string | null         // grades
  du?: string | null        // duration
  lo?: string | null        // location
  el?: string | null        // eligibility, as prose
  de?: string | null        // description
}

export interface ProgramItem {
  id: number
  name: string
  deadline: string | null
  url: string
  category: string | null
  provider: string | null
  paid: boolean
  stipend: string | null
  grades: string | null
  duration: string | null
  location: string | null
  eligibility: string | null
  description: string | null
  slug: string
}

export function expandProgram(w: WireProgram): ProgramItem {
  return {
    id: w.i,
    name: w.n,
    deadline: w.d ?? null,
    url: w.u,
    category: w.c ?? null,
    provider: w.pr ?? null,
    paid: w.p === true,
    stipend: w.s ?? null,
    grades: w.g ?? null,
    duration: w.du ?? null,
    location: w.lo ?? null,
    eligibility: w.el ?? null,
    description: w.de ?? null,
    slug: slugify(w.n),
  }
}

export function isDatedIso(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export type ProgramStatus = 'active' | 'tba' | 'closed'

/** Mirrors list-core.getProgramStatus on the app's own program shape. */
export function programStatusOf(p: { deadline: string | null }, today: Date): ProgramStatus {
  if (!isDatedIso(p.deadline)) return 'tba'
  return today.getTime() > isoToMs(p.deadline) ? 'closed' : 'active'
}

export function programChipFor(p: { deadline: string | null }, today: Date): Chip {
  const status = programStatusOf(p, today)
  if (status === 'closed') {
    return { text: 'CLOSED', bg: 'rgba(20,25,21,0.08)', fg: 'rgba(20,25,21,0.55)', feedBg: 'rgba(242,240,233,0.15)', feedFg: '#F2F0E9', urgent: false }
  }
  if (status === 'tba') {
    // "ROLLING" is what the site's saved page calls TBA/Ongoing/no-date
    return { text: 'ROLLING', bg: 'rgba(14,140,100,0.12)', fg: '#0E8C64', feedBg: 'rgba(47,211,160,0.18)', feedFg: '#2FD3A0', urgent: false }
  }
  return dueChip(daysUntil(p.deadline!, today))
}

/**
 * The design's PAID / PAID · $3,000 / UNPAID pill. Some stipend strings are
 * already sentences that start with "Paid" ("Paid (hourly rate in offer
 * letter)"), so prefixing unconditionally reads "PAID · PAID (…)".
 */
export function programPayLabel(p: { paid: boolean; stipend: string | null }): string {
  if (!p.paid) return 'UNPAID'
  if (!p.stipend) return 'PAID'
  const stipend = p.stipend.toUpperCase()
  return stipend.startsWith('PAID') ? stipend : `PAID · ${stipend}`
}

/**
 * The design's due pill. Its mock had "DATE TBA" on 96 of 97 rows; the real
 * column also holds "Ongoing" and dates that have already gone by.
 */
export function programDueLabel(p: { deadline: string | null }, today: Date): string {
  if (isDatedIso(p.deadline)) {
    return programStatusOf(p, today) === 'closed' ? 'CLOSED' : `DUE ${shortDate(p.deadline)}`
  }
  return p.deadline === 'Ongoing' ? 'ONGOING' : 'DATE TBA'
}

/** Category chips for the programs screen, commonest first. */
export function programCategoryKeys(programs: ProgramItem[]): string[] {
  const counts = new Map<string, number>()
  for (const p of programs) {
    if (!p.category) continue
    const k = p.category.toUpperCase()
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(e => e[0])
}

export function filterProgramCategory(programs: ProgramItem[], category: string): ProgramItem[] {
  return category === 'ALL' ? programs : programs.filter(p => (p.category ?? '').toUpperCase() === category)
}

/**
 * Programs you can still apply to first (soonest deadline), then the ones
 * waiting on a date, then the ones that have closed for this cycle —
 * alphabetical inside each band.
 */
export function sortPrograms(programs: ProgramItem[], today: Date): ProgramItem[] {
  const band = (p: ProgramItem): number => {
    const status = programStatusOf(p, today)
    return status === 'active' ? 0 : status === 'tba' ? 1 : 2
  }
  return [...programs].sort((a, b) => {
    const ba = band(a)
    const bb = band(b)
    if (ba !== bb) return ba - bb
    if (ba === 0) return isoToMs(a.deadline!) - isoToMs(b.deadline!) || a.name.localeCompare(b.name)
    return a.name.localeCompare(b.name)
  })
}

// ── Awards that reopen ────────────────────────────────────────────────────────
// The design's screen 11, for the listings the rest of the app deliberately
// hides. Alberta deadlines cluster in spring, so most of the catalog is closed
// for most of the year and students otherwise see an app that looks empty.

export interface ReopenStats {
  /** Deadline already gone by — comes back next cycle. */
  closed: number
  /**
   * Everything the app is showing today, open or opening. Counted the same way
   * `openListings` selects, so this number always equals the Due tab's — a
   * stricter "accepting right now" count here read as a contradiction.
   */
  open: number
  /** Not open yet but carrying a published open date. */
  dated: number
}

export function reopenStats(items: Listing[], today: Date): ReopenStats {
  const out: ReopenStats = { closed: 0, open: 0, dated: 0 }
  for (const l of items) {
    const status = statusOf(l, today)
    if (status === 'closed') out.closed++
    else out.open++
    if (status === 'future' && l.openDate) out.dated++
  }
  return out
}

/**
 * The design's "July is the quiet month." headline, told by the real split.
 * Written as a statement about the catalog, never a promise about a date.
 */
export function reopenHeadline(stats: ReopenStats, today: Date): string {
  const month = today.toLocaleDateString('en-CA', { month: 'long' })
  if (stats.closed === 0) return 'Everything in the catalog is open.'
  return stats.closed > stats.open
    ? `${month} is a quiet month.`
    : `${stats.closed} closed for this cycle.`
}

export interface ReopenRegion {
  region: string
  n: number
  /** When that region's closed deadlines actually fell — "MOST CLOSED MAR – JUN". */
  months: string
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** Closed listings grouped by region, biggest group first — the design's rows. */
export function reopenRegions(items: Listing[], today: Date): ReopenRegion[] {
  const groups = new Map<string, { n: number; months: number[] }>()
  for (const l of items) {
    if (statusOf(l, today) !== 'closed') continue
    const k = l.region ?? 'Alberta'
    const g = groups.get(k) ?? { n: 0, months: [] }
    g.n++
    // Month index straight off the ISO string — no Date, so no timezone shift.
    if (l.deadline) g.months.push(parseInt(l.deadline.slice(5, 7), 10) - 1)
    groups.set(k, g)
  }
  return [...groups.entries()]
    .map(([region, g]) => ({ region, n: g.n, months: monthRange(g.months) }))
    .sort((a, b) => b.n - a.n || a.region.localeCompare(b.region))
}

/** "MOST CLOSED MAR – JUN", or a single month, or nothing to say. */
function monthRange(months: number[]): string {
  if (months.length === 0) return 'DATE NOT PUBLISHED YET'
  const lo = Math.min(...months)
  const hi = Math.max(...months)
  return lo === hi ? `ALL CLOSED IN ${MONTHS[lo]}` : `MOST CLOSED ${MONTHS[lo]} – ${MONTHS[hi]}`
}

/**
 * The one card the design gives a confirmed date: the next listing with a
 * published open date still ahead of us.
 */
export function nextToOpen(items: Listing[], today: Date): Listing | null {
  const dated = items
    .filter(l => statusOf(l, today) === 'future' && l.openDate)
    .sort((a, b) => isoToMs(a.openDate!) - isoToMs(b.openDate!))
  return dated[0] ?? null
}

/** Closed listings that reopen, soonest-closed first so the freshest are on top. */
export function closedListings(items: Listing[], today: Date): Listing[] {
  return items
    .filter(l => statusOf(l, today) === 'closed')
    .sort((a, b) => isoToMs(b.deadline!) - isoToMs(a.deadline!) || b.amountValue - a.amountValue)
}

// ── Guides ────────────────────────────────────────────────────────────────────

/** GuideMeta, trimmed to what the app's guides screens render. */
export interface WireGuide {
  s: string                 // slug
  t: string                 // title
  k: string                 // kicker
  d: string                 // description — the design's standfirst
  m: number                 // minutes
  u: string                 // dateModified ISO
  p: string[]               // takeaways
}

export interface GuideItem {
  slug: string
  title: string
  kicker: string
  standfirst: string
  minutes: number
  updated: string
  points: string[]
}

export function expandGuide(w: WireGuide): GuideItem {
  return {
    slug: w.s, title: w.t, kicker: w.k, standfirst: w.d,
    minutes: w.m, updated: w.u, points: w.p,
  }
}

// ── Deep links ────────────────────────────────────────────────────────────────

export type AppTab = 'feed' | 'due' | 'match' | 'saved' | 'me'

/**
 * Screens that sit *over* a tab rather than replacing it — the design's
 * `state.screen`. Closing one returns to whatever tab is underneath.
 */
export type AppScreen = 'quiz' | 'programs' | 'guides' | 'guide' | 'alerts' | 'reopening'

const TABS: AppTab[] = ['feed', 'due', 'match', 'saved', 'me']
const SCREENS: AppScreen[] = ['quiz', 'programs', 'guides', 'guide', 'alerts', 'reopening']

/** The tab left showing behind each pushed screen when it is deep-linked into. */
const SCREEN_HOME: Record<AppScreen, AppTab> = {
  quiz: 'match', guide: 'me', guides: 'me', programs: 'me', alerts: 'me', reopening: 'due',
}

/** "/app/#due" style deep links; anything unrecognized lands on the feed. */
export function tabFromHash(hash: string): AppTab {
  const h = hash.replace(/^#/, '')
  return (TABS as string[]).includes(h) ? h as AppTab : 'feed'
}

/**
 * Full route for a hash: "#saved" is a tab, "#programs" is a screen pushed over
 * its home tab, and "#guide/how-to-write-a-scholarship-essay" opens one guide.
 */
export function routeFromHash(hash: string): { tab: AppTab; screen: AppScreen | null; slug: string | null } {
  const h = hash.replace(/^#/, '')
  const [head = '', ...rest] = h.split('/')
  if ((SCREENS as string[]).includes(head)) {
    const screen = head as AppScreen
    return { tab: SCREEN_HOME[screen], screen, slug: rest.join('/') || null }
  }
  return { tab: tabFromHash(h), screen: null, slug: null }
}

// ── Quiz profile ──────────────────────────────────────────────────────────────

export const QUIZ_STORAGE_KEY = 'scholarab_quiz_answers_v4'

export interface StoredQuiz { step: number; answers: Record<string, string> }

export interface QuizOption { label: string; value: string; hint: string; emoji?: string }
export interface QuizQuestion { key: string; q: string; opts: QuizOption[] }

/**
 * The one quiz definition, shared by /match's React quiz and /app's in-app one.
 * Both write the same localStorage key, so a student who answers in the app is
 * matched identically on the site and vice versa — which only holds if the
 * option *values* are literally the same objects.
 *
 * Mono hints come from the "ScholarAB Match" design; keys, values and labels
 * are the real matching-engine inputs and must not change without updating
 * the matcher.
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: 'searchType',
    q: 'What are you looking for?',
    opts: [
      { label: 'Scholarships', value: 'scholarships', hint: 'AWARDS AND BURSARIES', emoji: '🎓' },
      { label: 'Research Programs', value: 'programs', hint: 'SUMMER, TRADES, CONTESTS', emoji: '🔬' },
      { label: 'Both', value: 'both', hint: 'SHOW ME EVERYTHING', emoji: '✨' },
    ],
  },
  {
    key: 'grade',
    q: 'What grade are you in?',
    opts: [
      { label: 'Grade 10', value: '10', hint: 'TWO YEARS TO PLAN' },
      { label: 'Grade 11', value: '11', hint: 'PRIME PREP TIME' },
      { label: 'Grade 12', value: '12', hint: 'DEADLINES MATTER NOW' },
      { label: 'Already in post-secondary', value: 'post-secondary', hint: 'CONTINUING AWARDS' },
    ],
  },
  {
    key: 'city',
    q: 'Where are you based?',
    opts: [
      { label: 'Medicine Hat', value: 'Medicine Hat', hint: 'THE GAS CITY' },
      { label: 'Calgary', value: 'Calgary', hint: 'AND AREA' },
      { label: 'Edmonton', value: 'Edmonton', hint: 'AND AREA' },
      { label: 'Lethbridge', value: 'Lethbridge', hint: 'AND AREA' },
      { label: 'Red Deer', value: 'Red Deer', hint: 'AND AREA' },
      { label: 'Other Alberta', value: 'Other Alberta', hint: 'EVERYWHERE ELSE' },
    ],
  },
  {
    key: 'field',
    q: "What's your academic focus?",
    opts: [
      { label: 'STEM & Engineering', value: 'STEM', hint: 'SCIENCE, TECH, MATH', emoji: '🔬' },
      { label: 'Health & Medicine', value: 'health', hint: 'PRE-MED, NURSING, KIN', emoji: '🩺' },
      { label: 'Business & Commerce', value: 'business', hint: 'FINANCE, MANAGEMENT', emoji: '💼' },
      { label: 'Arts & Humanities', value: 'arts', hint: 'FINE ARTS, SOCIAL SCIENCE', emoji: '🎨' },
      { label: 'Trades', value: 'trades', hint: 'RAP AND APPRENTICESHIPS', emoji: '🔧' },
      { label: 'Still figuring it out', value: '', hint: 'TOTALLY FINE', emoji: '🤷' },
    ],
  },
  {
    key: 'average',
    q: "What's your academic average?",
    opts: [
      { label: '90% or higher', value: '93', hint: 'MERIT AWARDS OPEN UP' },
      { label: '80 – 89%', value: '85', hint: 'PLENTY QUALIFY' },
      { label: 'Below 80%', value: '79', hint: "GRADES AREN'T EVERYTHING" },
      { label: "I'd rather not say", value: '', hint: 'NO PROBLEM' },
    ],
  },
  {
    key: 'institution',
    q: 'Where are you planning to study?',
    opts: [
      { label: 'University of Calgary', value: 'University of Calgary', hint: 'CALGARY' },
      { label: 'University of Alberta', value: 'University of Alberta', hint: 'EDMONTON' },
      { label: 'Mount Royal University', value: 'Mount Royal University', hint: 'CALGARY' },
      { label: 'Medicine Hat College', value: 'Medicine Hat College', hint: 'MEDICINE HAT' },
      { label: 'Trades / Apprenticeship', value: 'Trades / Apprenticeship program', hint: 'SAIT, NAIT AND MORE' },
      { label: 'Not sure yet', value: '', hint: 'KEEP OPTIONS OPEN' },
    ],
  },
]

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
 * application tracking to back. Assumes a 60-day working window. Accepts any
 * saved item; program "TBA"/"Ongoing" pseudo-deadlines count as undated.
 */
export function timePressure(l: { deadline: string | null }, today: Date): number {
  if (!isDatedIso(l.deadline)) return 0
  const days = daysUntil(l.deadline, today)
  const WINDOW = 60
  return Math.max(4, Math.min(100, Math.round(((WINDOW - Math.min(days, WINDOW)) / WINDOW) * 100)))
}
