// DOM controller for /app — the mobile app screen from the claude.ai/design
// file "ScholarAB Mobile App". Vanilla, per the de-React convention: only
// /match and /admin ship React.
//
// The design's own state lives in a DCLogic component with a `saved` map and a
// hand-written DATA array. Here the listings are the real database rows
// serialized into the page, `saved` is the site's existing localStorage
// tracker (so the app and /saved and every detail page stay in sync), and the
// Match screen runs the real eligibility matcher over the stored quiz answers.
import { getSaved, toggleSaved, getSavedPrograms, toggleSavedProgram } from './tracker.ts'
import { getSteps, toggleStep, totalStepsDone, STEPS_KEY } from './steps.ts'
import { sendEvent } from './events.ts'
import { matchAll } from './eligibility-matcher.ts'
import { downloadICS } from './ics.ts'
import { prefersReducedMotion } from './utils.ts'
import { ALERT_MILESTONES, parseCadence, formatCadence, cadenceSentence, type AlertMilestone } from './alerts.ts'
import {
  expandItem, chipFor, statusOf, daysUntil, midnight, initialsOf, orgLine, hashTags,
  feedStamp, shortMoney, moneyTotal, openListings, byDeadline, searchListings,
  filterCategory, categoryKeys, nearbyListings, profileFromAnswers, profileChips,
  weekStrip, deadlineWeeks, timePressure, longDate, shortDate, routeFromHash,
  expandProgram, programStatusOf, programChipFor, isDatedIso, QUIZ_STORAGE_KEY,
  QUIZ_QUESTIONS, programPayLabel, programDueLabel, programCategoryKeys,
  acceptingListings, applicationSteps, stepsDone, stepLabel, STEP_COUNT,
  fastQuizQuestions, hasFastProfile, type QuizQuestion,
  filterProgramCategory, sortPrograms, expandGuide, reopenStats, reopenHeadline,
  reopenRegions, nextToOpen, closedListings,
  type WireItem, type WireProgram, type WireGuide, type Listing, type ProgramItem,
  type GuideItem, type StoredQuiz, type AppTab, type AppScreen,
} from './app-core.ts'

// ── Constants ─────────────────────────────────────────────────────────────────

const SITE = 'https://www.scholarab.ca'
const FEED_LIMIT = 10

/**
 * Why each question is worth answering, shown under it. Counted against the
 * real corpus rather than taken from the design, which guessed "half" for the
 * grade gate: 138 of 154 listings name the grades they are for.
 */
const QUIZ_WHY: Record<string, string> = {
  grade: 'Nine in ten awards here name the grades they are for. This is the single biggest cut.',
  city: 'Local awards have the smallest applicant pools, so they are the ones worth your time.',
  field: 'A rough answer is fine, and "still figuring it out" is a real answer.',
}

type Tab = AppTab
/** 'start' is not a feed at all — it's the app's own intro screen, sitting in
 *  the first tab slot where a "Closing" feed used to be. The Due tab already
 *  sorts by soonest deadline, so nothing was lost by giving the slot away. */
type FeedMode = 'start' | 'foryou' | 'nearby'

// The design's three feed palettes, cycled card to card.
interface Palette {
  bg: string; fg: string; body: string; dim: string; amountFg: string; tagFg: string
  ctaBg: string; ctaFg: string; railBg: string; avBg: string; avFg: string
  plusBg: string; plusFg: string; onBg: string; onFg: string; offBg: string; offFg: string
}

const PALETTES: Palette[] = [
  { bg: '#0B1512', fg: '#F2F0E9', body: 'rgba(242,240,233,0.68)', dim: 'rgba(242,240,233,0.5)', amountFg: '#2FD3A0', tagFg: '#2FD3A0', ctaBg: '#2FD3A0', ctaFg: '#0B1512', railBg: 'rgba(242,240,233,0.13)', avBg: '#0E3B2C', avFg: '#2FD3A0', plusBg: '#2FD3A0', plusFg: '#0B1512', onBg: '#2FD3A0', onFg: '#0B1512', offBg: 'rgba(242,240,233,0.13)', offFg: '#F2F0E9' },
  { bg: '#0E3B2C', fg: '#F2F0E9', body: 'rgba(242,240,233,0.72)', dim: 'rgba(242,240,233,0.55)', amountFg: '#F2F0E9', tagFg: '#2FD3A0', ctaBg: '#2FD3A0', ctaFg: '#0B1512', railBg: 'rgba(242,240,233,0.13)', avBg: '#0B1512', avFg: '#2FD3A0', plusBg: '#2FD3A0', plusFg: '#0B1512', onBg: '#2FD3A0', onFg: '#0B1512', offBg: 'rgba(242,240,233,0.13)', offFg: '#F2F0E9' },
  { bg: '#FAF7F0', fg: '#141915', body: 'rgba(20,25,21,0.65)', dim: 'rgba(20,25,21,0.55)', amountFg: '#141915', tagFg: '#0E8C64', ctaBg: '#141915', ctaFg: '#FAF7F0', railBg: 'rgba(20,25,21,0.09)', avBg: '#0B1512', avFg: '#2FD3A0', plusBg: '#0E8C64', plusFg: '#F2F0E9', onBg: '#0E8C64', onFg: '#FAF7F0', offBg: 'rgba(20,25,21,0.09)', offFg: '#141915' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function listingUrl(l: Listing): string {
  return `${SITE}/scholarships/${l.slug}/`
}

function readQuiz(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(QUIZ_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredQuiz
    return parsed && typeof parsed.answers === 'object' ? parsed.answers : null
  } catch {
    return null
  }
}

/**
 * Whether the first-run questions have already been put in front of this
 * student. Separate from whether they answered: someone who taps CLOSE has
 * said no, and asking again on every visit would be nagging. Reopening the
 * quiz from the Match or Me screens still works, which is the way back in.
 */
const ONBOARDED_KEY = 'scholarab_app_onboarded'

function onboardingSeen(): boolean {
  try { return localStorage.getItem(ONBOARDED_KEY) === '1' } catch { return false }
}

function markOnboarded(): void {
  try { localStorage.setItem(ONBOARDED_KEY, '1') } catch { /* private mode: asks again next visit */ }
}

/**
 * Where to pick a run back up: the first question in `set` with no answer, or
 * the end if every one is answered.
 *
 * This is also what gets persisted, and it has to be an index into the *full*
 * QUIZ_QUESTIONS, because /match's React quiz uses the stored step positionally
 * (`QUESTIONS[step]`) and treats `step >= 6` as "show results". A three-question
 * run leaves `searchType` unanswered at index 0, so it stores 0 — /match then
 * asks all six with the three already-answered ones pre-selected, rather than
 * jumping to index 3 and silently skipping the question before it.
 */
function resumeStep(answers: Record<string, string>, set: QuizQuestion[]): number {
  const i = set.findIndex(q => answers[q.key] === undefined)
  return i === -1 ? set.length : i
}

function readQuizState(): StoredQuiz {
  try {
    const raw = localStorage.getItem(QUIZ_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { step?: unknown; answers?: unknown }
      const step = typeof parsed.step === 'number' && Number.isFinite(parsed.step)
        ? Math.min(Math.max(Math.trunc(parsed.step), 0), QUIZ_QUESTIONS.length)
        : 0
      const answers: Record<string, string> = {}
      if (parsed.answers && typeof parsed.answers === 'object') {
        for (const [k, v] of Object.entries(parsed.answers as Record<string, unknown>)) {
          if (typeof v === 'string') answers[k] = v
        }
      }
      return { step, answers }
    }
  } catch { /* fall through to a fresh quiz */ }
  return { step: 0, answers: {} }
}

function writeQuizState(state: StoredQuiz): void {
  try { localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(state)) } catch { /* private mode */ }
}

// ── Deadline alerts ───────────────────────────────────────────────────────────
// There is no account, so the server cannot tell the app which alerts a student
// already has. These two keys are the local echo: the address they last used,
// and the items they set an alert on from this device. Losing them costs a
// duplicate POST, which the subscribers table dedupes on conflict.

const ALERT_EMAIL_KEY = 'scholarab_alert_email'
const ALERT_SET_KEY = 'scholarab_alerts'
const ALERT_CADENCE_KEY = 'scholarab_alert_cadence'

/** The milestones this device last picked. Sent with every new subscription. */
function readCadence(): AlertMilestone[] {
  try {
    return parseCadence(localStorage.getItem(ALERT_CADENCE_KEY))
  } catch {
    return [...ALERT_MILESTONES]
  }
}

function writeCadence(days: AlertMilestone[]): void {
  try { localStorage.setItem(ALERT_CADENCE_KEY, formatCadence(days)) } catch { /* private mode */ }
}

function readAlertEmail(): string {
  try { return localStorage.getItem(ALERT_EMAIL_KEY) ?? '' } catch { return '' }
}

function writeAlertEmail(email: string): void {
  try { localStorage.setItem(ALERT_EMAIL_KEY, email) } catch { /* private mode */ }
}

/**
 * Which items this device has set an alert on, and the cadence each was set
 * with — so the Alerts screen can offer to update the ones that no longer
 * match the current pick. Reads the legacy array form too; those entries have
 * an unknown cadence and are offered an update.
 */
function readAlertMap(): Map<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem(ALERT_SET_KEY) || '{}') as unknown
    if (Array.isArray(raw)) {
      return new Map(raw.filter((v): v is string => typeof v === 'string').map(k => [k, '']))
    }
    if (raw && typeof raw === 'object') {
      return new Map(Object.entries(raw as Record<string, unknown>)
        .filter((e): e is [string, string] => typeof e[1] === 'string'))
    }
  } catch { /* fall through to empty */ }
  return new Map()
}

function markAlert(key: string, cadence: string): void {
  const map = readAlertMap()
  map.set(key, cadence)
  try { localStorage.setItem(ALERT_SET_KEY, JSON.stringify(Object.fromEntries(map))) } catch { /* private mode */ }
}

/** POST an alert subscription. Resolves to null on success, or the error text. */
async function postAlert(email: string, itemType: 'scholarship' | 'program', itemId: number): Promise<string | null> {
  const cadence = readCadence()
  try {
    const res = await fetch('/api/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, itemType, itemId, days: cadence }),
    })
    const data = await res.json() as { error?: string }
    if (res.ok) { markAlert(`${itemType}:${itemId}`, formatCadence(cadence)); return null }
    return data.error || 'Something went wrong.'
  } catch {
    return 'Something went wrong. Try again.'
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Controller ────────────────────────────────────────────────────────────────

export function initApp(): void {
  let root: HTMLElement | null = null
  let items: Listing[] = []
  let programs: ProgramItem[] = []
  let today = midnight()

  let guides: GuideItem[] = []

  let tab: Tab = 'feed'
  /** A pushed screen sitting over the current tab; null means the tab is bare. */
  let screen: AppScreen | null = null
  let guideSlug: string | null = null
  let progCategory = 'ALL'
  let progId: number | null = null
  let quizStep = 0
  let quizAnswers: Record<string, string> = {}
  /**
   * Which question list the quiz screen is walking. The three-question set runs
   * on first launch and from "Set profile"; the full six stay behind "Redo" and
   * on /match, so nothing that used to be askable stopped being askable.
   */
  let quizSet: QuizQuestion[] = QUIZ_QUESTIONS
  let offline = false
  let feedMode: FeedMode = 'foryou'
  let query = ''
  let category = 'ALL'
  let openId: number | null = null
  /** Match screen tick-boxes; seeded from the matcher the first time it renders. */
  let picks: Record<number, boolean> = {}
  let picksSeeded = false
  let toastTimer: ReturnType<typeof setTimeout> | null = null
  let toast = ''
  /** Debounce for the search_empty content-gap event (matches directory-client). */
  let emptyTimer: ReturnType<typeof setTimeout> | null = null
  /** Dwell gate for detail_view — an instant open/close isn't a view. */
  let viewTimer: ReturnType<typeof setTimeout> | null = null
  let progViewTimer: ReturnType<typeof setTimeout> | null = null
  /** Bumped whenever something re-renders the active screen from scratch. */
  let renderedKey = ''
  let renderedOverlayKey = ''
  /** Turned to force the pushed screen to repaint after an async change. */
  let overlayBump = 0

  const byId = new Map<number, Listing>()
  const byPid = new Map<number, ProgramItem>()

  // ── Derived data ────────────────────────────────────────────────────────────

  const savedIds = (): number[] => getSaved().filter(id => byId.has(id))
  const savedPrgIds = (): number[] => getSavedPrograms().filter(id => byPid.has(id))
  const isSaved = (id: number): boolean => getSaved().includes(id)

  /** Saved programs, dated ones first (soonest), rolling ones after. */
  function savedProgramItems(): ProgramItem[] {
    return savedPrgIds().map(id => byPid.get(id)!).sort((a, b) => {
      const am = isDatedIso(a.deadline) ? new Date(a.deadline + 'T00:00:00').getTime() : Infinity
      const bm = isDatedIso(b.deadline) ? new Date(b.deadline + 'T00:00:00').getTime() : Infinity
      return am - bm || a.name.localeCompare(b.name)
    })
  }

  function open(): Listing[] {
    return openListings(items, today)
  }

  /** Taking applications today. What the counts in the UI are allowed to say. */
  function accepting(): Listing[] {
    return acceptingListings(items, today)
  }

  function matchedIds(): number[] | null {
    const profile = profileFromAnswers(readQuiz())
    if (!profile) return null
    const pool = open()
    return matchAll(profile, pool.map(l => ({ id: l.id, region: l.region, eligibility: l.eligibility })))
      .map(m => m.id)
  }

  function feedListings(): Listing[] {
    const pool = open()
    if (feedMode === 'nearby') {
      const city = readQuiz()?.city ?? null
      return nearbyListings(pool, city).sort(byDeadline).slice(0, FEED_LIMIT)
    }
    const ids = matchedIds()
    if (!ids) return [...pool].sort(byDeadline).slice(0, FEED_LIMIT)
    return ids.map(id => byId.get(id)!).filter(Boolean).slice(0, FEED_LIMIT)
  }

  function dueListings(): Listing[] {
    return filterCategory(searchListings(open(), query), category).sort(byDeadline)
  }

  function matchListings(): Listing[] {
    const ids = matchedIds()
    if (!ids) return []
    return ids.map(id => byId.get(id)!).filter(Boolean).slice(0, 25)
  }

  // ── Toast ───────────────────────────────────────────────────────────────────

  function say(msg: string): void {
    toast = msg
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toast = ''; paintToast() }, 2200)
    paintToast()
  }

  function paintToast(): void {
    const host = root?.querySelector<HTMLElement>('[data-sabx-toast]')
    if (!host) return
    host.innerHTML = toast ? `<div class="sabx-toast"><span>${esc(toast)}</span></div>` : ''
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  function go(next: Tab): void {
    tab = next
    screen = null
    setProgId(null)
    closeSheet(false)
    render()
  }

  /** Open a screen over the current tab — the design's `push`. */
  function pushScreen(next: AppScreen, slug: string | null = null): void {
    screen = next
    guideSlug = slug
    setProgId(null)
    if (next === 'quiz') {
      const stored = readQuizState()
      quizAnswers = stored.answers
      // Nobody with a profile yet gets the three that matter; anyone reopening
      // the quiz on purpose is refining, so they get all six.
      quizSet = hasFastProfile(stored.answers) ? QUIZ_QUESTIONS : fastQuizQuestions()
      // A finished quiz reopens at the start so "Edit profile" is a real redo,
      // not a dead-end on the last question.
      quizStep = resumeStep(stored.answers, quizSet)
    }
    closeSheet(false)
    render()
  }

  function closeScreen(): void {
    if (screen === 'quiz') markOnboarded()
    screen = null
    guideSlug = null
    setProgId(null)
    render()
  }

  // Dwell-gated like SabDetail's page views: the event only counts if the
  // sheet is still open 2.5s later, so a misclick-and-close isn't a "view".
  function openSheet(id: number): void {
    openId = id
    if (viewTimer) clearTimeout(viewTimer)
    viewTimer = setTimeout(() => sendEvent('detail_view', 'scholarship', id), 2500)
  }

  function closeSheet(repaint = true): void {
    openId = null
    if (viewTimer) { clearTimeout(viewTimer); viewTimer = null }
    if (repaint) render()
  }

  /**
   * Every progId change goes through here so program sheets get the same
   * dwell-gated view count the scholarship sheets have had all along — without
   * it, /app was the only surface where opening a program counted as nothing.
   */
  function setProgId(id: number | null): void {
    progId = id
    if (progViewTimer) { clearTimeout(progViewTimer); progViewTimer = null }
    if (id !== null) progViewTimer = setTimeout(() => sendEvent('detail_view', 'program', id), 2500)
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  function save(id: number): void {
    const next = toggleSaved(id)
    const on = next.includes(id)
    if (on) sendEvent('save', 'scholarship', id)
    navigator.vibrate?.(12)
    say(on ? 'Saved · we can email you before it closes' : 'Removed from saved')
    // The Saved screen and the tab badge are counts, so they always repaint;
    // the feed and the list only need their own buttons patched, which keeps
    // the snap scroller from jumping back to the first card.
    if (tab === 'saved' || tab === 'me') render()
    else { paintSaves(); paintBadge() }
  }

  function paintSaves(): void {
    if (!root) return
    for (const el of root.querySelectorAll<HTMLElement>('[data-save-id]')) {
      const on = isSaved(Number(el.dataset.saveId))
      el.setAttribute('aria-pressed', String(on))
      el.setAttribute('aria-label', on ? 'Remove from saved' : 'Save')
      const label = el.querySelector<HTMLElement>('[data-save-label]')
      if (label) label.textContent = on ? 'Saved' : 'Save'
      if (on && !prefersReducedMotion()) {
        const dot = el.querySelector<HTMLElement>('[data-save-dot]') ?? el
        dot.classList.remove('sabx-pop')
        void dot.offsetWidth
        dot.classList.add('sabx-pop')
      }
    }
  }

  function paintSaveAll(): void {
    const btn = root?.querySelector<HTMLButtonElement>('[data-save-all]')
    if (!btn) return
    const n = matchListings().filter(l => picks[l.id]).length
    btn.disabled = n === 0
    btn.textContent = n === 0 ? 'Pick at least one'
      : n === 1 ? 'Save 1 & track its deadline'
      : `Save ${n} & track deadlines`
  }

  function paintBadge(): void {
    const badge = root?.querySelector<HTMLElement>('[data-sabx-badge]')
    if (!badge) return
    const n = savedIds().length + savedPrgIds().length
    badge.textContent = String(n)
    badge.hidden = n === 0
  }

  // ── Screen: feed ────────────────────────────────────────────────────────────

  function feedCard(l: Listing, i: number): string {
    const p = PALETTES[i % PALETTES.length]!
    const chip = chipFor(l, today)
    const on = isSaved(l.id)
    const vars = `--f-on-bg:${p.onBg};--f-on-fg:${p.onFg};--f-off-bg:${p.offBg};--f-off-fg:${p.offFg}`
    return `
      <article class="sabx-card" style="background:${p.bg};color:${p.fg};${vars}">
        <div class="sabx-card-stamp" style="color:${p.dim}">${esc(feedStamp(l))}</div>
        <div class="sabx-card-amount" style="color:${p.amountFg}">${esc(l.amount)}</div>
        <div class="sabx-card-foot">
          <div class="sabx-card-chip" style="background:${chip.feedBg};color:${chip.feedFg}">${esc(chip.text)}</div>
          <div class="sabx-card-org">${esc(orgLine(l))}</div>
          <button class="sabx-card-name" data-open="${l.id}">${esc(l.title)}</button>
          <p class="sabx-card-blurb" style="color:${p.body}">${esc(l.audience ?? 'Open to Alberta high school students. Full criteria on the official page.')}</p>
          <div class="sabx-card-tags" style="color:${p.tagFg}">${esc(hashTags(l))}</div>
          <button class="sabx-card-cta" style="background:${p.ctaBg};color:${p.ctaFg}" data-open="${l.id}">Check if I qualify <span>→</span></button>
        </div>
        <div class="sabx-rail">
          <div class="sabx-rail-av" aria-hidden="true">
            <span style="background:${p.avBg};border:2px solid ${p.fg};color:${p.avFg}">${esc(initialsOf(l.title))}</span>
          </div>
          <button class="sabx-rail-btn" data-save-id="${l.id}" aria-pressed="${on}" aria-label="${on ? 'Remove from saved' : 'Save'}">
            <span data-save-dot><i class="sabx-bookmark"></i></span>
            <span class="sabx-rail-label" style="color:${p.dim}" data-save-label>${on ? 'Saved' : 'Save'}</span>
          </button>
          <button class="sabx-rail-btn" data-open="${l.id}" aria-label="Open details">
            <span style="background:${p.railBg};color:${p.fg}">?</span>
            <span class="sabx-rail-label" style="color:${p.dim}">Details</span>
          </button>
          <button class="sabx-rail-btn" data-share="${l.id}" aria-label="Share">
            <span style="background:${p.railBg};color:${p.fg}">↗</span>
            <span class="sabx-rail-label" style="color:${p.dim}">share</span>
          </button>
        </div>
      </article>`
  }

  /** The row of feed tabs, shared by the intro screen and the feed itself. */
  function feedNav(): string {
    const modes: [FeedMode, string][] = [['start', 'Start here'], ['foryou', 'For you'], ['nearby', 'Nearby']]
    return `
      <div class="sabx-feed-nav" role="tablist" aria-label="Feed">
        ${modes.map(([m, label]) => `
          <button class="sabx-feed-tab" role="tab" data-feed="${m}" aria-selected="${feedMode === m}">
            <span>${label}</span><i></i>
          </button>`).join('')}
        <button class="sabx-feed-search" data-go="due" aria-label="Search all listings">⌕</button>
      </div>`
  }

  // ── Screen: start ───────────────────────────────────────────────────────────
  // What ScholarAB is and what's in it, for the phone that just landed here
  // with no idea. Every number is read from the same data the app runs on, so
  // this screen can't drift from the directory the way fixed copy would.

  function renderStart(): string {
    const pool = open()
    const live = pool.filter(l => statusOf(l, today) === 'active')
    const inPlay = live.reduce((a, l) => a + l.amountValue, 0)
    const soon = live.filter(l => l.deadline && daysUntil(l.deadline, today) <= 7).length
    const tracks = categoryKeys(pool).length
    const matched = matchedIds() !== null

    const rows: [string, string, string][] = [
      // `live` is the accepting-now subset of `pool`, which also carries the
      // ones that haven't opened for the cycle yet — hence two counts.
      ['Swipe the feed', `${live.length} taking applications now, one card at a time`, 'data-feed="foryou"'],
      ['Match quiz', matched
        ? 'Your answers are stored — redo them any time'
        : 'Three questions, then the feed only shows what you fit', 'data-screen="quiz"'],
      ['Every listing', `Search and filter all ${pool.length} scholarships, ${tracks} categor${tracks === 1 ? 'y' : 'ies'}`, 'data-go="due"'],
      ['Research programs', `${programs.length} placements, competitions and apprenticeships`, 'data-screen="programs"'],
      ['Guides', `${guides.length} walkthroughs · Rutherford, essays, references`, 'data-screen="guides"'],
      ['Saved + alerts', 'Keep a shortlist, get an email before it closes', 'data-go="saved"'],
    ]

    return `
      <section class="sabx-screen sabx-feed sabx-start">
        ${feedNav()}
        <div class="sabx-start-scroll">
          <div class="sabx-start-eyebrow">SCHOLARAB · ALBERTA</div>
          <h1 class="sabx-start-title">Alberta's student money, in one place.</h1>
          <p class="sabx-start-body">
            ScholarAB tracks scholarships and research programs for Alberta high school students.
            Every deadline is checked by hand. Free, no account, no ads — nothing to sign up for.
          </p>

          ${soon > 0 ? `<button class="sabx-start-pill" data-go="due">${soon} closing in the next 7 days →</button>` : ''}

          <div class="sabx-start-stats">
            <div class="sabx-start-stat"><b>${esc(moneyTotal(inPlay))}</b><span>OPEN RIGHT NOW</span></div>
            <div class="sabx-start-stat"><b>${pool.length}</b><span>SCHOLARSHIPS</span></div>
            <div class="sabx-start-stat"><b>${programs.length}</b><span>PROGRAMS</span></div>
          </div>

          <div class="sabx-start-label">WHAT'S IN HERE</div>
          <div class="sabx-start-rows">
            ${rows.map(([label, sub, attrs]) => `
              <button class="sabx-start-row" ${attrs}>
                <span class="sabx-start-row-body">
                  <span class="sabx-start-row-label">${esc(label)}</span>
                  <span class="sabx-start-row-sub">${esc(sub)}</span>
                </span>
                <span class="sabx-start-row-arrow">›</span>
              </button>`).join('')}
          </div>

          <div class="sabx-start-cta">
            <button class="sabx-btn-mint" data-feed="foryou">Start swiping →</button>
            <button class="sabx-btn-ghost" data-screen="quiz">${matched ? 'Redo my match' : 'Take the match quiz'}</button>
          </div>

          <div class="sabx-start-foot">MADE IN MEDICINE HAT · FREE FOREVER · NOTHING TRACKED</div>
        </div>
      </section>`
  }

  function renderFeed(): string {
    if (feedMode === 'start') return renderStart()

    const list = feedListings()
    const total = open().length
    const rest = Math.max(0, total - list.length)
    const matched = matchedIds() !== null

    const end = `
      <div class="sabx-feed-end">
        <div class="sabx-feed-end-eyebrow">${matched && feedMode === 'foryou' ? 'END OF YOUR MATCHES' : 'END OF THE FEED'}</div>
        <div class="sabx-feed-end-title">${matched && feedMode === 'foryou' ? "That's everything you qualify for today." : "That's the top of the list."}</div>
        <p class="sabx-feed-end-body">${rest > 0
          ? `${rest} more open listing${rest === 1 ? '' : 's'} ${rest === 1 ? 'is' : 'are'} in the full directory. Browse them all, or narrow it down with the match quiz.`
          : 'Every open listing is in the directory. Narrow it down with the match quiz.'}</p>
        <div class="sabx-feed-end-btns">
          <button class="sabx-btn-mint" data-go="due">Browse all ${total} →</button>
          <button class="sabx-btn-ghost" data-screen="quiz">${matched ? 'Redo my match' : 'Take the match quiz'}</button>
        </div>
      </div>`

    const cards = list.length > 0
      ? list.map(feedCard).join('')
      : `<div class="sabx-feed-end">
           <div class="sabx-feed-end-eyebrow">NOTHING HERE YET</div>
           <div class="sabx-feed-end-title">No open listings in this feed.</div>
           <p class="sabx-feed-end-body">Try another tab, or browse the full directory.</p>
           <div class="sabx-feed-end-btns"><button class="sabx-btn-mint" data-go="due">Browse all ${total} →</button></div>
         </div>`

    return `
      <section class="sabx-screen sabx-feed">
        ${feedNav()}
        <div class="sabx-feed-scroll" data-sabx-feedscroll>${cards}${list.length > 0 ? end : ''}</div>
        ${list.length > 0 ? '<div class="sabx-swipe-hint"><span>↑ SWIPE FOR NEXT AWARD</span></div>' : ''}
      </section>`
  }

  // ── Application steps ───────────────────────────────────────────────────────

  /** Four discrete pips. Deliberately unlike the programs' continuous time bar:
   *  segments read as "things I did", a sliding fill reads as "time passing". */
  function stepDots(flags: readonly boolean[]): string {
    return `<span class="sabx-dots" aria-hidden="true">${
      flags.map(on => `<i class="${on ? 'on' : ''}"></i>`).join('')
    }</span>`
  }

  /** The tickable checklist, shared by the sheet and the Saved card. */
  function stepList(l: Listing): string {
    const flags = getSteps(l.id)
    return applicationSteps(l).map((label, i) => `
      <button class="sabx-tick${flags[i] ? ' on' : ''}" data-step-id="${l.id}" data-step-i="${i}"
              role="checkbox" aria-checked="${flags[i] === true}">
        <i aria-hidden="true">${flags[i] ? '✓' : ''}</i>
        <span>${esc(label)}</span>
      </button>`).join('')
  }

  /**
   * Ticking a step is also an intent to apply, so it saves the award if it
   * wasn't already — otherwise the ticks live somewhere the student can't get
   * back to. Untickng the last step does *not* un-save: dropping an award is an
   * explicit act, and silently removing it under them would lose the row.
   */
  function tickStep(id: number, index: number): void {
    const flags = toggleStep(id, index)
    const n = stepsDone(flags)
    if (!isSaved(id)) {
      toggleSaved(id)
      sendEvent('save', 'scholarship', id)
    }
    sendEvent('app_step', 'scholarship', id)
    renderedKey = ''
    renderedOverlayKey = ''
    render()
    if (flags[index]) say(n === STEP_COUNT ? 'All four done — go submit it' : `${n} of ${STEP_COUNT} done`)
  }

  // ── Screen: due / browse ────────────────────────────────────────────────────

  function renderDue(): string {
    const list = dueListings()
    // `total` is the browsable set and `live` the applicable one. They differ by
    // 117 rows today, and every count the student reads is now the second
    // number: the header used to say "154 OPEN" while 37 took an application.
    const total = open().length
    const live = accepting().length
    const waiting = total - live
    const rings = [...open()].filter(l => l.deadline && statusOf(l, today) === 'active').sort(byDeadline).slice(0, 5)
    const cats = ['ALL', ...categoryKeys(open())]
    const closed = reopenStats(items, today).closed

    const ringHtml = rings.map(l => {
      const days = daysUntil(l.deadline!, today)
      // Sweep proportional to urgency: a full ring means the deadline is today.
      const pct = Math.max(6, Math.min(100, Math.round(((60 - Math.min(days, 60)) / 60) * 100)))
      return `
        <button class="sabx-ring" data-open="${l.id}">
          <span class="sabx-ring-dial" style="background:conic-gradient(from 200deg,#2FD3A0,#0E8C64 ${pct}%,rgba(20,25,21,0.13) ${pct}%)">
            <span class="sabx-ring-inner">
              <span class="sabx-ring-n">${days}</span>
              <span class="sabx-ring-unit">${days === 1 ? 'DAY' : 'DAYS'}</span>
            </span>
          </span>
          <span class="sabx-ring-label">${esc(shortMoney(l.amount))}</span>
        </button>`
    }).join('')

    // Days lead, money rides alongside. The amount used to be the only thing in
    // the row with its own column, which reads badly for the listings whose
    // published amount is "Varies" — those rows showed a wide empty slot and no
    // urgency. A countdown every active listing has is the sturdier anchor.
    const rowHtml = list.map(l => {
      const chip = chipFor(l, today)
      const on = isSaved(l.id)
      const status = statusOf(l, today)
      const live = status === 'active' && !!l.deadline
      const days = live ? daysUntil(l.deadline!, today) : null
      const done = stepsDone(getSteps(l.id))
      return `
        <div class="sabx-row">
          <button class="sabx-row-main" data-open="${l.id}">
            <span class="sabx-row-when${days !== null && days <= 10 ? ' urgent' : ''}${days === null ? ' undated' : ''}">
              <span class="sabx-row-when-n">${days === null ? '—' : days}</span>
              <span class="sabx-row-when-u">${days === null
                ? esc(status === 'future' ? 'NOT OPEN' : 'NO DATE')
                : days === 1 ? 'DAY LEFT' : 'DAYS LEFT'}</span>
            </span>
            <span class="sabx-row-body">
              <span class="sabx-row-name">${esc(l.title)}</span>
              <span class="sabx-row-line">
                <span class="sabx-row-amount${l.amountValue === 0 ? ' vague' : ''}">${esc(shortMoney(l.amount))}</span>
                <span class="sabx-row-org">${esc(orgLine(l))}</span>
              </span>
              ${days === null ? `<span class="sabx-row-chip" style="background:${chip.bg};color:${chip.fg}">${esc(chip.text)}</span>` : ''}
              ${done > 0 ? `<span class="sabx-row-steps">${stepDots(getSteps(l.id))}<span>${done}/${STEP_COUNT}</span></span>` : ''}
            </span>
          </button>
          <button class="sabx-row-save" data-save-id="${l.id}" aria-pressed="${on}" aria-label="${on ? 'Remove from saved' : 'Save'}">
            <i class="sabx-bookmark" data-save-dot></i>
          </button>
        </div>`
    }).join('')

    return `
      <section class="sabx-screen sabx-due">
        <div class="sabx-scroll">
          <div class="sabx-due-head">
            <span class="sabx-wordmark">Scholar<span>AB</span></span>
            <span class="sabx-count-chip">${list.length === total ? `${live} ACCEPTING NOW` : `${list.length} SHOWN`}</span>
          </div>
          <div class="sabx-segs">
            <span class="sabx-seg" aria-current="page">ACCEPTING NOW · ${live}</span>
            ${closed > 0 ? `<button class="sabx-seg" data-screen="reopening">REOPENING · ${closed}</button>` : ''}
            <button class="sabx-seg" data-screen="programs">PROGRAMS · ${programs.length}</button>
          </div>
          ${rings.length > 0 ? `<div class="sabx-rings">${ringHtml}</div>` : ''}
          <div class="sabx-search-wrap">
            <div class="sabx-search">
              <span class="sabx-search-icon" aria-hidden="true">⌕</span>
              <input type="search" data-sabx-query value="${esc(query)}" placeholder="Search ${total} listings…" aria-label="Search listings" enterkeyhint="search" />
              ${query ? '<button data-clear-query aria-label="Clear search" class="sabx-search-icon">✕</button>' : ''}
            </div>
            <div class="sabx-chips">
              ${cats.map(c => `<button class="sabx-chip" data-cat="${esc(c)}" aria-pressed="${category === c}">${c === 'ALL' ? `ALL ${total}` : esc(c)}</button>`).join('')}
            </div>
          </div>
          <div class="sabx-list">
            ${rowHtml}
            ${list.length === 0 ? `
              <div class="sabx-empty">
                <div class="sabx-empty-title">Nothing matches that.</div>
                <div class="sabx-empty-sub">Try a shorter word, or clear the filter.</div>
              </div>` : ''}
          </div>
          ${list.length === total && waiting > 0 ? `
            <div class="sabx-note-dark">
              <div class="sabx-note-dark-label">WHY ${live} AND NOT ${total}</div>
              <div class="sabx-note-dark-body">${live} of the ${total} awards listed here are taking applications today. The other ${waiting} are between cycles — they still have pages worth reading, and they are in this list with the date they reopen, but you cannot apply to one right now.${
                programs.length > 0 ? ' Research programs keep their own application windows and are counted separately, under Programs.' : ''}</div>
            </div>` : ''}
        </div>
      </section>`
  }

  // ── Screen: match ───────────────────────────────────────────────────────────

  function renderMatch(): string {
    const answers = readQuiz()
    const list = matchListings()
    const chips = profileChips(answers)

    if (!answers || list.length === 0) {
      return `
        <section class="sabx-screen sabx-match">
          <div class="sabx-match-head">
            <button class="sabx-match-back" data-go="feed" aria-label="Back">‹</button>
            <span class="sabx-match-title">Your matches</span>
            <button class="sabx-match-skip" data-go="feed">Skip</button>
          </div>
          <div class="sabx-match-scroll">
            <div class="sabx-empty-big" style="margin-top:40px">
              <div class="sabx-section-label">${answers ? '0 MATCHES' : 'QUIZ NOT TAKEN'}</div>
              <h3>${answers ? 'Nothing open fits that profile right now.' : 'Six questions, then this fills up.'}</h3>
              <p>${answers
                ? 'Listings open and close all year. Browse the full directory in the meantime.'
                : 'The quiz checks your grade, region and field against every listing so this screen only shows what you can actually win.'}</p>
              <button class="sabx-btn-ink" data-screen="quiz">${answers ? 'Redo the quiz' : 'Take the quiz'}</button>
            </div>
          </div>
        </section>`
    }

    if (!picksSeeded) {
      for (const l of list) picks[l.id] = true
      picksSeeded = true
    }

    const picked = list.filter(l => picks[l.id])
    const rows = list.map(l => {
      const chip = chipFor(l, today)
      const on = !!picks[l.id]
      return `
        <button class="sabx-match-row" data-pick="${l.id}" aria-pressed="${on}">
          <span class="sabx-match-av">${esc(initialsOf(l.title))}</span>
          <span class="sabx-match-body">
            <span class="sabx-match-name">${esc(l.title)}</span>
            <span class="sabx-match-meta">${esc(shortMoney(l.amount))} · ${esc(chip.text)}</span>
          </span>
          <span class="sabx-pick">✓</span>
        </button>`
    }).join('')

    return `
      <section class="sabx-screen sabx-match">
        <div class="sabx-match-head">
          <button class="sabx-match-back" data-go="feed" aria-label="Back">‹</button>
          <span class="sabx-match-title">Your matches</span>
          <button class="sabx-match-skip" data-go="feed">Skip</button>
        </div>
        <div class="sabx-match-scroll">
          <div class="sabx-profile-chips">
            ${chips.map(c => `<span class="sabx-profile-chip">${esc(c)}</span>`).join('')}
            <button class="sabx-profile-chip edit" data-screen="quiz">+ EDIT</button>
          </div>
          <div class="sabx-match-total">
            <b>${list.length}</b><span>you actually qualify for</span>
          </div>
          <div class="sabx-match-card">${rows}</div>
          <div class="sabx-match-note">FIT CHECKED AGAINST GRADE, REGION AND FIELD — NOT KEYWORDS.</div>
        </div>
        <div class="sabx-match-foot">
          <button class="sabx-save-all" data-save-all ${picked.length === 0 ? 'disabled' : ''}>${
            picked.length === 0 ? 'Pick at least one'
            : picked.length === 1 ? 'Save 1 & track its deadline'
            : `Save ${picked.length} & track deadlines`
          }</button>
        </div>
      </section>`
  }

  // ── Screen: saved ───────────────────────────────────────────────────────────

  function renderSaved(): string {
    const list = savedIds().map(id => byId.get(id)!).sort(byDeadline)
    const prgList = savedProgramItems()
    const total = list.length + prgList.length
    const deadlines = [
      ...list.map(l => l.deadline).filter((d): d is string => !!d),
      ...prgList.map(p => p.deadline).filter(isDatedIso),
    ]
    const week = weekStrip(today, new Set(deadlines))
    const weeks = deadlineWeeks(today, deadlines)

    // Next deadline across both kinds
    const nextSch = list.find(l => l.deadline && statusOf(l, today) === 'active')
    const nextPrg = prgList.find(p => programStatusOf(p, today) === 'active')
    const cand = [
      nextSch?.deadline ? { name: nextSch.title, deadline: nextSch.deadline } : null,
      nextPrg?.deadline ? { name: nextPrg.name, deadline: nextPrg.deadline } : null,
    ].filter((c): c is { name: string; deadline: string } => c !== null)
      .sort((a, b) => new Date(a.deadline + 'T00:00:00').getTime() - new Date(b.deadline + 'T00:00:00').getTime())
    const next = cand[0] ?? null
    const nextDays = next ? daysUntil(next.deadline, today) : null

    const weekHtml = week.map(d => `
      <div class="sabx-week-day ${d.kind}">
        <span class="sabx-week-dow">${d.dow}</span>
        <span class="sabx-week-num">${d.num}</span>
        <span class="sabx-week-dot"></span>
      </div>`).join('')

    // Two separate readings, never the same bar: the pips are the student's own
    // four steps, and the days are the clock. These used to be one bar fed by
    // `timePressure`, so a nearly-full bar meant "almost out of time" while
    // looking exactly like "almost finished".
    const cardsHtml = list.map(l => {
      const chip = chipFor(l, today)
      const flags = getSteps(l.id)
      const days = l.deadline && statusOf(l, today) === 'active' ? daysUntil(l.deadline, today) : null
      return `
        <div class="sabx-sv-card">
          <button class="sabx-sv-top" data-open="${l.id}">
            <span style="flex:1">
              <span class="sabx-sv-name">${esc(l.title)}</span>
              <span class="sabx-sv-meta">${l.deadline ? `DUE ${esc(shortDate(l.deadline))}` : 'NO FIXED DATE'} · ${esc((l.region ?? 'ALBERTA').toUpperCase())}</span>
            </span>
            <span class="sabx-sv-amount">${esc(shortMoney(l.amount))}</span>
          </button>
          <div class="sabx-sv-progress">
            ${stepDots(flags)}
            <span class="sabx-sv-steps">${esc(stepLabel(flags))}</span>
            <span class="sabx-sv-left${days !== null && days <= 10 ? ' urgent' : ''}">${days === null ? esc(chip.text) : `${days}D LEFT`}</span>
          </div>
          <div class="sabx-sv-ticks">${stepList(l)}</div>
          <div class="sabx-sv-foot">
            <button class="sabx-sv-remove" data-save-id="${l.id}" aria-pressed="true">Remove</button>
          </div>
        </div>`
    }).join('')

    const prgHtml = prgList.map(p => {
      const chip = programChipFor(p, today)
      const pct = timePressure(p, today)
      const days = programStatusOf(p, today) === 'active' ? daysUntil(p.deadline!, today) : null
      return `
        <div class="sabx-sv-card">
          <a class="sabx-sv-top" href="/programs/${esc(p.slug)}/">
            <span style="flex:1">
              <span class="sabx-sv-name">${esc(p.name)}</span>
              <span class="sabx-sv-meta">${isDatedIso(p.deadline) ? `DUE ${esc(shortDate(p.deadline))}` : 'ROLLING'}${p.provider ? ` · ${esc(p.provider.toUpperCase())}` : ''}</span>
            </span>
            <span class="sabx-sv-amount">${p.paid ? 'Paid' : 'Free'}</span>
          </a>
          <div class="sabx-sv-foot">
            <div class="sabx-sv-track"><div class="sabx-sv-fill" style="width:${pct}%"></div></div>
            <span class="sabx-sv-steps">${days === null ? esc(chip.text) : `${days}D LEFT`}</span>
            <button class="sabx-sv-remove" data-psave-id="${p.id}">Remove</button>
          </div>
        </div>`
    }).join('')

    return `
      <section class="sabx-screen sabx-saved">
        <div class="sabx-scroll">
          <div class="sabx-saved-head">
            <h2 class="sabx-saved-h1">Saved</h2>
            <span class="sabx-saved-count">${total === 1 ? '1 BOOKMARK' : `${total} BOOKMARKS`}</span>
          </div>
          <div class="sabx-week">${weekHtml}</div>
          <div class="sabx-pace">
            <div class="sabx-pace-head">
              <div class="sabx-pace-label">NEXT DEADLINE</div>
              <div class="sabx-pace-value">${nextDays === null ? '—' : nextDays === 0 ? 'Today' : `${nextDays} day${nextDays === 1 ? '' : 's'}`}</div>
            </div>
            ${list.length > 0 ? `
              <div class="sabx-pace-steps">
                <b>${totalStepsDone(list.map(l => l.id))}</b>
                <span>of ${list.length * STEP_COUNT} steps ticked ${list.length === 1 ? 'on the award you saved' : `across your ${list.length} awards`}</span>
              </div>` : ''}
            <div class="sabx-pace-bars">${weeks.map(on => `<i class="${on ? 'on' : ''}"></i>`).join('')}</div>
            <div class="sabx-pace-note">${next
              ? `${esc(next.name)} closes ${esc(longDate(next.deadline))}. Filled bars are the next five weeks with a saved deadline in them.`
              : 'Save a listing and its deadline shows up across the next five weeks.'}</div>
          </div>
          ${list.length > 0 ? `
            <div class="sabx-section-label">SCHOLARSHIPS · ${list.length}</div>
            ${cardsHtml}
          ` : ''}
          ${prgList.length > 0 ? `
            <div class="sabx-section-label" style="margin-top:${list.length > 0 ? '10px' : '0'}">RESEARCH PROGRAMS · ${prgList.length}</div>
            ${prgHtml}
          ` : ''}
          ${total > 0 ? `
            <button class="sabx-btn-ink" data-export-ics style="width:100%;box-sizing:border-box;margin-top:6px">Add these deadlines to my calendar</button>
          ` : `
            <div class="sabx-empty-big">
              <div class="sabx-section-label">0 BOOKMARKS</div>
              <h3>Nothing saved yet.</h3>
              <p>Save from the feed and every deadline shows up here, with a calendar export and email reminders.</p>
              <button class="sabx-btn-ink" data-go="feed">Open the feed</button>
            </div>`}
        </div>
      </section>`
  }

  // ── Screen: me ──────────────────────────────────────────────────────────────

  function renderMe(): string {
    const answers = readQuiz()
    const chips = profileChips(answers)
    const saved = savedIds().map(id => byId.get(id)!)
    const savedPrg = savedProgramItems()
    // Money in play is scholarship amounts only — programs have no dollar value.
    const inPlay = saved.reduce((a, l) => a + l.amountValue, 0)
    const closing =
      saved.filter(l => l.deadline && statusOf(l, today) === 'active' && daysUntil(l.deadline, today) <= 7).length +
      savedPrg.filter(p => programStatusOf(p, today) === 'active' && daysUntil(p.deadline!, today) <= 7).length

    const alertCount = readAlertMap().size
    const closed = reopenStats(items, today).closed

    // In-app targets, not site URLs: the app now carries its own programs,
    // guides and alerts screens, and bouncing phones back out to the desktop
    // pages is the gap this screen exists to close. `#` prefixes a tab,
    // `>` a pushed screen; anything else is a real link off the app.
    const rows: [string, string, string][] = [
      ['Research programs', `${programs.length} placements, competitions and apprenticeships`, '>programs'],
      ['Guides', `${guides.length} walkthroughs · Rutherford, essays, references`, '>guides'],
      ['Deadline alerts', alertCount > 0
        ? `${alertCount} set · email ${cadenceSentence(readCadence())} before close`
        : `Email ${cadenceSentence(readCadence())} before a deadline`, '>alerts'],
      // Only when there is something dormant to show: on a database that
      // filters retired rows out, this screen would open on nothing.
      ...(closed > 0
        ? [['Awards that reopen', `${closed} closed for this cycle · see when they come back`, '>reopening'] as [string, string, string]]
        : []),
      ['Browse every scholarship', `All ${open().length} open listings, filterable`, '#due'],
      ['Suggest a scholarship', 'Found one we missed? Send it in', 'mailto:contact.scholarab@gmail.com?subject=Scholarship%20suggestion'],
      ['How listings get checked', 'Every deadline verified by hand', '/about/'],
    ]

    return `
      <section class="sabx-screen sabx-me">
        <div class="sabx-scroll">
          <div class="sabx-me-hero">
            <div class="sabx-me-top">
              <div class="sabx-me-av" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2FD3A0" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              </div>
              <div style="flex:1;min-width:0">
                <div class="sabx-me-name">${answers ? 'Your profile' : 'No profile yet'}</div>
                <div class="sabx-me-sub">${answers ? 'STORED ON THIS DEVICE ONLY' : 'TAKE THE QUIZ TO BUILD ONE'}</div>
              </div>
            </div>
            <div class="sabx-me-chips">
              ${chips.map(c => `<span class="sabx-me-chip">${esc(c)}</span>`).join('')}
              <button class="sabx-me-chip edit" data-screen="quiz">+ EDIT</button>
            </div>
            <div class="sabx-me-btns">
              <button class="sabx-me-btn" data-screen="quiz">${answers ? 'Edit profile' : 'Take the quiz'}</button>
              <button class="sabx-me-btn primary" data-share-app>Share ScholarAB</button>
            </div>
          </div>

          <div class="sabx-stats">
            <button class="sabx-stat" data-go="saved"><b>${saved.length + savedPrg.length}</b><span>SAVED</span></button>
            <div class="sabx-stat"><b>${closing}</b><span>CLOSING ≤7D</span></div>
            <div class="sabx-stat green"><b>${moneyTotal(inPlay)}</b><span>IN PLAY</span></div>
          </div>

          <div class="sabx-me-rows">
            ${rows.map(([label, sub, href]) => {
              const body = `
                <span class="sabx-me-row-body">
                  <span class="sabx-me-row-label">${esc(label)}</span>
                  <span class="sabx-me-row-sub">${esc(sub)}</span>
                </span>
                <span class="sabx-me-row-arrow">›</span>`
              if (href.startsWith('>')) return `<button class="sabx-me-row" data-screen="${esc(href.slice(1))}">${body}</button>`
              if (href.startsWith('#')) return `<button class="sabx-me-row" data-go="${esc(href.slice(1))}">${body}</button>`
              return `<a class="sabx-me-row" href="${esc(href)}">${body}</a>`
            }).join('')}
            <div class="sabx-me-foot">MADE IN MEDICINE HAT · FREE FOREVER</div>
          </div>
        </div>
      </section>`
  }

  // ── Screen: quiz ────────────────────────────────────────────────────────────
  // The design runs the match quiz in-app; the shipped app left /app for
  // /match/. Same questions and same localStorage key as the React quiz, so
  // answering in either place matches identically in both.

  function renderQuiz(): string {
    const set = quizSet
    const q = set[Math.min(quizStep, set.length - 1)]!
    const bars = set
      .map((_, i) => `<i class="${i < quizStep ? 'done' : i === quizStep ? 'here' : ''}"></i>`)
      .join('')
    const fast = set.length < QUIZ_QUESTIONS.length

    const opts = q.opts.map((o, i) => {
      const on = quizAnswers[q.key] === o.value
      return `
        <button class="sabx-q-opt" data-quiz-pick="${i}" aria-pressed="${on}">
          <span class="sabx-q-opt-body">
            <span class="sabx-q-opt-label">${o.emoji ? `<span class="sabx-q-emoji" aria-hidden="true">${o.emoji}</span>` : ''}${esc(o.label)}</span>
            <span class="sabx-q-opt-hint">${esc(o.hint)}</span>
          </span>
          <span class="sabx-q-dot"></span>
        </button>`
    }).join('')

    return `
      <section class="sabx-overlay sabx-quiz" role="dialog" aria-modal="true" aria-label="Match quiz">
        <div class="sabx-q-head">
          <button class="sabx-q-back" data-quiz-back aria-label="Back">‹</button>
          <div class="sabx-q-bars">${bars}</div>
          <button class="sabx-q-close" data-close-screen>CLOSE</button>
        </div>
        <div class="sabx-q-intro">
          <div class="sabx-q-step">QUESTION ${quizStep + 1} OF ${set.length}</div>
          <h2 class="sabx-q-title">${esc(q.q)}</h2>
          ${QUIZ_WHY[q.key] ? `<p class="sabx-q-why">${esc(QUIZ_WHY[q.key]!)}</p>` : ''}
        </div>
        <div class="sabx-q-opts">${opts}</div>
        ${fast ? '<div class="sabx-q-more"><button data-quiz-full>Answer three more for a tighter match</button></div>' : ''}
        <div class="sabx-q-foot">ANSWERS STAY ON THIS DEVICE. NO ACCOUNT, EVER.</div>
      </section>`
  }

  function answerQuiz(index: number): void {
    const set = quizSet
    const q = set[Math.min(quizStep, set.length - 1)]!
    const opt = q.opts[index]
    if (!opt) return
    quizAnswers = { ...quizAnswers, [q.key]: opt.value }
    // Answering question one = one started run, same rule as /match. Without
    // it /app only ever reported completions, so the funnel read as 100%.
    if (quizStep === 0) sendEvent('quiz_start')
    const last = quizStep >= set.length - 1
    quizStep = last ? set.length : quizStep + 1
    writeQuizState({ step: resumeStep(quizAnswers, QUIZ_QUESTIONS), answers: quizAnswers })

    if (!last) { render(); return }

    sendEvent('quiz_complete')
    markOnboarded()
    screen = null
    tab = 'match'
    // The match list is rebuilt from the new profile, so the old tick-boxes
    // point at listings that may no longer be in it.
    picks = {}
    picksSeeded = false
    renderedKey = ''
    render()
    const n = matchListings().length
    say(n === 0 ? 'Profile saved · nothing open fits it today' : `Profile saved · ${n} match${n === 1 ? '' : 'es'}`)
  }

  // ── Screen: research programs ───────────────────────────────────────────────

  function programList(): ProgramItem[] {
    return sortPrograms(filterProgramCategory(programs, progCategory), today)
  }

  function renderPrograms(): string {
    const list = programList()
    const cats = ['ALL', ...programCategoryKeys(programs)]
    // "Ongoing" programs (apprenticeships, internships, dual credit) have no
    // date because they take students year round, not because one is pending.
    // Counting them as TBA overstated the wait and mis-described the reason.
    const tba = programs.filter(p => !isDatedIso(p.deadline) && p.deadline !== 'Ongoing').length
    const ongoing = programs.filter(p => p.deadline === 'Ongoing').length

    const rows = list.map(p => {
      const on = getSavedPrograms().includes(p.id)
      const due = programDueLabel(p, today)
      const dated = isDatedIso(p.deadline) && programStatusOf(p, today) === 'active'
      return `
        <div class="sabx-pg-card">
          <button class="sabx-pg-top" data-prog="${p.id}">
            <span style="flex:1;min-width:0">
              <span class="sabx-pg-cat">${esc((p.category ?? 'RESEARCH PROGRAM').toUpperCase())}</span>
              <span class="sabx-pg-name">${esc(p.name)}</span>
              <span class="sabx-pg-provider">${esc(p.provider ?? 'Alberta')}</span>
            </span>
            <span class="sabx-me-row-arrow">›</span>
          </button>
          <div class="sabx-pg-meta">${esc([p.grades, p.duration].filter(Boolean).join(' · ') || 'Open to Alberta students')}${
            p.location ? `<br />${esc(p.location)}` : ''}</div>
          <div class="sabx-pg-pills">
            <span class="sabx-pg-pill${p.paid ? ' paid' : ''}">${esc(programPayLabel(p))}</span>
            <span class="sabx-pg-pill${dated ? ' due' : ''}">${esc(due)}</span>
            <button class="sabx-pg-save" data-psave-id="${p.id}" aria-pressed="${on}">${on ? 'SAVED' : 'SAVE'}</button>
          </div>
        </div>`
    }).join('')

    return `
      <section class="sabx-overlay sabx-pg">
        <div class="sabx-ov-head">
          <button class="sabx-ov-back" data-close-screen aria-label="Back">‹</button>
          <span class="sabx-ov-title">Research programs</span>
          <span class="sabx-ov-count">${list.length === programs.length ? `${programs.length} PROGRAMS` : `${list.length} SHOWN`}</span>
        </div>
        <div class="sabx-ov-scroll">
          ${tba > 0 ? `
            <div class="sabx-note-dark">
              <div class="sabx-note-dark-label">${tba} OF ${programs.length} DATES ARE TBA</div>
              <div class="sabx-note-dark-body">Most of these open between October and February. Save one and it sits in your Saved tab. We re-check every program's dates weekly and the date lands there the day it's published.${
                ongoing > 0 ? ` A further ${ongoing} take students year round, so there is no date to wait for.` : ''}</div>
            </div>` : ''}
          <div class="sabx-chips sabx-ov-chips">
            ${cats.map(c => `<button class="sabx-chip" data-progcat="${esc(c)}" aria-pressed="${progCategory === c}">${c === 'ALL' ? `ALL ${programs.length}` : esc(c)}</button>`).join('')}
          </div>
          ${rows}
          ${list.length === 0 ? `
            <div class="sabx-empty" style="margin:2px 20px 0">
              <div class="sabx-empty-title">Nothing in that category yet.</div>
              <div class="sabx-empty-sub">Clear the filter to see all ${programs.length}.</div>
            </div>` : ''}
          <div class="sabx-ov-foot">PROGRAM DATES ARE RE-CHECKED WEEKLY</div>
        </div>
      </section>`
  }

  // ── Screen: guides ──────────────────────────────────────────────────────────

  function renderGuides(): string {
    const feat = guides[0]
    const rest = guides.slice(1)

    const featHtml = feat ? `
      <button class="sabx-gd-feat" data-guide="${esc(feat.slug)}">
        <span class="sabx-gd-feat-kicker">${esc(feat.kicker)}</span>
        <span class="sabx-gd-feat-title">${esc(feat.title)}</span>
        <span class="sabx-gd-feat-stand">${esc(feat.standfirst)}</span>
        <span class="sabx-gd-feat-foot">
          <span class="sabx-gd-feat-meta">${feat.minutes} MIN · UPDATED ${esc(shortDate(feat.updated))}</span>
          <span class="sabx-gd-feat-cta">Read →</span>
        </span>
      </button>` : ''

    const rows = rest.map(g => `
      <button class="sabx-gd-row" data-guide="${esc(g.slug)}">
        <span style="flex:1;min-width:0">
          <span class="sabx-gd-row-kicker">${esc(g.kicker)}</span>
          <span class="sabx-gd-row-title">${esc(g.title)}</span>
        </span>
        <span class="sabx-gd-row-min">${g.minutes} MIN</span>
        <span class="sabx-me-row-arrow">›</span>
      </button>`).join('')

    return `
      <section class="sabx-overlay sabx-gd">
        <div class="sabx-ov-head">
          <button class="sabx-ov-back" data-close-screen aria-label="Back">‹</button>
          <span class="sabx-ov-title">Guides</span>
          <span class="sabx-ov-count">${guides.length} WRITTEN</span>
        </div>
        <div class="sabx-ov-scroll pad">
          ${featHtml}
          ${rest.length > 0 ? '<div class="sabx-section-label" style="padding:26px 0 4px;margin:0">EVERYTHING ELSE</div>' : ''}
          ${rows}
          <div class="sabx-ov-foot">WRITTEN BY STUDENTS WHO APPLIED · NO SPONSORED POSTS</div>
        </div>
      </section>`
  }

  // ── Screen: guide reader ────────────────────────────────────────────────────
  // An app-sized version of the guide: kicker, standfirst and the three things
  // it comes down to, then out to the full page. The prose lives on
  // /guides/<slug>/ and is not duplicated into the app payload.

  function renderGuide(): string {
    const g = guides.find(x => x.slug === guideSlug) ?? guides[0]
    if (!g) return renderGuides()
    const more = guides.filter(x => x.slug !== g.slug).slice(0, 2)

    return `
      <section class="sabx-overlay sabx-gr">
        <div class="sabx-ov-head bordered">
          <button class="sabx-ov-back" data-screen="guides" aria-label="Back to guides">‹</button>
          <span class="sabx-gr-meta">${g.minutes} MIN READ · UPDATED ${esc(shortDate(g.updated))}</span>
          <button class="sabx-ov-share" data-share-guide="${esc(g.slug)}" aria-label="Share this guide">↗</button>
        </div>
        <div class="sabx-ov-scroll pad">
          <div class="sabx-gr-kicker">${esc(g.kicker)}</div>
          <h1 class="sabx-gr-title">${esc(g.title)}</h1>
          <p class="sabx-gr-stand">${esc(g.standfirst)}</p>

          <div class="sabx-gr-points">
            <div class="sabx-gr-points-label">WHAT IT COMES DOWN TO</div>
            ${g.points.map(t => `<div class="sabx-gr-point"><i></i><span>${esc(t)}</span></div>`).join('')}
          </div>

          <a class="sabx-note-dark sabx-gr-next" href="/guides/${esc(g.slug)}/">
            <span class="sabx-note-dark-label">NEXT STEP</span>
            <span class="sabx-gr-next-title">Read the whole thing.</span>
            <span class="sabx-gr-next-cta">Open the full guide <span>↗</span></span>
          </a>

          ${more.length > 0 ? `
            <div class="sabx-section-label" style="padding:26px 0 2px;margin:0">KEEP READING</div>
            ${more.map(m => `
              <button class="sabx-gd-row" data-guide="${esc(m.slug)}">
                <span style="flex:1;min-width:0">
                  <span class="sabx-gd-row-kicker">${esc(m.kicker)}</span>
                  <span class="sabx-gd-row-title">${esc(m.title)}</span>
                </span>
                <span class="sabx-gd-row-min">${m.minutes} MIN</span>
              </button>`).join('')}` : ''}
        </div>
      </section>`
  }

  // ── Screen: deadline alerts ─────────────────────────────────────────────────
  // The design draws per-listing switches, a cadence picker and a push toggle.
  // Two of the three are real. There is no account to read subscriptions back
  // from, so the per-listing switches are one-way "remind me" buttons rather
  // than switches you can flip off — the unsubscribe link in every email is
  // the off switch. Push is left out rather than faked: there is no service
  // worker and no push channel behind it.

  interface AlertRow { key: string; kind: 'scholarship' | 'program'; id: number; name: string; meta: string; eligible: boolean }

  /**
   * "AUG 15", but "MAR 20 2027" once the year stops being this one — a saved
   * next-cycle award otherwise reads as a date that has already gone by.
   */
  function dueStamp(iso: string): string {
    const year = Number(iso.slice(0, 4))
    return year === today.getFullYear() ? shortDate(iso) : `${shortDate(iso)} ${year}`
  }

  function alertRows(): AlertRow[] {
    const rows: AlertRow[] = []
    // Eligibility is "has a dated deadline still ahead", not "open right now":
    // a next-cycle award that reopens in the spring is exactly the thing worth
    // a reminder, and /api/alert accepts it.
    for (const l of savedIds().map(id => byId.get(id)!).sort(byDeadline)) {
      rows.push({
        key: `scholarship:${l.id}`, kind: 'scholarship', id: l.id, name: l.title,
        meta: l.deadline ? `DUE ${dueStamp(l.deadline)} · ${(l.region ?? 'ALBERTA').toUpperCase()}` : 'NO FIXED DATE',
        eligible: isDatedIso(l.deadline) && statusOf(l, today) !== 'closed',
      })
    }
    for (const p of savedProgramItems()) {
      rows.push({
        key: `program:${p.id}`, kind: 'program', id: p.id, name: p.name,
        meta: isDatedIso(p.deadline) ? `DUE ${dueStamp(p.deadline)} · PROGRAM` : 'DATE TBA · PROGRAM',
        eligible: programStatusOf(p, today) === 'active',
      })
    }
    return rows
  }

  function renderAlerts(): string {
    const rows = alertRows()
    const set = readAlertMap()
    const cadence = readCadence()
    const picked = formatCadence(cadence)
    const on = rows.filter(r => set.has(r.key)).length
    // Rows that need a POST: never set, or set at a cadence that is no longer
    // what the picker says.
    const pending = rows.filter(r => r.eligible && set.get(r.key) !== picked)
    const email = readAlertEmail()

    const rowHtml = rows.map(r => {
      const stored = set.get(r.key)
      const action = stored === undefined
        ? (r.eligible ? `<button class="sabx-al-set" data-alert-set="${r.key}">Remind me</button>` : '<span class="sabx-al-state">NO DATE</span>')
        : stored === picked
          ? '<span class="sabx-al-state on">ON</span>'
          : `<button class="sabx-al-set ghost" data-alert-set="${r.key}">Update</button>`
      return `
      <div class="sabx-al-row">
        <div style="flex:1;min-width:0">
          <div class="sabx-al-name">${esc(r.name)}</div>
          <div class="sabx-al-meta">${esc(r.meta)}${stored !== undefined && stored !== picked
            ? ` · SET FOR ${esc(stored ? stored.split(',').join('/') : 'THE DEFAULT')}`
            : ''}</div>
        </div>
        ${action}
      </div>`
    }).join('')

    return `
      <section class="sabx-overlay sabx-al">
        <div class="sabx-ov-head">
          <button class="sabx-ov-back" data-close-screen aria-label="Back">‹</button>
          <span class="sabx-ov-title">Deadline alerts</span>
          <span class="sabx-ov-count">${on === 1 ? '1 SET' : `${on} SET`}</span>
        </div>
        <div class="sabx-ov-scroll pad">
          <div class="sabx-section-label" style="margin-bottom:10px">WHERE THEY GO</div>
          <div class="sabx-al-email">
            <input type="email" data-alert-email value="${esc(email)}" placeholder="your@email.com"
                   autocomplete="email" inputmode="email" aria-label="Email for deadline alerts" />
          </div>
          <div class="sabx-al-fine">Email only — no account, no password. One tap in any email turns everything off.</div>

          <div class="sabx-section-label" style="margin:26px 0 10px">WHEN</div>
          <div class="sabx-al-cadence">
            ${ALERT_MILESTONES.map(d => `
              <button data-cadence="${d}" aria-pressed="${cadence.includes(d)}">${d} DAYS</button>`).join('')}
          </div>
          <div class="sabx-al-fine">${cadenceSentence(cadence)} before each deadline. Nothing else, ever.</div>

          <div class="sabx-section-label" style="margin:26px 0 6px">WHAT WE'RE WATCHING</div>
          ${rows.length > 0 ? rowHtml : `
            <div class="sabx-empty-big" style="margin-top:8px">
              <div class="sabx-section-label">NOTHING SAVED</div>
              <h3>Save something first.</h3>
              <p>Alerts follow your shortlist — save an award and it shows up here with a reminder you can switch on.</p>
              <button class="sabx-btn-ink" data-go="feed">Open the feed</button>
            </div>`}

          ${pending.length > 1 ? `
            <button class="sabx-btn-ink" data-alert-all style="width:100%;box-sizing:border-box;margin-top:18px">${
              pending.every(r => set.has(r.key)) ? `Update all ${pending.length}` : `Remind me about all ${pending.length}`
            }</button>` : ''}

          <div class="sabx-al-unsub">Every email has a one-tap unsubscribe link — that is the only way to switch them off, and it works without signing in.</div>
        </div>
      </section>`
  }

  // ── Screen: awards that reopen ──────────────────────────────────────────────
  // Alberta deadlines cluster in spring, so for most of the year the majority
  // of the catalog is closed and the app looks emptier than the database is.
  // This is where those listings live.

  function renderReopening(): string {
    const stats = reopenStats(items, today)
    const regions = reopenRegions(items, today)
    const next = nextToOpen(items, today)
    const biggest = closedListings(items, today)
      .slice()
      .sort((a, b) => b.amountValue - a.amountValue)
      .slice(0, 8)

    const nextHtml = next ? `
      <div class="sabx-section-label" style="margin:24px 0 10px">CONFIRMED REOPEN DATE</div>
      <div class="sabx-ro-next">
        <span class="sabx-ro-next-chip">OPENS ${esc(shortDate(next.openDate!))} · IN ${daysUntil(next.openDate!, today)} DAY${daysUntil(next.openDate!, today) === 1 ? '' : 'S'}</span>
        <div class="sabx-ro-next-name">${esc(next.title)}</div>
        <div class="sabx-ro-next-org">${esc(orgLine(next))} · ${esc(next.amount)}</div>
        <div class="sabx-ro-next-btns">
          <button class="sabx-btn-ink" data-open="${next.id}">See the listing</button>
          <button class="sabx-ro-next-link" data-screen="guides">Read the guides</button>
        </div>
      </div>` : ''

    const regionHtml = regions.map(r => `
      <div class="sabx-ro-row">
        <div class="sabx-ro-n">${r.n}</div>
        <div style="flex:1;min-width:0">
          <div class="sabx-ro-label">${esc(r.region)}</div>
          <div class="sabx-ro-meta">${esc(r.months)}</div>
        </div>
      </div>`).join('')

    const biggestHtml = biggest.map(l => `
      <button class="sabx-ro-award" data-open="${l.id}">
        <span style="flex:1;min-width:0">
          <span class="sabx-ro-award-name">${esc(l.title)}</span>
          <span class="sabx-ro-award-meta">CLOSED ${esc(shortDate(l.deadline!))} · ${esc(orgLine(l))}</span>
        </span>
        <span class="sabx-ro-award-amount">${esc(shortMoney(l.amount))}</span>
      </button>`).join('')

    return `
      <section class="sabx-overlay sabx-ro">
        <div class="sabx-ov-head">
          <button class="sabx-ov-back" data-close-screen aria-label="Back">‹</button>
          <span class="sabx-ov-title">Awards that reopen</span>
        </div>
        <div class="sabx-ov-scroll pad">
          <h2 class="sabx-ro-h1">${esc(reopenHeadline(stats, today))}</h2>
          <p class="sabx-ro-lede">Most Alberta deadlines fall between March and June, so a lot of the catalog is closed at any given moment. Nothing here is gone — it comes back next cycle.</p>

          <div class="sabx-ro-stats">
            <div><b>${stats.closed}</b><span>CLOSED</span></div>
            <div><b class="green">${stats.open}</b><span>IN THE APP</span></div>
            <div><b class="rust">${stats.dated}</b><span>WITH A DATE</span></div>
          </div>

          ${nextHtml}

          ${regions.length > 0 ? `
            <div class="sabx-section-label" style="margin:26px 0 4px">WAITING ON THE PROVIDER</div>
            ${regionHtml}` : ''}

          ${biggest.length > 0 ? `
            <div class="sabx-section-label" style="margin:26px 0 4px">THE BIGGEST ONES</div>
            ${biggestHtml}` : ''}

          <div class="sabx-ov-foot">PROVIDERS PUBLISH NEXT-CYCLE DATES THROUGH THE SUMMER. WE RE-CHECK WEEKLY AND FLIP EACH AWARD ON THE DAY IT OPENS.</div>
        </div>
      </section>`
  }

  function renderOverlay(): string {
    switch (screen) {
      case 'quiz':      return renderQuiz()
      case 'programs':  return renderPrograms()
      case 'guides':    return renderGuides()
      case 'guide':     return renderGuide()
      case 'alerts':    return renderAlerts()
      case 'reopening': return renderReopening()
      default:          return ''
    }
  }

  // ── Program sheet ───────────────────────────────────────────────────────────

  function renderProgramSheet(): string {
    if (progId === null) return ''
    const p = byPid.get(progId)
    if (!p) return ''
    const on = getSavedPrograms().includes(p.id)

    const fact = (label: string, value: string | null) => value
      ? `<div class="sabx-ps-fact"><div class="sabx-ps-fact-label">${label}</div><div class="sabx-ps-fact-value">${esc(value)}</div></div>`
      : ''

    return `
      <div class="sabx-sheet-layer prog" role="dialog" aria-modal="true" aria-label="${esc(p.name)}">
        <button class="sabx-sheet-scrim" data-close-prog aria-label="Close"></button>
        <div class="sabx-sheet">
          <button class="sabx-sheet-grab" data-close-prog aria-label="Close"><i></i></button>
          <div class="sabx-sheet-body">
            <div class="sabx-sheet-meta">
              <span class="sabx-sheet-tag">${esc((p.category ?? 'RESEARCH PROGRAM').toUpperCase())}</span>
              <span class="sabx-sheet-chip" style="background:rgba(20,25,21,0.07);color:rgba(20,25,21,0.65)">${esc(programDueLabel(p, today))}</span>
            </div>
            <div class="sabx-sheet-name" style="margin-top:0">${esc(p.name)}</div>
            <div class="sabx-sheet-org">${esc(p.provider ?? 'Alberta')}</div>
            ${p.description ? `<p class="sabx-sheet-blurb">${esc(p.description)}</p>` : ''}

            <div class="sabx-sheet-facts">
              <div class="sabx-sheet-fact">
                <div class="sabx-sheet-fact-label">PAY</div>
                <div class="sabx-sheet-fact-value">${esc(p.paid ? (p.stipend ?? 'Paid') : 'Unpaid')}</div>
              </div>
              <div class="sabx-sheet-fact">
                <div class="sabx-sheet-fact-label">WHO</div>
                <div class="sabx-sheet-fact-value">${esc(p.grades ?? 'Alberta students')}</div>
              </div>
            </div>

            <div class="sabx-section-label">THE DETAILS</div>
            ${fact('RUNS', p.duration)}
            ${fact('WHERE', p.location)}
            ${fact('NEEDS', p.eligibility)}

            ${!isDatedIso(p.deadline) ? (p.deadline === 'Ongoing' ? `
              <div class="sabx-verified">
                <div class="sabx-verified-label">NO DEADLINE TO MISS</div>
                <div class="sabx-verified-body">This one takes students year round, so there is no application window to wait for. Save it if you want it in your list, then apply when you are ready.</div>
              </div>` : `
              <div class="sabx-verified">
                <div class="sabx-verified-label">NO DATE YET IS NORMAL</div>
                <div class="sabx-verified-body">Research programs publish their application window in the fall. Save it and the date appears in your Saved tab the week the provider posts it.</div>
              </div>`) : ''}
          </div>

          <div class="sabx-sheet-foot">
            <button class="sabx-ps-save" data-psave-id="${p.id}" aria-pressed="${on}">${on ? 'Saved' : 'Save'}</button>
            <a class="sabx-sheet-cta" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Program page <span>↗</span></a>
          </div>
        </div>
      </div>`
  }

  // ── Offline notice ──────────────────────────────────────────────────────────
  // The design toggles this by hand. Here it is driven by the real connection:
  // /app is prerendered and the listings are already in the document, so the
  // app genuinely keeps working — this says so instead of failing silently.

  function renderOffline(): string {
    if (!offline) return ''
    return `
      <div class="sabx-offline-layer" role="status">
        <button class="sabx-sheet-scrim" data-dismiss-offline aria-label="Dismiss"></button>
        <div class="sabx-offline-card">
          <div class="sabx-offline-label">NO CONNECTION</div>
          <div class="sabx-offline-title">You're offline — the app isn't.</div>
          <p class="sabx-offline-body">All ${open().length} open listings loaded with this page, so browsing and saving still work. Anything that needs the network — opening an application, setting an alert — waits until you're back.</p>
          <button class="sabx-btn-mint" data-dismiss-offline style="width:100%">Keep browsing</button>
        </div>
      </div>`
  }

  // ── Detail sheet ────────────────────────────────────────────────────────────

  function renderSheet(): string {
    if (openId === null) return ''
    const l = byId.get(openId)
    if (!l) return ''
    const chip = chipFor(l, today)
    const status = statusOf(l, today)
    const on = isSaved(l.id)
    const canRemind = status === 'active' && !!l.deadline

    return `
      <div class="sabx-sheet-layer" role="dialog" aria-modal="true" aria-label="${esc(l.title)}">
        <button class="sabx-sheet-scrim" data-close-sheet aria-label="Close"></button>
        <div class="sabx-sheet">
          <button class="sabx-sheet-grab" data-close-sheet aria-label="Close"><i></i></button>
          <div class="sabx-sheet-body">
            <div class="sabx-sheet-meta">
              <span class="sabx-sheet-tag">${esc((l.category ?? 'SCHOLARSHIP').toUpperCase())} · ${esc((l.region ?? 'ALBERTA').toUpperCase())}</span>
              <span class="sabx-sheet-chip" style="background:${chip.bg};color:${chip.fg}">${esc(chip.text)}</span>
            </div>
            <div class="sabx-sheet-amount">${esc(l.amount)}</div>
            <div class="sabx-sheet-name">${esc(l.title)}</div>
            <div class="sabx-sheet-org">${esc(orgLine(l))}</div>
            <p class="sabx-sheet-blurb">${esc(l.audience ?? 'Open to Alberta high school students. Full criteria are on the official page.')}</p>

            <div class="sabx-sheet-facts">
              <div class="sabx-sheet-fact">
                <div class="sabx-sheet-fact-label">DEADLINE</div>
                <div class="sabx-sheet-fact-value">${l.deadline ? esc(longDate(l.deadline)) : 'No fixed date'}</div>
              </div>
              <div class="sabx-sheet-fact">
                <div class="sabx-sheet-fact-label">APPLY</div>
                <div class="sabx-sheet-fact-value">${l.guidance ? 'Through your school' : 'Official website'}</div>
              </div>
            </div>

            <div class="sabx-steps-head">
              <div class="sabx-section-label" style="margin:0">YOUR FOUR STEPS</div>
              <div class="sabx-steps-count">${esc(stepLabel(getSteps(l.id)))}</div>
            </div>
            ${stepList(l)}
            <div class="sabx-steps-note">Ticking one keeps this award in Saved and moves its bar. Nothing here is sent anywhere.</div>

            ${canRemind ? (readAlertMap().has(`scholarship:${l.id}`) ? `
              <div class="sabx-remind">
                <div class="sabx-remind-label">REMINDER SET</div>
                <div class="sabx-remind-sub" style="margin:0">We'll email ${esc(readAlertEmail())} ${cadenceSentence(readCadence())} before it closes.</div>
              </div>` : `
              <div class="sabx-remind">
                <div class="sabx-remind-label">GET A DEADLINE REMINDER</div>
                <div class="sabx-remind-sub">We email you ${cadenceSentence(readCadence())} before it closes. Nothing else, ever. <button class="sabx-remind-when" data-screen="alerts">Change when</button></div>
                <form class="sabx-remind-form" data-remind-form data-item-id="${l.id}">
                  <input type="email" name="email" required autocomplete="email" placeholder="your@email.com" aria-label="Your email" value="${esc(readAlertEmail())}" />
                  <button type="submit">Remind me</button>
                </form>
                <div class="sabx-remind-msg" data-remind-msg hidden></div>
              </div>`) : ''}

            <div class="sabx-verified">
              <div class="sabx-verified-label">${l.verified ? `HAND-CHECKED ${esc(shortDate(l.verified))}` : 'HAND-CHECKED'}</div>
              <div class="sabx-verified-body">A student opened the official page, read the criteria and typed this in. If it's wrong, tell us and it gets fixed the same week.</div>
            </div>
          </div>

          <div class="sabx-sheet-foot">
            <button class="sabx-sheet-save" data-save-id="${l.id}" aria-pressed="${on}" aria-label="${on ? 'Remove from saved' : 'Save'}">
              <i class="sabx-bookmark" data-save-dot></i>
            </button>
            ${status === 'closed'
              ? '<span class="sabx-sheet-cta disabled">Closed</span>'
              : `<a class="sabx-sheet-cta" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-apply="${l.id}">${
                  status === 'future' ? 'See the official page' : l.guidance ? 'Learn more' : 'Open application'
                } <span>↗</span></a>`}
          </div>
        </div>
      </div>`
  }

  // ── Tab bar ─────────────────────────────────────────────────────────────────

  function renderTabBar(): string {
    // A pushed screen is always light, so the bar under it must be too.
    const dark = tab === 'feed' && screen === null
    const n = savedIds().length + savedPrgIds().length
    const t = (id: Tab, icon: string, label: string, extra = '') => `
      <button class="sabx-tab${id === 'match' ? ' match' : ''}" data-go="${id}" aria-current="${tab === id ? 'page' : 'false'}">
        ${icon}
        <span class="sabx-tab-label">${label}</span>
        ${id === 'match' ? '' : '<span class="sabx-tab-dot"></span>'}
        ${extra}
      </button>`

    return `
      <nav class="sabx-tabbar${dark ? ' dark' : ''}" aria-label="App sections">
        ${t('feed', '<span class="sabx-ic-feed"></span>', 'FEED')}
        ${t('due', '<span class="sabx-ic-due"></span>', 'DUE')}
        ${t('match', '<span class="sabx-ic-match">+</span>', 'MATCH')}
        ${t('saved', '<span class="sabx-ic-saved"></span>', 'SAVED', `<span class="sabx-tab-badge" data-sabx-badge${n === 0 ? ' hidden' : ''}>${n}</span>`)}
        ${t('me', '<span class="sabx-ic-me"></span>', 'ME')}
      </nav>`
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  /** What has to change for the screen's DOM to be rebuilt from scratch. */
  function screenKey(): string {
    switch (tab) {
      case 'feed':  return `feed:${feedMode}`
      case 'due':   return `due:${query}:${category}`
      // Not keyed on `picks` — those are patched in place by paintSaveAll.
      case 'match': return `match:${matchListings().length}`
      case 'saved': return `saved:${savedIds().join(',')}:${savedPrgIds().join(',')}`
      // Alert count too: it changes on the Alerts screen, and the Me row that
      // reports it is behind that screen the whole time.
      case 'me':    return `me:${savedIds().join(',')}:${savedPrgIds().join(',')}:${readAlertMap().size}:${formatCadence(readCadence())}`
    }
  }

  /**
   * Same idea for the pushed screen. `overlayBump` is what an alert POST or a
   * program save turns to force a repaint — the email field is uncontrolled, so
   * nothing else may rebuild this subtree while the student is typing in it.
   */
  function overlayKey(): string {
    if (screen === null) return ''
    return [
      screen, guideSlug ?? '', progCategory, String(quizStep),
      String(overlayBump), savedPrgIds().join(','),
    ].join(':')
  }

  function render(): void {
    if (!root) return
    const screenHost = root.querySelector<HTMLElement>('[data-sabx-screen]')!
    const key = screenKey()
    if (key !== renderedKey) {
      renderedKey = key
      screenHost.innerHTML =
        tab === 'feed' ? renderFeed()
        : tab === 'due' ? renderDue()
        : tab === 'match' ? renderMatch()
        : tab === 'saved' ? renderSaved()
        : renderMe()
    }

    const overlayHost = root.querySelector<HTMLElement>('[data-sabx-overlay]')!
    const oKey = overlayKey()
    if (oKey !== renderedOverlayKey) {
      renderedOverlayKey = oKey
      overlayHost.innerHTML = renderOverlay()
    }
    // A pushed screen covers the tab beneath it, so nothing under it should be
    // reachable by keyboard or read out by a screen reader.
    screenHost.inert = screen !== null

    root.querySelector<HTMLElement>('[data-sabx-sheet]')!.innerHTML = renderSheet() + renderProgramSheet()
    root.querySelector<HTMLElement>('[data-sabx-offline]')!.innerHTML = renderOffline()
    root.querySelector<HTMLElement>('[data-sabx-tabbar]')!.innerHTML = renderTabBar()

    // Chrome follows whatever is actually on top: the dark feed, the dark quiz
    // takeover, or a light pushed screen sitting over either.
    const dark = screen === 'quiz' || (tab === 'feed' && screen === null)
    const chrome = dark ? { fg: '#F2F0E9', dim: 'rgba(242,240,233,0.55)' } : { fg: '#141915', dim: 'rgba(20,25,21,0.45)' }
    const status = root.querySelector<HTMLElement>('[data-sabx-status]')
    if (status) {
      status.style.color = chrome.fg
      status.style.setProperty('--sabx-chrome-dim', chrome.dim)
    }
    root.querySelector<HTMLElement>('[data-sabx-homebar]')!.className = `sabx-homebar${dark ? ' dark' : ''}`

    paintToast()
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  function onClick(e: MouseEvent): void {
    const t = e.target as Element | null
    if (!root || !t?.closest || !root.contains(t)) return

    const goBtn = t.closest<HTMLElement>('[data-go]')
    if (goBtn) { go(goBtn.dataset.go as Tab); return }

    const screenBtn = t.closest<HTMLElement>('[data-screen]')
    if (screenBtn) { pushScreen(screenBtn.dataset.screen as AppScreen); return }

    const guideBtn = t.closest<HTMLElement>('[data-guide]')
    if (guideBtn) { pushScreen('guide', guideBtn.dataset.guide!); return }

    if (t.closest('[data-close-screen]')) { closeScreen(); return }

    const quizPick = t.closest<HTMLElement>('[data-quiz-pick]')
    if (quizPick) { answerQuiz(Number(quizPick.dataset.quizPick)); return }

    if (t.closest('[data-quiz-back]')) {
      if (quizStep === 0) closeScreen()
      else { quizStep--; render() }
      return
    }

    // Widen a three-question run to all six without losing the answers already
    // given: the fast set is a subset, so `resumeStep` lands on the first one
    // the student hasn't seen.
    if (t.closest('[data-quiz-full]')) {
      quizSet = QUIZ_QUESTIONS
      quizStep = resumeStep(quizAnswers, quizSet)
      render()
      return
    }

    const stepBtn = t.closest<HTMLElement>('[data-step-id]')
    if (stepBtn) { tickStep(Number(stepBtn.dataset.stepId), Number(stepBtn.dataset.stepI)); return }

    const progBtn = t.closest<HTMLElement>('[data-prog]')
    if (progBtn) { setProgId(Number(progBtn.dataset.prog)); render(); return }

    if (t.closest('[data-close-prog]')) { setProgId(null); render(); return }

    const progCatBtn = t.closest<HTMLElement>('[data-progcat]')
    if (progCatBtn) { progCategory = progCatBtn.dataset.progcat!; render(); return }

    const shareGuide = t.closest<HTMLElement>('[data-share-guide]')
    if (shareGuide) {
      const g = guides.find(x => x.slug === shareGuide.dataset.shareGuide)
      if (g) void share(g.title, `${SITE}/guides/${g.slug}/`)
      return
    }

    if (t.closest('[data-dismiss-offline]')) { offline = false; render(); return }

    const cadenceBtn = t.closest<HTMLElement>('[data-cadence]')
    if (cadenceBtn) {
      const day = Number(cadenceBtn.dataset.cadence) as AlertMilestone
      const current = readCadence()
      const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day]
      // Turning the last one off would mean "mail me never", which is what the
      // unsubscribe link is for — the API rejects an empty list, so say why
      // rather than letting the next POST fail.
      if (next.length === 0) { say('Keep at least one — use the unsubscribe link to stop them'); return }
      writeCadence(next)
      overlayBump++
      render()
      return
    }

    const alertBtn = t.closest<HTMLElement>('[data-alert-set]')
    if (alertBtn) { void setAlerts([alertBtn.dataset.alertSet!], alertBtn); return }

    if (t.closest('[data-alert-all]')) {
      const btn = t.closest<HTMLElement>('[data-alert-all]')!
      // Same rule as the button's own label: anything eligible that is not
      // already set at the cadence currently picked.
      const picked = formatCadence(readCadence())
      const set = readAlertMap()
      void setAlerts(alertRows().filter(r => r.eligible && set.get(r.key) !== picked).map(r => r.key), btn)
      return
    }

    const feedBtn = t.closest<HTMLElement>('[data-feed]')
    if (feedBtn) {
      feedMode = feedBtn.dataset.feed as FeedMode
      render()
      return
    }

    const openBtn = t.closest<HTMLElement>('[data-open]')
    if (openBtn) {
      openSheet(Number(openBtn.dataset.open))
      render()
      return
    }

    if (t.closest('[data-close-sheet]')) { closeSheet(); return }

    const saveBtn = t.closest<HTMLElement>('[data-save-id]')
    if (saveBtn) { save(Number(saveBtn.dataset.saveId)); return }

    const pBtn = t.closest<HTMLElement>('[data-psave-id]')
    if (pBtn) {
      const id = Number(pBtn.dataset.psaveId)
      const on = toggleSavedProgram(id).includes(id)
      if (on) sendEvent('save', 'program', id)
      navigator.vibrate?.(12)
      say(on ? 'Saved · it shows up in your Saved tab' : 'Removed from saved')
      renderedKey = ''
      render()
      return
    }

    const pickBtn = t.closest<HTMLElement>('[data-pick]')
    if (pickBtn) {
      const id = Number(pickBtn.dataset.pick)
      picks = { ...picks, [id]: !picks[id] }
      // Patched in place rather than re-rendered: a full rebuild would scroll
      // the list back to the top on every tap, which makes the bottom of a
      // 19-row match list unusable.
      pickBtn.setAttribute('aria-pressed', String(!!picks[id]))
      if (picks[id] && !prefersReducedMotion()) {
        const mark = pickBtn.querySelector<HTMLElement>('.sabx-pick')
        if (mark) { mark.classList.remove('sabx-pop'); void mark.offsetWidth; mark.classList.add('sabx-pop') }
      }
      paintSaveAll()
      return
    }

    if (t.closest('[data-save-all]')) {
      const chosen = matchListings().filter(l => picks[l.id])
      if (chosen.length === 0) { say('Tap a row to pick it'); return }
      let added = 0
      for (const l of chosen) {
        if (!isSaved(l.id)) { toggleSaved(l.id); sendEvent('save', 'scholarship', l.id); added++ }
      }
      tab = 'saved'
      render()
      say(added === 0 ? 'Already in your shortlist' : `${added} saved · deadlines tracked`)
      return
    }

    const catBtn = t.closest<HTMLElement>('[data-cat]')
    if (catBtn) { category = catBtn.dataset.cat!; render(); return }

    if (t.closest('[data-clear-query]')) {
      query = ''
      render()
      root.querySelector<HTMLInputElement>('[data-sabx-query]')?.focus()
      return
    }

    const shareBtn = t.closest<HTMLElement>('[data-share]')
    if (shareBtn) {
      const l = byId.get(Number(shareBtn.dataset.share))
      if (l) void share(l.title, listingUrl(l))
      return
    }

    if (t.closest('[data-share-app]')) { void share('ScholarAB', `${SITE}/`); return }

    if (t.closest('[data-export-ics]')) {
      const list = savedIds().map(id => byId.get(id)!)
      downloadICS(
        list.map(l => ({ id: l.id, title: l.title, amount: l.amount, url: l.url, deadline: l.deadline })),
        savedProgramItems().map(p => ({ id: p.id, name: p.name, url: p.url, deadline: p.deadline })),
      )
      say('Calendar file downloaded')
      return
    }

    const apply = t.closest<HTMLElement>('[data-apply]')
    if (apply) sendEvent('apply_click', 'scholarship', Number(apply.dataset.apply))
  }

  /**
   * Set one or many alerts from the Alerts screen. Sequential rather than
   * parallel: /api/alert is rate-limited at 20 per 15 minutes per IP, and a
   * burst of parallel POSTs is exactly the shape that limiter is there to stop.
   */
  async function setAlerts(keys: string[], btn: HTMLElement): Promise<void> {
    const email = readAlertEmail().trim()
    if (!EMAIL_RE.test(email)) {
      say('Add your email at the top first')
      root?.querySelector<HTMLInputElement>('[data-alert-email]')?.focus()
      return
    }
    const label = btn.textContent ?? 'Remind me'
    btn.textContent = 'Setting…'
    if (btn instanceof HTMLButtonElement) btn.disabled = true

    let done = 0
    let lastError: string | null = null
    for (const key of keys) {
      const [kind, rawId] = key.split(':')
      const err = await postAlert(email, kind as 'scholarship' | 'program', Number(rawId))
      if (err) lastError = err
      else done++
    }

    if (done === 0) {
      btn.textContent = label
      if (btn instanceof HTMLButtonElement) btn.disabled = false
      say(lastError ?? 'Something went wrong.')
      return
    }
    overlayBump++
    render()
    say(done === 1 ? "Set — we'll email you before it closes" : `${done} alerts set`)
  }

  async function share(title: string, url: string): Promise<void> {
    try {
      if (navigator.share) { await navigator.share({ title, url }); return }
      await navigator.clipboard.writeText(url)
      say('Link copied')
    } catch {
      // A cancelled share sheet rejects too — nothing to report either way.
    }
  }

  function onInput(e: Event): void {
    const target = e.target as Element
    const emailInput = target.closest<HTMLInputElement>('[data-alert-email]')
    if (emailInput) {
      // Stored, never re-rendered: rebuilding the screen mid-word would take
      // the field out from under the keyboard.
      writeAlertEmail(emailInput.value.trim())
      return
    }

    const input = target.closest<HTMLInputElement>('[data-sabx-query]')
    if (!input) return
    query = input.value
    const start = input.selectionStart
    render()
    // The list rebuild replaces the input, so restore focus and the caret.
    const fresh = root?.querySelector<HTMLInputElement>('[data-sabx-query]')
    if (fresh) {
      fresh.focus()
      if (start !== null) fresh.setSelectionRange(start, start)
    }

    // Content-gap signal, matching directory-client: debounced so a word isn't
    // reported once per keystroke, and measured against every listing we hold —
    // not `open()`, which this used to search. A gap means "we don't cover
    // this", so a query that only matches a closed award is a hit, not a gap,
    // exactly as it is on /scholarships.
    if (emptyTimer) clearTimeout(emptyTimer)
    const q = query.trim().toLowerCase()
    if (q.length >= 3 && searchListings(items, q).length === 0) {
      emptyTimer = setTimeout(() => sendEvent('search_empty', undefined, undefined, q), 1000)
    }
  }

  function onKeyDownSearch(e: KeyboardEvent): void {
    // Filtering is live, so Enter has nothing left to submit — blur instead so
    // the on-screen keyboard gets out of the way of the results.
    if (e.key !== 'Enter') return
    const input = (e.target as Element).closest<HTMLInputElement>('[data-sabx-query]')
    if (input) { e.preventDefault(); input.blur() }
  }

  // Capture phase + stopPropagation: Astro's ClientRouter listens for submit at
  // the document level and would swap the page out from under the form.
  async function onSubmit(e: Event): Promise<void> {
    const form = (e.target as Element).closest<HTMLFormElement>('[data-remind-form]')
    if (!form) return
    e.preventDefault()
    e.stopPropagation()
    const itemId = Number(form.dataset.itemId)
    // .trim() is belt-and-braces — `type="email"` already sanitizes surrounding
    // whitespace out of .value — but this feeds writeAlertEmail below, and the
    // remembered address should not depend on that detail of the input type.
    const email = form.querySelector<HTMLInputElement>('input[name="email"]')!.value.trim()
    const btn = form.querySelector('button')!
    const msg = form.parentElement?.querySelector<HTMLElement>('[data-remind-msg]')
    btn.disabled = true
    btn.textContent = 'Saving…'
    const fail = (text: string) => {
      btn.disabled = false
      btn.textContent = 'Remind me'
      if (msg) { msg.textContent = text; msg.style.color = 'rgba(20,25,21,0.6)'; msg.hidden = false }
    }
    try {
      const res = await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, itemType: 'scholarship', itemId, days: readCadence() }),
      })
      const data = await res.json() as { error?: string }
      if (res.ok) {
        // Remembered so the Alerts screen shows this listing as watched and
        // pre-fills the same address next time.
        writeAlertEmail(email)
        markAlert(`scholarship:${itemId}`, formatCadence(readCadence()))
        form.hidden = true
        if (msg) { msg.textContent = "✓ Set — we'll nudge you before the deadline."; msg.hidden = false }
      } else {
        fail(data.error || 'Something went wrong.')
      }
    } catch {
      fail('Something went wrong. Try again.')
    }
  }

  // Escape unwinds one layer at a time, top-down: program sheet, detail sheet,
  // pushed screen.
  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (progId !== null) { setProgId(null); render(); return }
      if (openId !== null) { closeSheet(); return }
      if (screen !== null) { closeScreen(); return }
    }
    onKeyDownSearch(e)
  }

  document.addEventListener('click', onClick)
  document.addEventListener('input', onInput)
  document.addEventListener('submit', e => void onSubmit(e), true)
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('storage', e => {
    if (e.key === 'scholarab_saved' || e.key === 'scholarab_saved_programs' || e.key === STEPS_KEY) {
      renderedKey = ''
      renderedOverlayKey = ''
      render()
    }
  })
  // A hash change alone does not fire astro:page-load, so "/app/#saved" links
  // from elsewhere on the site would otherwise land on whatever was showing.
  window.addEventListener('hashchange', () => {
    if (!root) return
    const route = routeFromHash(location.hash)
    if (route.screen === 'quiz' && screen !== 'quiz') pushScreen('quiz')
    else if (route.screen) pushScreen(route.screen, route.slug)
    else go(route.tab)
  })
  // The design toggles its offline card by hand; here the browser says so.
  window.addEventListener('offline', () => { offline = true; render() })
  window.addEventListener('online', () => {
    if (!offline) return
    offline = false
    render()
    say('Back online')
  })

  document.addEventListener('astro:page-load', () => {
    root = document.querySelector<HTMLElement>('#sabx-app')
    if (!root) return

    const payload = document.getElementById('sabx-data')?.textContent
    if (!payload) return
    const parsed = JSON.parse(payload) as { s: WireItem[]; p: WireProgram[]; g?: WireGuide[] }
    items = parsed.s.map(expandItem)
    programs = (parsed.p ?? []).map(expandProgram)
    guides = (parsed.g ?? []).map(expandGuide)
    byId.clear()
    for (const l of items) byId.set(l.id, l)
    byPid.clear()
    for (const p of programs) byPid.set(p.id, p)

    // Re-derive from the visitor's clock, not the build's: the page is
    // prerendered and served from a CDN, so every day chip here would
    // otherwise be as stale as the last deploy.
    today = midnight()

    // "/app/#due" picks the opening tab, "/app/#programs" a pushed screen, and
    // "/app/#guide/how-to-write-a-scholarship-essay" one guide. Default is the feed.
    const route = routeFromHash(location.hash)
    tab = route.tab
    screen = route.screen
    guideSlug = route.slug
    // Three questions before anything else on a first visit. The app used to
    // open on a feed it had no profile to order, with the quiz two taps away
    // behind the Match tab — so the first screen was the least useful one it
    // could show. Skipped in two cases: a deep link asked for somewhere
    // specific, and the student has already answered (or dismissed) it.
    const firstRun = !location.hash && !onboardingSeen() && !hasFastProfile(readQuiz())
    if (firstRun) screen = 'quiz'

    if (screen === 'quiz') {
      const stored = readQuizState()
      quizAnswers = stored.answers
      quizSet = hasFastProfile(stored.answers) ? QUIZ_QUESTIONS : fastQuizQuestions()
      quizStep = resumeStep(stored.answers, quizSet)
    }
    feedMode = 'foryou'
    query = ''
    category = 'ALL'
    progCategory = 'ALL'
    setProgId(null)
    offline = navigator.onLine === false
    closeSheet(false)
    picks = {}
    picksSeeded = false
    renderedKey = ''
    renderedOverlayKey = ''
    render()

    const skeleton = root.querySelector<HTMLElement>('[data-sabx-skeleton]')
    if (skeleton) skeleton.hidden = true
  })
}
