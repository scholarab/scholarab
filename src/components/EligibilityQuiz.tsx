/** @jsxImportSource preact */
import { calendarDaysUntil, todayDate } from '../lib/calendar'
import { useState, useMemo, useCallback, useLayoutEffect, useRef } from 'preact/hooks'
import { Fragment, type ComponentChildren } from 'preact'
import type { QuizScholarship as Scholarship, QuizProgram as Program } from '../lib/quiz-payload'
import type { StudentProfile, ConfidenceTier } from '../lib/eligibility-types'
import { isRestrictedCheck, matchAll, matchPrograms } from '../lib/eligibility-matcher'
import { getSaved, toggleSaved, getSavedPrograms, toggleSavedProgram } from '../lib/tracker.ts'
import { generateSlug, parseAmount } from '../lib/utils.ts'
import { sendEvent } from '../lib/events.ts'
import { NO_DEADLINE, STATUS_WORDS, canApplyNow, openLaterNote, programStatusOf, programUndatedLabel, rowAction, scholarshipStatusOf, waitingLabel } from '../lib/status.ts'
import { amountCell, whenTier } from '../lib/list-core.ts'
import { BOOKMARK } from '../lib/icons.ts'
import { comboHref, pickCombos, type ComboEntry } from '../lib/combo-pick.ts'
import {
  QUIZ_QUESTIONS, QUIZ_STORAGE_KEY, QUIZ_TTL_MS, QUIZ_MAX_QUESTION_COUNT,
  SCHOOL_QUESTION_KEY, schoolQuestion, schoolsForCity,
  BOARD_QUESTION_KEY, boardQuestion, boardsForCity, RESULT_LIMIT,
  quizQuestionCeiling, quizTotalLabel, AVERAGE_BAND_TOP, QUIZ_PROGRAM_QUESTIONS,
  quizOptionBatch, quizOptionPage,
} from '../lib/quiz.ts'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  scholarships: Scholarship[]
  programs: Program[]
  /** combos.ts comboIndex, built into the same payload. */
  combos?: ComboEntry[]
}

// ── Questions ─────────────────────────────────────────────────────────────────

// Edit the list in lib/quiz.ts, not here; the matcher reads the same option
// values, so the two have to move together.
const BASE_QUESTIONS = QUIZ_QUESTIONS

// DOM text stays sentence-case (tests and E2E match on it); the chips render
// uppercase via CSS text-transform.
const TIER_STYLES: Record<ConfidenceTier, { badge: string; label: string }> = {
  strong:   { badge: 'sabm-tier sabm-tier-strong', label: 'Strong match' },
  good:     { badge: 'sabm-tier sabm-tier-good', label: 'Good match' },
  possible: { badge: 'sabm-tier sabm-tier-possible', label: 'Possible match' },
}

// Results come in up to four groups: the strongest few, then by date.
type ResultGroup = 'best' | 'soon' | 'now' | 'later'
const SOON_DAYS = 30
const SOON_SHOWN = 3
// The strong matches lead, whatever their dates: a Calgary business student's
// list opened on three possible matches due soon (an essay contest, a
// right-to-life award, Loran) and the three strong fits sat last, under the
// "Save the 3 strong matches" button that saved them (critique 2026-10-01).
// Capped so a list of spring awards cannot fill the first screen again.
const BEST_SHOWN = 5
const GROUP_LABELS: Record<ResultGroup, string> = {
  best: 'Your strongest matches',
  soon: `Due in the next ${SOON_DAYS} days, best fit first`,
  now: 'Open now, best fit first',
  later: 'Upcoming or undated, best fit first',
}

function loadStoredQuiz(): { step: number; answers: Record<string, string> } {
  try {
    // Progress written by an older build lived in localStorage, which survived
    // a tab close. Clear it once so nobody resumes a week-old attempt.
    try { localStorage.removeItem(QUIZ_STORAGE_KEY) } catch { /* ignore */ }
    const raw = sessionStorage.getItem(QUIZ_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { version?: number; step?: unknown; answers?: unknown; savedAt?: unknown }
      // Progress older than the TTL is thrown away rather than resumed.
      const savedAt = typeof parsed.savedAt === 'number' && Number.isFinite(parsed.savedAt)
        ? parsed.savedAt
        : 0
      if (Date.now() - savedAt > QUIZ_TTL_MS) {
        try { sessionStorage.removeItem(QUIZ_STORAGE_KEY) } catch { /* ignore */ }
        return { step: 0, answers: {} }
      }
      let step = typeof parsed.step === 'number' && Number.isFinite(parsed.step)
        // Clamped to the longest the quiz can be: whether the school question
        // is in play depends on the city, which is one of the answers being
        // restored here, so the shorter bound would truncate a valid step.
        ? Math.min(Math.max(Math.trunc(parsed.step), 0), QUIZ_MAX_QUESTION_COUNT)
        : 0
      const answers: Record<string, string> = {}
      if (parsed.answers && typeof parsed.answers === 'object') {
        for (const [k, v] of Object.entries(parsed.answers as Record<string, unknown>)) {
          if (typeof v === 'string') answers[k] = v
        }
      }
      // Existing program attempts used the six-question scholarship path.
      // Preserve their grade/field and resume at the equivalent question.
      const version = parsed.version ?? 1
      if (answers.searchType === 'programs' && version < 2) {
        step = step <= 1 ? step : step <= 3 ? 2 : QUIZ_PROGRAM_QUESTIONS.length
      }
      // Before version 3 the scholarship path asked the grade second. It is
      // gone (Grade 12 only), so drop the answer and the step it took.
      if (answers.searchType !== 'programs' && version < 3) {
        delete answers.grade
        if (step >= 2) step -= 1
      }
      return { step, answers }
    }
  } catch { /* ignore */ }
  return { step: 0, answers: {} }
}

// ── Tile button ───────────────────────────────────────────────────────────────

// Selection state lives in the parent so only one tile can ever be selected
// and clicks during the step transition are ignored.
function MatchTile({ label, hint, state, more = false, disabled, onClick }: {
  label: string
  hint?: string
  state: 'idle' | 'selected' | 'dim'
  more?: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={hint ? `${label}, ${hint}` : undefined}
      aria-pressed={more ? undefined : state === 'selected'}
      data-quiz-answer={more ? undefined : ''}
      data-quiz-more={more ? '' : undefined}
      disabled={disabled}
      className={`sabm-opt${state === 'selected' ? ' sabm-opt-selected' : ''}${state === 'dim' ? ' sabm-opt-dim' : ''}`}
    >
      <span className="sabm-opt-text">
        <span className="sabm-opt-label">{label}</span>
        {hint && <span className="sabm-opt-hint">{hint}</span>}
      </span>
    </button>
  )
}

// ── Result row (design table style) ──────────────────────────────────────────

// The directory's row (ScholarshipDirectory.astro), so a match and the row it
// links to read the same way: the date down the left edge, money on the
// title's line, the whole row opening the listing. /match had its own card,
// with the date in a pill and the money in green, one of five row layouts a
// student met across the site (critique 2026-10-02). The sabm-row classes
// stay as hooks for the tests and the combo tray's place in the list.
function ResultRow({
  when, title, titleHref, subtitle, tags, why, amount, amountClass = 'sabl-amount', actions,
}: {
  when: { main: string; sub: string; cls: string }
  title: string
  titleHref: string
  subtitle?: string | null
  tags: ComponentChildren
  /** Why this one ranked here, in the student's own answers. */
  why?: string[]
  amount: ComponentChildren
  amountClass?: string
  actions: ComponentChildren
}) {
  return (
    <article className="sabl-card sabm-row">
      <div className="sabl-row-main">
        <h3 className="sabl-name-h"><a href={titleHref} className="sabl-name sabm-row-name">{title}</a></h3>
        {subtitle && <div className="sabl-blurb sabm-row-blurb">{subtitle}</div>}
        <div className="sabm-row-tags">{tags}</div>
        {why && why.length > 0 && (
          <ul className="sabm-row-why">
            {why.map(w => <li key={w}>{w}</li>)}
          </ul>
        )}
      </div>
      <div className={`${amountClass} sabm-row-amount`}>{amount}</div>
      <div className="sabl-row-when">
        <span className={`${when.cls} sabm-due`}><span data-when-main>{when.main}</span>{when.sub && <span className="sabl-when-sub">{when.sub}</span>}</span>
      </div>
      <div className="sabl-card-actions sabm-row-actions">{actions}</div>
    </article>
  )
}

/** The directory's date cell (list-core scholarshipWhen), from the status the
 *  quiz already has. */
function rowWhen(status: ReturnType<typeof scholarshipStatusOf>, s: { openDate?: string | null; deadline?: string | null }): { main: string; sub: string; cls: string } {
  const waiting = waitingLabel(status, s, shortDate)
  if (waiting) return { ...waiting, cls: 'sabl-when is-quiet' }
  if (!s.deadline) return { main: STATUS_WORDS.open, sub: NO_DEADLINE, cls: 'sabl-when is-quiet' }
  const days = Math.max(0, calendarDaysUntil(s.deadline))
  return { main: shortDate(s.deadline), sub: days === 0 ? 'due today' : `${days} ${days === 1 ? 'day' : 'days'} left`, cls: `sabl-when${whenTier(days)}` }
}
const shortDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })

// ── Main component ────────────────────────────────────────────────────────────

export default function EligibilityQuiz({ scholarships, programs, combos = [] }: Props) {
  const [initial] = useState(loadStoredQuiz)
  const [step, setStep] = useState(initial.step)
  const [answers, setAnswers] = useState<Record<string, string>>(initial.answers)
  // A brief selected state confirms a tap and ignores duplicate submission.
  const [pendingTile, setPendingTile] = useState<number | null>(null)
  const [optionPage, setOptionPage] = useState(0)
  const batchNavigationRef = useRef(false)
  const previousStepRef = useRef(step)
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedOnceRef = useRef(false)
  const questionHeadingRef = useRef<HTMLHeadingElement>(null)
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null)

  // The question list is not fixed: the board and school questions are
  // appended only once a city is chosen, and only when that city has awards
  // tied to a board or to named schools. Appended rather than slotted in after
  // the city question so that every step index stays stable, which matters
  // because the step is what is persisted.
  const { city, searchType: selectedSearchType } = answers
  const selectedBoard = answers[BOARD_QUESTION_KEY]
  const QUESTIONS = useMemo(() => {
    if (selectedSearchType === 'programs') return QUIZ_PROGRAM_QUESTIONS
    if (!city) return BASE_QUESTIONS
    const boards = boardsForCity(scholarships, city)
    const schools = schoolsForCity(scholarships, city, selectedBoard)
    // Board before school: it is the coarser cut, and a student who answers it
    // has already narrowed the school list they are about to be shown.
    return [
      ...BASE_QUESTIONS,
      ...(boards.length > 0 ? [boardQuestion(boards)] : []),
      ...(schools.length > 0 ? [schoolQuestion(schools)] : []),
    ]
  }, [city, selectedBoard, selectedSearchType, scholarships])

  // Until the city is answered the board and school questions are unknown, so
  // "of 6" would jump to "of 8" mid-quiz. Say the most it can be for any city
  // instead; landing on fewer is good news, growing is not.
  // QuizLoader's placeholder prints the same label from the same helpers.
  const ceiling = useMemo(() => quizQuestionCeiling(scholarships), [scholarships])
  const totalLabel = quizTotalLabel(ceiling, QUESTIONS.length, !!city || selectedSearchType === 'programs')

  useLayoutEffect(() => () => {
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
  }, [])

  // Hide the static match-page intro when results are shown, and fold it to
  // the heading after question one (critique 2026-09-23: the subhead and the
  // trust line repeated above every question, so a phone fit about three
  // answers on screen). Declared before the scroll effect below, which
  // measures the page: Preact runs every cleanup before any effect, so
  // declared after it, the intro was unfolded when the heading was measured
  // and folded again once it had been scrolled to, leaving the heading 106px
  // above an iPhone screen (critique 2026-09-27).
  useLayoutEffect(() => {
    document.body.classList.toggle('quiz-results', step >= QUESTIONS.length)
    // Set before paint by match.astro for a restored run; the body classes
    // take over from here, so Retake brings the intro back.
    document.documentElement.classList.remove('quiz-restore')
    document.body.classList.toggle('quiz-past-first', step >= 1 && step < QUESTIONS.length)
    return () => document.body.classList.remove('quiz-results', 'quiz-past-first')
  }, [step, QUESTIONS.length])

  // Focus question heading on step change for screen reader navigation.
  // Skipped on first render so mounting doesn't steal focus from the page.
  useLayoutEffect(() => {
    if (!mountedOnceRef.current) {
      mountedOnceRef.current = true
      return
    }
    const questionChanged = previousStepRef.current !== step
    previousStepRef.current = step
    if (!questionChanged && !batchNavigationRef.current) return
    batchNavigationRef.current = false
    if (step < QUESTIONS.length) {
      // A long option list (schools, towns) leaves the page scrolled down, and
      // the next question opened with its heading above the viewport on a
      // phone (critique 2026-09-24). Bring it back only when it is hidden, so
      // a short question on desktop does not jump.
      const h = questionHeadingRef.current
      if (h) {
        let top = -window.scrollY
        for (let e: HTMLElement | null = h; e; e = e.offsetParent as HTMLElement | null) top += e.offsetTop
        const margin = parseFloat(getComputedStyle(h).scrollMarginTop)
        if (top < margin) window.scrollBy(0, top - margin)
      }
      h?.focus({ preventScroll: true })
      return
    }
    // Completing the quiz kept the scroll position from the last question, so
    // answering at the bottom of a long school list landed the student partway
    // down the results with the headline and highest-ranked matches above the
    // viewport. Scroll first, then focus without scrolling again, so the sticky
    // header cannot end up covering the heading focus would have scrolled to.
    window.scrollTo({ top: 0, behavior: 'auto' })
    resultsHeadingRef.current?.focus({ preventScroll: true })
  }, [step, QUESTIONS.length, optionPage])

  // Persist, including the completed state, so results survive a reload
  useLayoutEffect(() => {
    try { sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ version: 3, step, answers, savedAt: Date.now() })) } catch { /* ignore */ }
  }, [step, answers])

  // Set when a student jumps back from the results summary to change one
  // answer: the next answer returns to the results instead of walking every
  // later question again. City and board change which questions follow, so
  // those walk on as usual.
  const editingRef = useRef(false)
  function editAnswer(i: number) {
    editingRef.current = true
    setStep(i)
  }

  function answer(key: string, value: string, index: number) {
    if (pendingTile !== null) return
    const typedTown = key === 'city' && unlistedTown ? placeFilter.trim() : ''
    setPendingTile(index)
    transitionTimeoutRef.current = setTimeout(() => {
      setPendingTile(null)
      setAnswers(a => {
        const next = { ...a, [key]: value }
        // Going back and changing the city invalidates the school: the schools
        // offered are the ones with awards in the city that was chosen, so a
        // kept answer would filter the new city's results by a school that is
        // not in it.
        if (key === 'city' && a.city !== value) {
          delete next[SCHOOL_QUESTION_KEY]
          delete next[BOARD_QUESTION_KEY]
        }
        // A town typed before picking "Other Alberta" is kept: it lifts the
        // "Only for" check off that town's own local awards.
        if (key === 'city') {
          if (value === 'Other Alberta' && typedTown) next.town = typedTown
          else delete next.town
        }
        // The school list is narrowed by the board, so a new board can take
        // the kept school off it.
        if (key === BOARD_QUESTION_KEY && a[BOARD_QUESTION_KEY] !== value) delete next[SCHOOL_QUESTION_KEY]
        return next
      })
      // Answering the first question = one started run, with quiz_complete
      // this gives a drop-off rate. Session-deduped like every event.
      if (step === 0) sendEvent('quiz_start')
      // Answering the final question = one completed run. Counted here, not on
      // the results screen, so restored sessions don't recount.
      if (step === QUESTIONS.length - 1) sendEvent('quiz_complete')
      const jumpToResults = editingRef.current && key !== 'searchType' && key !== 'city' && key !== BOARD_QUESTION_KEY
      editingRef.current = false
      setStep(s => jumpToResults ? QUESTIONS.length : Math.min(s + 1, QUESTIONS.length))
    }, 260)
  }

  function reset() {
    try { sessionStorage.removeItem(QUIZ_STORAGE_KEY) } catch { /* ignore */ }
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    setPendingTile(null)
    setAnswers({})
    setStep(0)
    setShowAll(false)
    editingRef.current = false
  }

  function back() {
    if (pendingTile !== null) return
    setStep(s => Math.max(s - 1, 0))
  }

  // Build profile from answers
  const profile = useMemo((): StudentProfile | null => {
    const city = answers.city
    if (!city) return null
    const fieldVal = answers.field
    const avgVal = answers.average
    return {
      // Scholarships are Grade 12 only since 2026-09-30. A grade answered on
      // the programs path must not narrow them after a switch to Both.
      grade: '12',
      city,
      // '' ("None of these", "Another school") is an answer, not a skip: it
      // rules out the board-only and school-only awards the question listed.
      schoolBoard: answers[BOARD_QUESTION_KEY] ?? null,
      specificSchool: answers[SCHOOL_QUESTION_KEY] ?? null,
      targetInstitution: answers.institution && answers.institution !== '' ? answers.institution : null,
      fields: fieldVal ? [fieldVal] : [],
      averagePercent: avgVal ? parseInt(avgVal) : null,
      averageTop: avgVal ? AVERAGE_BAND_TOP[avgVal] ?? null : null,
      town: city === 'Other Alberta' ? answers.town ?? null : null,
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
  }, [answers])

  // Expired listings never belong in results (the data ships every listing,
  // open or closed, and the page is prerendered, so filter by the visitor's
  // clock, not the build's). Not-yet-open listings stay: their dated deadline
  // is honest and they're worth preparing for. An award its provider has ended
  // is dropped too: it carries no deadline, so the date check alone kept it.
  const openScholarships = useMemo(() => {
    const today = todayDate()
    return scholarships.filter(s => !s.concluded && (!s.deadline || new Date(s.deadline + 'T00:00:00').getTime() >= today.getTime()))
  }, [scholarships])
  // deadline and amount are carried through for the tie-break in matchAll,
  // not for matching: confidence takes few enough distinct values that most
  // of the shown results are drawn from one tied block.
  const scholarshipMap = useMemo(
    () => new Map(openScholarships.map(s => [s.id, s])),
    [openScholarships]
  )

  const searchType = answers.searchType ?? 'scholarships'
  const showScholarships = searchType === 'scholarships' || searchType === 'both'
  const showPrograms = searchType === 'programs' || searchType === 'both'

  // Every match, uncapped. The screen shows the first RESULT_LIMIT and says how
  // many there are: "We found 20" was the cap talking, not the count.
  const allScholarshipResults = useMemo(() => {
    if (!profile || step < QUESTIONS.length || !showScholarships) return null
    const all = matchAll(profile, openScholarships).map(m => ({
      ...m,
      scholarship: scholarshipMap.get(m.id)!,
    })).filter(m => m.scholarship)
    // Within a fit tier, an award a student can apply to today, with a real
    // date, goes ahead of one that is not open or has no confirmed date. By
    // confidence alone the first "Strong match" was often undated or not open
    // yet, so the results led with the one row nobody could act on (critique
    // 2026-09-23). The sort is stable, so confidence order holds inside each.
    const today = todayDate()
    const TIER_RANK: Record<string, number> = { strong: 0, good: 1, possible: 2 }
    const actionable = (s: Scholarship) => scholarshipStatusOf(s, today) === 'active' && !!s.deadline ? 0 : 1
    // An award limited to a group the quiz never asked about (youth in care,
    // Indigenous, female) still shows with its flag, but after the awards that
    // are not: a Grade 10 student saw a youth-in-care bursary at #2.
    const restricted = (checks: string[]) => checks.some(isRestrictedCheck) ? 1 : 0
    all.sort((a, b) => TIER_RANK[a.tier]! - TIER_RANK[b.tier]!
      || restricted(a.checks) - restricted(b.checks)
      || actionable(a.scholarship) - actionable(b.scholarship))
    const quality  = all.filter(r => r.tier !== 'possible')
    const possible = all.filter(r => r.tier === 'possible')
    // Open, due within the month, and nothing on it the student was never
    // asked about beyond need or an average inside their band: the awards
    // worth this week's evenings. A possible match like this still earns its
    // row, since Loran scores "possible" for everyone (national, no local
    // tie) and was cut below five better fits that open in spring.
    const inMonth = (r: { scholarship: Scholarship; checks: string[] }) =>
      actionable(r.scholarship) === 0 && calendarDaysUntil(r.scholarship.deadline!) <= SOON_DAYS && !restricted(r.checks)
    // The group at the top starts two days out: an essay contest due tonight
    // sat at #2 for a first-time applicant (critique 2026-09-27). It still
    // lists, with "Due today", among the ones open now.
    const dueSoon = (r: { scholarship: Scholarship; checks: string[] }) =>
      inMonth(r) && calendarDaysUntil(r.scholarship.deadline!) >= 2
    const kept = quality.length >= 5 ? [...quality, ...possible.filter(inMonth)] : [...quality, ...possible]
    // Two groups, each best fit first: what a student can apply to tonight,
    // then what opens later. By fit alone a September list was ten "Opens
    // Mar 1" rows (critique 2026-09-24), since most Grade 12 money opens in
    // spring and the local, board-specific awards score highest.
    // Ahead of both, the open ones due within 30 days: best fit first put
    // every one of them below spring awards, so a late-September list had
    // nothing urgent in its top ten (critique 2026-09-26).
    // kept is already strong first, unrestricted first, open first.
    // Strong AND open with a real date: a strong fit that opens in March or
    // has no date yet heads "Upcoming" instead, still strong first. Leading
    // with three of those put Loran, due in 13 days, on the third screen
    // (critique 2026-10-02). Open strong fits still lead, as 2026-10-01 asked.
    const best = new Set(kept.filter(r => r.tier === 'strong' && !restricted(r.checks) && actionable(r.scholarship) === 0).slice(0, BEST_SHOWN))
    const groupOf = (r: typeof kept[number]): ResultGroup => best.has(r) ? 'best'
      : actionable(r.scholarship) !== 0 ? 'later'
      : dueSoon(r) ? 'soon' : 'now'
    const tagged = kept.map(r => ({ ...r, group: groupOf(r) }))
    // Fit first, then biggest: with days left the money is the tiebreak a
    // student uses, but by money alone the three shown were all "Possible"
    // (Loran, an essay contest, a beef-cattle award) above six strong fits
    // (critique 2026-09-27).
    const soon = tagged.filter(r => r.group === 'soon')
      .sort((a, b) => TIER_RANK[a.tier]! - TIER_RANK[b.tier]!
        || parseAmount(b.scholarship.amount) - parseAmount(a.scholarship.amount))
    return [...tagged.filter(r => r.group === 'best'), ...soon, ...tagged.filter(r => r.group === 'now'), ...tagged.filter(r => r.group === 'later')]
  }, [profile, step, openScholarships, scholarshipMap, showScholarships, QUESTIONS.length])

  const allProgramResults = useMemo(() => {
    if (step < QUESTIONS.length || !showPrograms) return null
    return matchPrograms(programs, answers, Infinity, todayDate())
  }, [programs, answers, step, showPrograms, QUESTIONS.length])

  const [showAll, setShowAll] = useState(false)
  // The first screen keeps both groups in view: at least half the rows from
  // each when both have that many, so the best fits that open in spring are
  // not all pushed behind "Show all" by the ones open tonight.
  // The due-soon rows come first and take at most three of the ten.
  const scholarshipResults = allScholarshipResults && (showAll ? allScholarshipResults : (() => {
    const best = allScholarshipResults.filter(r => r.group === 'best')
    const soon = allScholarshipResults.filter(r => r.group === 'soon').slice(0, SOON_SHOWN)
    const limit = RESULT_LIMIT - best.length - soon.length
    const now = allScholarshipResults.filter(r => r.group === 'now')
    const later = allScholarshipResults.filter(r => r.group === 'later')
    const nowShown = now.slice(0, Math.max(Math.ceil(limit / 2), limit - later.length))
    return [...best, ...soon, ...nowShown, ...later.slice(0, limit - nowShown.length)]
  })())
  const programResults = allProgramResults && (showAll ? allProgramResults : allProgramResults.slice(0, RESULT_LIMIT))


  const [savedIds, setSavedIds] = useState<Set<number>>(() => new Set(getSaved()))
  const handleToggleSave = useCallback((id: number) => {
    toggleSaved(id)
    const next = new Set(getSaved())
    // Saves count, un-saves don't; the metric is "people who shortlisted it"
    if (next.has(id)) sendEvent('save', 'scholarship', id, 'quiz')
    setSavedIds(next)
  }, [])

  // One tap to keep the whole shortlist: the results were the best moment in
  // the quiz and ended on "Retake" with nothing kept (critique 2026-09-23).
  const handleSaveAll = useCallback((ids: number[]) => {
    const have = new Set(getSaved())
    const fresh = ids.filter(id => !have.has(id))
    for (const id of fresh) { toggleSaved(id); sendEvent('save', 'scholarship', id, 'quiz') }
    setSavedIds(new Set(getSaved()))
  }, [])

  // The combos this student is in (combo-pick.ts), checked against every
  // match rather than the ten on screen.
  const pickedCombos = useMemo(() => allScholarshipResults
    ? pickCombos(combos, answers, new Set(allScholarshipResults.map(r => r.scholarship.id)))
    : [], [combos, answers, allScholarshipResults])

  // Programs have their own shortlist key, read by the /saved page
  const [savedProgramIds, setSavedProgramIds] = useState<Set<number>>(() => new Set(getSavedPrograms()))
  const handleToggleSaveProgram = useCallback((id: number) => {
    toggleSavedProgram(id)
    const next = new Set(getSavedPrograms())
    if (next.has(id)) sendEvent('save', 'program', id, 'quiz')
    setSavedProgramIds(next)
  }, [])

  const current = QUESTIONS[step]
  const previousAnswer = current ? answers[current.key] : undefined
  const [placeFilter, setPlaceFilter] = useState('')
  useLayoutEffect(() => {
    setPlaceFilter('')
    setOptionPage(quizOptionPage(current?.opts ?? [], previousAnswer))
  }, [step, current, previousAnswer])

  const q = placeFilter.trim().toLowerCase()
  const filterable = !!current && (current.key === 'city'
    || ((current.key === SCHOOL_QUESTION_KEY || current.key === 'institution') && current.opts.length > 4))
  const filteredOpts = current && filterable && q
    ? current.opts.filter(o => o.label.toLowerCase().includes(q)
      || (o.hint ?? '').toLowerCase().includes(q)
      || o.value === 'Other Alberta' || o.value === '')
    : current?.opts ?? []
  const batch = quizOptionBatch(filteredOpts, optionPage)
  const shownOpts = batch.options
  const unlistedTown = current?.key === 'city' && q.length >= 3
    && !filteredOpts.some(o => o.value !== 'Other Alberta')

  function showOptionPage(page: number) {
    if (pendingTile !== null) return
    batchNavigationRef.current = true
    setOptionPage(page)
  }

  // ── Results ────────────────────────────────────────────────────────────────

  if (step >= QUESTIONS.length) {
    const today = todayDate()
    const strong   = scholarshipResults?.filter(r => r.tier === 'strong') ?? []
    const good     = scholarshipResults?.filter(r => r.tier === 'good') ?? []
    const possible = scholarshipResults?.filter(r => r.tier === 'possible') ?? []
    // Strong matches when there are any, otherwise good ones: the set a
    // student would save first.
    // The strongest group sits directly under the button, so it saves those.
    const best = scholarshipResults?.filter(r => r.group === 'best') ?? []
    const saveable = best.length > 0 ? best : strong.length > 0 ? strong : good

    const scholarshipCount = scholarshipResults?.length ?? 0
    const programCount = programResults?.length ?? 0
    const scholarshipTotal = allScholarshipResults?.length ?? 0
    const programTotal = allProgramResults?.length ?? 0
    const hasAnyResults = scholarshipCount > 0 || programCount > 0
    const hasMore = scholarshipTotal > scholarshipCount || programTotal > programCount
    // State the shown and available counts without implying a program ranking.
    const counted = (shown: number, total: number, noun: string) =>
      `${total > shown ? `${shown} of ${total}` : shown} ${noun}${total !== 1 ? 's' : ''}`

    const countLabel = showScholarships && showPrograms
      ? `Showing ${counted(scholarshipCount, scholarshipTotal, 'scholarship')} and ${counted(programCount, programTotal, 'program')}.`
      : `Showing ${showPrograms ? counted(programCount, programTotal, 'program') : counted(scholarshipCount, scholarshipTotal, 'scholarship')}.`

    // A tier only means something next to a different tier. When every row
    // carries the same one (20 of 20 "Strong match" was the common case), the
    // label reads as a promise about each award rather than a ranking.
    const tierCount = [strong, good, possible].filter(t => t.length > 0).length
    const showTiers = tierCount > 1

    // A set the student can apply to as a whole: "pre-built combos, like fast
    // food" (2026-09-30), from the combo pages. After the third row, never
    // above the first: on a phone the first match is only just on screen.
    // Under the first two groups (what to apply to now), not inside them: at
    // row three it split the strongest fits from the ones due this month
    // (critique 2026-10-02). One group: after its third row, as before.
    const comboAfter = (() => {
      const rows = scholarshipResults ?? []
      const starts = rows.flatMap((r, i) => i === 0 || r.group !== rows[i - 1]!.group ? [i] : [])
      if (starts.length >= 3) return starts[2]! - 1
      if (starts.length === 2) return starts[1]! - 1
      return Math.min(2, rows.length - 1)
    })()
    const comboTrays = pickedCombos.map(({ entry, hits }) => (
      <aside key={entry.slug} className="sabm-combo" aria-labelledby={`sabm-combo-${entry.slug}`}>
        <span className="sabm-combo-tag" aria-hidden="true">Combo</span>
        <h3 id={`sabm-combo-${entry.slug}`} className="sabm-combo-name">{entry.name}</h3>
        <p className="sabm-combo-who">{hits.length} of your matches are in this combo, for you if {entry.who}.</p>
        <div className="sabm-combo-actions">
          {hits.every(id => savedIds.has(id))
            ? <span className="sabm-saved-all" role="status">All {hits.length} saved</span>
            : <button type="button" className="sabm-btn-accent" onClick={() => handleSaveAll(hits)}>Save all {hits.length}</button>}
          <a href={comboHref(entry)} className="sabm-text-link" onClick={() => sendEvent('combo_open')}>See the combo</a>
        </div>
      </aside>
    ))

    return (
      <div className="quiz-results-in">
        <h2 ref={resultsHeadingRef} tabIndex={-1} className="sabm-results-h1">Your matches</h2>
        <p className="sabm-results-count">{countLabel}</p>
        {/* Every match, not the ten on screen: the ten are split on purpose. */}
        {showScholarships && (() => {
          const note = openLaterNote((allScholarshipResults ?? []).map(r => ({ status: scholarshipStatusOf(r.scholarship, today), openDate: r.scholarship.openDate })))
          return note && <p className="sabm-later-note">{note} <button type="button" className="sab-later-ok" data-later-ok>Got it</button></p>
        })()}

        {/* What the list was built from, beside the list (critique 2026-09-23:
            the answers were a screen behind the results). Each answer opens its
            question; the next answer comes straight back here. */}
        <div className="sabm-answers">
          <span className="sabm-answers-label">You answered <span className="sabm-answers-hint">· tap one to change it</span></span>
          <ul>
            {QUESTIONS.map((q, i) => {
              const v = answers[q.key]
              if (v === undefined) return null
              const picked = q.opts.find(o => o.value === v)?.label ?? v
              const label = q.key === 'city' && answers.town ? `${answers.town} (${picked})` : picked
              return (
                <li key={q.key}>
                  <button type="button" onClick={() => editAnswer(i)} aria-label={`${label}. Change your answer to: ${q.q}`}>{label}</button>
                </li>
              )
            })}
          </ul>
        </div>

        <p className="sabm-results-note">Confirm eligibility and dates on the provider’s site before applying.</p>

        <div className="sabm-results-bar">
          <div className="sabm-results-actions">
            {showScholarships && saveable.length > 0 && (
              saveable.every(r => savedIds.has(r.scholarship.id))
                ? <span className="sabm-saved-all" role="status">Saved to your list</span>
                // The loudest thing on the page keeps the shortlist; it used to
                // be a link away from it (critique 2026-09-23). The label names
                // which rows it saves, since 20 are showing and it saves fewer.
                : <button
                    onClick={() => handleSaveAll(saveable.map(r => r.scholarship.id))}
                    className="sabm-btn-accent"
                  >{saveable.length === 1
                    ? `Save the ${strong.length > 0 ? 'strong' : 'good'} match`
                    : `Save the ${saveable.length} ${strong.length > 0 ? 'strong' : 'good'} matches`}</button>
            )}
          </div>
          {/* Its own group so a phone can move it under the list (global.css,
              "Phones: first result"); beside Save everywhere else. */}
          <div className="sabm-results-more">
            <button onClick={reset} className="sabm-btn-outline">Retake quiz</button>
            {showScholarships && (
              // The student's own hub, not the whole directory: the city is the
              // one answer every award in it already agrees with.
              answers.city && answers.city !== 'Other Alberta'
                ? <a href={`/scholarships/${generateSlug(answers.city)}/`} className="sabm-text-link">All {answers.city} scholarships</a>
                : <a href="/scholarships/alberta/" className="sabm-text-link">All province-wide scholarships</a>
            )}
            {showPrograms && !showScholarships && (
              <a href="/programs/" className="sabm-text-link">Browse all programs</a>
            )}
          </div>
        </div>

        {/* Scholarship rows */}
        {showScholarships && scholarshipResults && scholarshipResults.length > 0 && (
          <div className="sabm-table">
            {scholarshipResults.map(({ scholarship: s, tier, signals, checks, group }, index) => {
              // A label at the top of each group, only when there are two;
              // one group keeps the single "best fit first" line.
              const split = new Set(scholarshipResults.map(r => r.group)).size > 1
              const label = index === 0 || group !== scholarshipResults[index - 1]!.group
                ? !split
                  ? (showPrograms ? 'Scholarships, best fit first' : 'Best fit first')
                  : GROUP_LABELS[group]
                : null
              const style = TIER_STYLES[tier]
              // Same ladder as the directory row this links to, so a match that
              // is not open today never wears a bare "Apply".
              const status = scholarshipStatusOf(s, today)
              // The directory's words (lib/status.ts), so a result and the row
              // it links to never describe one award two ways.
              const amount = amountCell(s.amount)
              return (
                <Fragment key={s.id}>
                {label && <p className="sabm-table-label">{label}</p>}
                <ResultRow
                  when={rowWhen(status, s)}
                  title={s.title}
                  titleHref={`/scholarships/${generateSlug(s.title)}/`}
                  subtitle={s.audience}
                  tags={<>
                    {/* The tier stays beside its checks: "5 strong matches"
                        over two rows labelled Strong read as a miscount. */}
                    {showTiers && <span className={style.badge}>{style.label}</span>}
                    {checks.map(c => <span key={c} className="sabm-tier sabm-check">Check: {c}</span>)}
                  </>}
                  // Two at most. The point is to justify the rank at a glance,
                  // not to reprint the eligibility criteria.
                  why={signals.slice(0, 2)}
                  amount={amount.text}
                  amountClass={amount.cls}
                  actions={<>
                    <button
                      onClick={() => handleToggleSave(s.id)}
                      aria-label={`${savedIds.has(s.id) ? 'Remove from saved' : 'Save'}: ${s.title}`}
                      aria-pressed={savedIds.has(s.id)}
                      className={`sabl-save${savedIds.has(s.id) ? ' on' : ''}`}
                    >
                      <span className="sabm-save-ico" dangerouslySetInnerHTML={{ __html: BOOKMARK }} />
                      <span className="sabl-save-label">{savedIds.has(s.id) ? 'Saved' : 'Save'}</span>
                    </button>
                    {(() => {
                      // The directory row's rule (list-core rowAction): Apply to
                      // the provider when open today, otherwise Details here.
                      const act = rowAction(canApplyNow(status), s.url, `/scholarships/${generateSlug(s.title)}/`, s.title)
                      return act.external
                        ? <a href={act.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="sabl-apply"
                            onClick={() => sendEvent('apply_click', 'scholarship', s.id)} aria-label={act.aria}
                          >{act.label}<span className="sabl-ext" aria-hidden="true">↗</span></a>
                        : <a href={act.href} className="sabl-apply" aria-label={act.aria}>{act.label}<span className="sabl-ext" aria-hidden="true">→</span></a>
                    })()}
                  </>}
                />
                {index === comboAfter && comboTrays}
                </Fragment>
              )
            })}
          </div>
        )}

        {/* Program rows. Extra gap only when this table follows the
            scholarship one; otherwise keep the stylesheet's gap so the top
            rule never sits flush against the Retake / Browse buttons. */}
        {showPrograms && programResults && programResults.length > 0 && (
          <div
            className="sabm-table"
            style={showScholarships && scholarshipResults && scholarshipResults.length > 0 ? { marginTop: 48 } : undefined}
          >
            {/* Deliberately not "ranked by fit": matchPrograms filters by
                grade and field and orders open-and-dated first; it does not
                score. The label says what the list actually is. */}
            <p className="sabm-table-label">
              {showScholarships ? 'Programs for your grade and field' : 'Matched to your grade and field'}
            </p>
            {programResults.map(p => (
              <ResultRow
                key={p.id}
                title={p.name}
                titleHref={`/programs/${generateSlug(p.name)}/`}
                subtitle={p.provider}
                when={p.deadline && p.deadline !== 'TBA' && p.deadline !== 'Ongoing'
                  ? rowWhen(programStatusOf(p, today) === 'closed' ? 'closed' : 'active', { deadline: p.deadline })
                  : { main: programUndatedLabel(p.deadline), sub: '', cls: 'sabl-when is-quiet' }}
                tags={p.category ? <span className="sabm-tier sabm-cat">{p.category}</span> : null}
                amountClass="sabl-card-top-left"
                amount={
                  // Stipends are free text ("Paid internship", "$3,000 stipend"),
                  // so they get a chip plus a small note instead of the serif
                  // dollar treatment scholarship amounts use.
                  <div className="sabm-amount-cell">
                    {p.paid
                      ? <>
                          <span className="sabm-paid-chip">Pays you</span>
                          {p.stipend && <span className="sabm-paid-note" title={p.stipend}>{p.stipend}</span>}
                        </>
                      : <span className="sabm-amount-muted">Unpaid</span>}
                  </div>
                }
                actions={<>
                  <button
                    onClick={() => handleToggleSaveProgram(p.id)}
                    aria-label={`${savedProgramIds.has(p.id) ? 'Remove from saved' : 'Save'}: ${p.name}`}
                    aria-pressed={savedProgramIds.has(p.id)}
                    className={`sabl-save${savedProgramIds.has(p.id) ? ' on' : ''}`}
                  >
                    <span className="sabm-save-ico" dangerouslySetInnerHTML={{ __html: BOOKMARK }} />
                    <span className="sabl-save-label">{savedProgramIds.has(p.id) ? 'Saved' : 'Save'}</span>
                  </button>
                  {(() => {
                    const act = rowAction(canApplyNow(programStatusOf(p, today)), p.url, `/programs/${generateSlug(p.name)}/`, p.name)
                    return act.external
                      ? <a href={act.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="sabl-apply"
                          onClick={() => sendEvent('apply_click', 'program', p.id)} aria-label={act.aria}
                        >{act.label}<span className="sabl-ext" aria-hidden="true">↗</span></a>
                      : <a href={act.href} className="sabl-apply" aria-label={act.aria}>{act.label}<span className="sabl-ext" aria-hidden="true">→</span></a>
                  })()}
                </>}
              />
            ))}
          </div>
        )}

        {hasMore && (
          <button type="button" className="sabm-btn-outline sabm-show-all" onClick={() => setShowAll(true)}>
            Show all {showScholarships && showPrograms
              ? `${scholarshipTotal + programTotal} matches`
              : showPrograms ? `${programTotal} programs` : `${scholarshipTotal} scholarships`}
          </button>
        )}

        {!hasAnyResults && (
          <div className="sabl-empty" style={{ marginTop: 32 }}>
            <div className="sabl-empty-title">No matches found for your profile.</div>
            <div className="sabl-empty-sub">Change your answers above or browse the directory.</div>
          </div>
        )}

      </div>
    )
  }

  // ── Question step ──────────────────────────────────────────────────────────

  if (!current) return null

  return (
    <div className="sabm-question-panel">
      {/* Segmented progress */}
      <div className="sabm-progress-wrap">
        {/* One segment per question the label counts: while the city is
            open the label says "up to 8", so the bar draws 8, the ones that
            may not be asked in outline (it drew 6 under "of up to 8"). */}
        <div
          className="sabm-progress"
          role="progressbar"
          aria-label="Quiz progress"
          aria-valuemin={1}
          aria-valuemax={QUESTIONS.length}
          aria-valuenow={step + 1}
          aria-valuetext={`Question ${step + 1} of ${totalLabel}`}
        >
          {Array.from({ length: Math.max(QUESTIONS.length, answers.city || selectedSearchType === 'programs' ? 0 : ceiling) }, (_, i) => (
            <div key={i} className={`sabm-seg${i >= QUESTIONS.length ? ' maybe' : i < step ? ' done' : i === step ? ' current' : ''}`} />
          ))}
        </div>
        <div className="sabl-mono sabm-step-label" aria-hidden="true">
          Question {step + 1} of {totalLabel}
        </div>
      </div>

      <div key={current.key}>
        <h2 ref={questionHeadingRef} tabIndex={-1} className="sabm-question">
          {current.q}
        </h2>

        {filterable && (
          <input
            type="search"
            className="sabm-find"
            placeholder={current.key === 'city' ? 'Type your town' : current.key === 'institution' ? 'Type a university or college' : 'Type your school'}
            aria-label={current.key === 'city' ? 'Filter the list of towns' : current.key === 'institution' ? 'Filter the list of institutions' : 'Filter the list of schools'}
            value={placeFilter}
            onInput={e => { setPlaceFilter(e.currentTarget.value); setOptionPage(0) }}
            onKeyDown={e => {
              if (e.key !== 'Enter') return
              // The first real match, not the "Another school" or "Other
              // Alberta" tile ahead of it; that one only when nothing matched.
              const i = Math.max(0, shownOpts.findIndex(o => o.value !== '' && o.value !== 'Other Alberta'))
              const first = shownOpts[i]
              if (first && placeFilter.trim()) { e.preventDefault(); answer(current.key, first.value, i) }
            }}
          />
        )}
        <div className="sabm-opts">
          {shownOpts.map((opt, i) => {
            const spanFull = !batch.hasMore && shownOpts.length % 2 !== 0 && i === shownOpts.length - 1;
            return (
              <div key={opt.value + i} style={spanFull ? { gridColumn: '1 / -1', height: '100%' } : { height: '100%' }}>
                <MatchTile
                  label={opt.label}
                  hint={opt.value === 'Other Alberta' && unlistedTown ? `Includes ${placeFilter.trim()}` : opt.hint}
                  state={pendingTile === i ? 'selected' : pendingTile !== null ? 'dim' : previousAnswer === opt.value ? 'selected' : 'idle'}
                  disabled={pendingTile !== null}
                  onClick={() => answer(current.key, opt.value, i)}
                />
              </div>
            );
          })}
          {batch.hasMore && (
            <MatchTile label="Other" hint={current.key === 'city' ? 'More cities' : 'More options'} more
              state={pendingTile !== null ? 'dim' : 'idle'} disabled={pendingTile !== null}
              onClick={() => showOptionPage(batch.page + 1)} />
          )}
        </div>
        {filteredOpts.length > 4 && (
          <div className="sabm-options-nav">
            {batch.page > 0 && <button type="button" className="sabm-prev" disabled={pendingTile !== null}
              onClick={() => showOptionPage(batch.page - 1)}>Previous options</button>}
            <p className="sabm-options-count" role="status">Options {batch.start + 1}–{batch.start + shownOpts.length} of {filteredOpts.length}</p>
          </div>
        )}
      </div>

      {/* Back button */}
      {step > 0 && (
        <button onClick={back} disabled={pendingTile !== null} className="sabm-prev">← Previous</button>
      )}
    </div>
  )
}
