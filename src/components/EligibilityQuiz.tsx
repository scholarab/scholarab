/** @jsxImportSource preact */
import { todayDate } from '../lib/calendar'
import { useState, useMemo, useCallback, useLayoutEffect, useRef } from 'preact/hooks'
import { Fragment, type ComponentChildren } from 'preact'
import type { QuizScholarship as Scholarship, QuizProgram as Program } from '../lib/quiz-payload'
import type { StudentProfile, ConfidenceTier } from '../lib/eligibility-types'
import { isRestrictedCheck, matchAll, matchPrograms } from '../lib/eligibility-matcher'
import { getSaved, toggleSaved, getSavedPrograms, toggleSavedProgram } from '../lib/tracker.ts'
import { showConfetti, generateSlug } from '../lib/utils.ts'
import { sendEvent } from '../lib/events.ts'
import { STATUS_WORDS, canApplyNow, programUndatedLabel, rowAction, scholarshipStatusOf, waitingLabel } from '../lib/status.ts'
import { BOOKMARK } from '../lib/icons.ts'
import {
  QUIZ_QUESTIONS, QUIZ_STORAGE_KEY, QUIZ_TTL_MS, QUIZ_MAX_QUESTION_COUNT,
  SCHOOL_QUESTION_KEY, schoolQuestion, schoolsForCity,
  BOARD_QUESTION_KEY, boardQuestion, boardsForCity, RESULT_LIMIT,
  quizQuestionCeiling, quizTotalLabel,
} from '../lib/quiz.ts'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  scholarships: Scholarship[]
  programs: Program[]
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

function formatDue(iso: string): string {
  return new Date(iso + 'T00:00:00')
    .toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function loadStoredQuiz(): { step: number; answers: Record<string, string> } {
  try {
    // Progress written by an older build lived in localStorage, which survived
    // a tab close. Clear it once so nobody resumes a week-old attempt.
    try { localStorage.removeItem(QUIZ_STORAGE_KEY) } catch { /* ignore */ }
    const raw = sessionStorage.getItem(QUIZ_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { step?: unknown; answers?: unknown; savedAt?: unknown }
      // Progress older than the TTL is thrown away rather than resumed.
      const savedAt = typeof parsed.savedAt === 'number' && Number.isFinite(parsed.savedAt)
        ? parsed.savedAt
        : 0
      if (Date.now() - savedAt > QUIZ_TTL_MS) {
        try { sessionStorage.removeItem(QUIZ_STORAGE_KEY) } catch { /* ignore */ }
        return { step: 0, answers: {} }
      }
      const step = typeof parsed.step === 'number' && Number.isFinite(parsed.step)
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
      return { step, answers }
    }
  } catch { /* ignore */ }
  return { step: 0, answers: {} }
}

// ── Tile button ───────────────────────────────────────────────────────────────

// Selection state lives in the parent so only one tile can ever be selected
// and clicks during the step transition are ignored.
function MatchTile({
  label, hint, delay, state, animateIn, onClick,
}: {
  label: string
  hint?: string
  delay: number
  state: 'idle' | 'selected' | 'dim'
  animateIn: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`sabm-opt${state === 'selected' ? ' sabm-opt-selected' : ''}${state === 'dim' ? ' sabm-opt-dim' : ''}${state === 'idle' && animateIn ? ' quiz-tile-in' : ''}`}
      style={{ animationDelay: `${delay}ms`, height: '100%' }}
    >
      <span className="sabm-opt-text">
        <span className="sabm-opt-label">{label}</span>
        {hint && <span className="sabm-opt-hint">{hint}</span>}
      </span>
      <span className="sabm-opt-arrow" aria-hidden="true">→</span>
    </button>
  )
}

// ── Result row (design table style) ──────────────────────────────────────────

function ResultRow({
  rank, title, titleHref, subtitle, tags, why, amount, actions, delay,
}: {
  rank: number
  title: string
  titleHref: string
  subtitle?: string | null
  tags: ComponentChildren
  /** Why this one ranked here, in the student's own answers. */
  why?: string[]
  amount: ComponentChildren
  actions: ComponentChildren
  delay: number
}) {
  return (
    <div className="sabm-row quiz-card-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="sabm-row-num sabl-mono">{String(rank).padStart(2, '0')}</div>
      <div className="sabm-row-main">
        <a href={titleHref} className="sabm-row-name">{title}</a>
        {subtitle && <div className="sabm-row-blurb">{subtitle}</div>}
        <div className="sabm-row-tags">{tags}</div>
        {why && why.length > 0 && (
          <ul className="sabm-row-why sabl-mono">
            {why.map(w => <li key={w}>{w}</li>)}
          </ul>
        )}
      </div>
      <div className="sabm-row-amount">{amount}</div>
      <div className="sabm-row-actions">{actions}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EligibilityQuiz({ scholarships, programs }: Props) {
  const [initial] = useState(loadStoredQuiz)
  const [step, setStep] = useState(initial.step)
  const [answers, setAnswers] = useState<Record<string, string>>(initial.answers)
  const [animKey, setAnimKey] = useState(0)
  // Index of the tile just clicked; non-null while the step is animating out
  const [pendingTile, setPendingTile] = useState<number | null>(null)
  const [enterDir, setEnterDir] = useState<'fwd' | 'back'>('fwd')
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedOnceRef = useRef(false)
  const questionHeadingRef = useRef<HTMLHeadingElement>(null)
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null)

  // The question list is not fixed: the board and school questions are
  // appended only once a city is chosen, and only when that city has awards
  // tied to a board or to named schools. Appended rather than slotted in after
  // the city question so that every step index stays stable, which matters
  // because the step is what is persisted.
  const QUESTIONS = useMemo(() => {
    if (!answers.city) return BASE_QUESTIONS
    const boards = boardsForCity(scholarships, answers.city)
    const schools = schoolsForCity(scholarships, answers.city, answers[BOARD_QUESTION_KEY])
    // Board before school: it is the coarser cut, and a student who answers it
    // has already narrowed the school list they are about to be shown.
    return [
      ...BASE_QUESTIONS,
      ...(boards.length > 0 ? [boardQuestion(boards)] : []),
      ...(schools.length > 0 ? [schoolQuestion(schools)] : []),
    ]
  }, [answers.city, answers[BOARD_QUESTION_KEY], scholarships])

  // Until the city is answered the board and school questions are unknown, so
  // "of 6" would jump to "of 8" mid-quiz. Say the most it can be for any city
  // instead; landing on fewer is good news, growing is not.
  // QuizLoader's placeholder prints the same label from the same helpers.
  const ceiling = useMemo(() => quizQuestionCeiling(scholarships), [scholarships])
  const totalLabel = quizTotalLabel(ceiling, QUESTIONS.length, !!answers.city)

  useLayoutEffect(() => () => {
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
  }, [])

  // Focus question heading on step change for screen reader navigation.
  // Skipped on first render so mounting doesn't steal focus from the page.
  useLayoutEffect(() => {
    if (!mountedOnceRef.current) {
      mountedOnceRef.current = true
      return
    }
    if (step < QUESTIONS.length) {
      // A long option list (schools, towns) leaves the page scrolled down, and
      // the next question opened with its heading above the viewport on a
      // phone (critique 2026-09-24). Bring it back only when it is hidden, so
      // a short question on desktop does not jump.
      const h = questionHeadingRef.current
      if (h && h.getBoundingClientRect().top < parseFloat(getComputedStyle(h).scrollMarginTop)) h.scrollIntoView({ block: 'start' })
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
  }, [animKey, step, QUESTIONS.length])

  // Persist, including the completed state, so results survive a reload
  useLayoutEffect(() => {
    try { sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ step, answers, savedAt: Date.now() })) } catch { /* ignore */ }
  }, [step, answers])

  // Set when a student jumps back from the results summary to change one
  // answer: the next answer returns to the results instead of walking every
  // later question again. City and board change which questions follow, so
  // those walk on as usual.
  const editingRef = useRef(false)
  function editAnswer(i: number) {
    editingRef.current = true
    setEnterDir('back')
    setAnimKey(k => k + 1)
    setStep(i)
  }

  function answer(key: string, value: string, index: number) {
    if (pendingTile !== null) return
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
        // The school list is narrowed by the board, so a new board can take
        // the kept school off it.
        if (key === BOARD_QUESTION_KEY && a[BOARD_QUESTION_KEY] !== value) delete next[SCHOOL_QUESTION_KEY]
        return next
      })
      setEnterDir('fwd')
      setAnimKey(k => k + 1)
      // Answering the first question = one started run, with quiz_complete
      // this gives a drop-off rate. Session-deduped like every event.
      if (step === 0) sendEvent('quiz_start')
      // Answering the final question = one completed run. Counted here, not on
      // the results screen, so restored sessions don't recount.
      if (step === QUESTIONS.length - 1) sendEvent('quiz_complete')
      const jumpToResults = editingRef.current && key !== 'city' && key !== BOARD_QUESTION_KEY
      editingRef.current = false
      setStep(s => jumpToResults ? QUESTIONS.length : Math.min(s + 1, QUESTIONS.length))
    }, 260)
  }

  function reset() {
    try { sessionStorage.removeItem(QUIZ_STORAGE_KEY) } catch { /* ignore */ }
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    setPendingTile(null)
    setAnswers({})
    setEnterDir('fwd')
    setStep(0)
    setShowAll(false)
    setAnimKey(k => k + 1)
  }

  function back() {
    if (pendingTile !== null) return
    setEnterDir('back')
    setAnimKey(k => k + 1)
    setStep(s => Math.max(s - 1, 0))
  }

  // Build profile from answers
  const profile = useMemo((): StudentProfile | null => {
    const city = answers.city
    if (!city) return null
    const fieldVal = answers.field
    const avgVal = answers.average
    const gradeVal = answers.grade ?? '12'
    return {
      grade: gradeVal as StudentProfile['grade'],
      city,
      // '' ("None of these", "Another school") is an answer, not a skip: it
      // rules out the board-only and school-only awards the question listed.
      schoolBoard: answers[BOARD_QUESTION_KEY] ?? null,
      specificSchool: answers[SCHOOL_QUESTION_KEY] ?? null,
      targetInstitution: answers.institution && answers.institution !== '' ? answers.institution : null,
      fields: fieldVal ? [fieldVal] : [],
      averagePercent: avgVal ? parseInt(avgVal) : null,
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
    const kept = quality.length >= 5 ? quality : [...quality, ...possible]
    // Two groups, each best fit first: what a student can apply to tonight,
    // then what opens later. By fit alone a September list was ten "Opens
    // Mar 1" rows (critique 2026-09-24), since most Grade 12 money opens in
    // spring and the local, board-specific awards score highest.
    const tag = (r: typeof kept[number]) => ({ ...r, applyNow: actionable(r.scholarship) === 0 })
    return [...kept.filter(r => actionable(r.scholarship) === 0).map(tag), ...kept.filter(r => actionable(r.scholarship) !== 0).map(tag)]
  }, [profile, step, openScholarships, scholarshipMap, showScholarships, QUESTIONS.length])

  const allProgramResults = useMemo(() => {
    if (step < QUESTIONS.length || !showPrograms) return null
    return matchPrograms(programs, answers, Infinity)
  }, [programs, answers, step, showPrograms, QUESTIONS.length])

  const [showAll, setShowAll] = useState(false)
  // The first screen keeps both groups in view: at least half the rows from
  // each when both have that many, so the best fits that open in spring are
  // not all pushed behind "Show all" by the ones open tonight.
  const scholarshipResults = allScholarshipResults && (showAll ? allScholarshipResults : (() => {
    const now = allScholarshipResults.filter(r => r.applyNow)
    const later = allScholarshipResults.filter(r => !r.applyNow)
    const nowShown = now.slice(0, Math.max(RESULT_LIMIT / 2, RESULT_LIMIT - later.length))
    return [...nowShown, ...later.slice(0, RESULT_LIMIT - nowShown.length)]
  })())
  const programResults = allProgramResults && (showAll ? allProgramResults : allProgramResults.slice(0, RESULT_LIMIT))


  const [savedIds, setSavedIds] = useState<Set<number>>(() => new Set(getSaved()))
  const handleToggleSave = useCallback((id: number, el?: Element | null) => {
    toggleSaved(id)
    const next = new Set(getSaved())
    // Saves count, un-saves don't; the metric is "people who shortlisted it"
    if (next.has(id)) { showConfetti(el); sendEvent('save', 'scholarship', id) }
    setSavedIds(next)
  }, [])

  // One tap to keep the whole shortlist: the results were the best moment in
  // the quiz and ended on "Retake" with nothing kept (critique 2026-09-23).
  const handleSaveAll = useCallback((ids: number[], el?: Element | null) => {
    const have = new Set(getSaved())
    const fresh = ids.filter(id => !have.has(id))
    for (const id of fresh) { toggleSaved(id); sendEvent('save', 'scholarship', id) }
    if (fresh.length > 0) showConfetti(el)
    setSavedIds(new Set(getSaved()))
  }, [])

  // Programs have their own shortlist key, read by the /saved page
  const [savedProgramIds, setSavedProgramIds] = useState<Set<number>>(() => new Set(getSavedPrograms()))
  const handleToggleSaveProgram = useCallback((id: number, el?: Element | null) => {
    toggleSavedProgram(id)
    const next = new Set(getSavedPrograms())
    if (next.has(id)) { showConfetti(el); sendEvent('save', 'program', id) }
    setSavedProgramIds(next)
  }, [])

  // Hide the static match-page intro when results are shown, and fold it to
  // the heading after question one (critique 2026-09-23: the subhead and the
  // trust line repeated above every question, so a phone fit about three
  // answers on screen).
  useLayoutEffect(() => {
    document.body.classList.toggle('quiz-results', step >= QUESTIONS.length)
    document.body.classList.toggle('quiz-past-first', step >= 1 && step < QUESTIONS.length)
    return () => document.body.classList.remove('quiz-results', 'quiz-past-first')
  }, [step, QUESTIONS.length])

  // Type-to-filter for the city question; cleared whenever the step moves.
  const [placeFilter, setPlaceFilter] = useState('')
  useLayoutEffect(() => { setPlaceFilter('') }, [step])

  // ── Results ────────────────────────────────────────────────────────────────

  if (step >= QUESTIONS.length) {
    const today = todayDate()
    const strong   = scholarshipResults?.filter(r => r.tier === 'strong') ?? []
    const good     = scholarshipResults?.filter(r => r.tier === 'good') ?? []
    const possible = scholarshipResults?.filter(r => r.tier === 'possible') ?? []
    // Strong matches when there are any, otherwise good ones: the set a
    // student would save first.
    const saveable = strong.length > 0 ? strong : good

    const scholarshipCount = scholarshipResults?.length ?? 0
    const programCount = programResults?.length ?? 0
    const scholarshipTotal = allScholarshipResults?.length ?? 0
    const programTotal = allProgramResults?.length ?? 0
    const hasAnyResults = scholarshipCount > 0 || programCount > 0
    const hasMore = scholarshipTotal > scholarshipCount || programTotal > programCount
    // "Your top 10 of 64" when the list is cut, the plain count when it is not.
    const counted = (shown: number, total: number, noun: string) =>
      `${total > shown ? `your top ${shown} of ${total}` : shown} ${noun}${total !== 1 ? 's' : ''}`

    // "Worth a look", never "you qualify for": the quiz asks six things and
    // most awards gate on more than six, so it can rule awards out but it
    // cannot rule them in. The rows say what is left to check.
    const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    const headline = showScholarships && showPrograms
      ? sentence(`${counted(scholarshipCount, scholarshipTotal, 'scholarship')} and ${counted(programCount, programTotal, 'program')} worth a look.`)
      : showPrograms
        ? sentence(`${counted(programCount, programTotal, 'program')} for your grade and field.`)
        : sentence(`${counted(scholarshipCount, scholarshipTotal, 'scholarship')} worth a look.`)

    // A tier only means something next to a different tier. When every row
    // carries the same one (20 of 20 "Strong match" was the common case), the
    // label reads as a promise about each award rather than a ranking.
    const tierCount = [strong, good, possible].filter(t => t.length > 0).length
    const showTiers = tierCount > 1

    return (
      <div className="quiz-results-in">
        {/* Segmented progress; all filled */}
        <div className="sabm-progress" style={{ marginTop: 4 }}>
          {QUESTIONS.map((_, i) => (
            <div key={i} className="sabm-seg done" />
          ))}
        </div>

        <h2 ref={resultsHeadingRef} tabIndex={-1} className="sabm-results-h1" style={{ marginTop: 24 }}>
          {headline}
        </h2>

        {/* What the list was built from, beside the list (critique 2026-09-23:
            the answers were a screen behind the results). Each answer opens its
            question; the next answer comes straight back here. */}
        <div className="sabm-answers">
          <span className="sabm-answers-label">You answered <span className="sabm-answers-hint">· tap one to change it</span></span>
          <ul>
            {QUESTIONS.map((q, i) => {
              const v = answers[q.key]
              if (v === undefined) return null
              const label = q.opts.find(o => o.value === v)?.label ?? v
              return (
                <li key={q.key}>
                  <button type="button" onClick={() => editAnswer(i)} aria-label={`${label}. Change your answer to: ${q.q}`}>{label}</button>
                </li>
              )
            })}
          </ul>
        </div>

        {showScholarships && (
          <p className="sabm-results-note">
            Each is a separate application, judged on its own. Check eligibility on the official site before you apply.
          </p>
        )}

        <div className="sabm-results-bar">
          {showScholarships && showTiers ? (
            <div className="sabm-count-chips">
              {strong.length > 0 && <span className="sabm-count-chip solid">{strong.length} strong match{strong.length !== 1 ? 'es' : ''}</span>}
              {good.length > 0 && <span className="sabm-count-chip">{good.length} good match{good.length !== 1 ? 'es' : ''}</span>}
              {possible.length > 0 && <span className="sabm-count-chip">{possible.length} possible</span>}
            </div>
          ) : <div />}
          <div className="sabm-results-actions">
            {showScholarships && saveable.length > 0 && (
              saveable.every(r => savedIds.has(r.scholarship.id))
                ? <span className="sabm-saved-all" role="status">Saved to your list</span>
                // The loudest thing on the page keeps the shortlist; it used to
                // be a link away from it (critique 2026-09-23). The label names
                // which rows it saves, since 20 are showing and it saves fewer.
                : <button
                    onClick={e => handleSaveAll(saveable.map(r => r.scholarship.id), e.currentTarget)}
                    className="sabm-btn-accent"
                  >{saveable.length === 1
                    ? `Save the ${strong.length > 0 ? 'strong' : 'good'} match`
                    : `Save the ${saveable.length} ${strong.length > 0 ? 'strong' : 'good'} matches`}</button>
            )}
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
            {/* The rows are numbered 01..10 and were never told what the
                number meant. It is confidence order, so say so. */}
            {scholarshipResults.map(({ scholarship: s, tier, signals, checks, applyNow }, index) => {
              // A label at the top of each group, only when there are two;
              // one group keeps the single "best fit first" line.
              const split = scholarshipResults.some(r => r.applyNow) && scholarshipResults.some(r => !r.applyNow)
              const label = index === 0 || applyNow !== scholarshipResults[index - 1]!.applyNow
                ? !split
                  ? (showPrograms ? 'Scholarships, best fit first' : 'Best fit first')
                  : applyNow ? 'Open now, best fit first' : 'Opens later, best fit first'
                : null
              const style = TIER_STYLES[tier]
              // Same ladder as the directory row this links to, so a match that
              // is not open today never wears a bare "Apply".
              const status = scholarshipStatusOf(s, today)
              // The directory's words (lib/status.ts), so a result and the row
              // it links to never describe one award two ways.
              const waiting = waitingLabel(status, s, formatDue)
              const when = waiting ? [waiting.main, waiting.sub].filter(Boolean).join(', ')
                : s.deadline ? `Due ${formatDue(s.deadline)}` : STATUS_WORDS.none
              return (
                <Fragment key={s.id}>
                {label && <p className="sabm-table-label">{label}</p>}
                <ResultRow
                  rank={index + 1}
                  delay={Math.min(index * 40, 320)}
                  title={s.title}
                  titleHref={`/scholarships/${generateSlug(s.title)}/`}
                  subtitle={s.audience}
                  tags={<>
                    {checks.length > 0
                      ? checks.map(c => <span key={c} className="sabm-tier sabm-check">Check: {c}</span>)
                      : showTiers && <span className={style.badge}>{style.label}</span>}
                    <span className="sabm-tier sabm-due">{when}</span>
                  </>}
                  // Two at most. The point is to justify the rank at a glance,
                  // not to reprint the eligibility criteria.
                  why={signals.slice(0, 2)}
                  amount={s.amount}
                  actions={<>
                    <button
                      onClick={(e) => handleToggleSave(s.id, e.currentTarget)}
                      aria-label={`${savedIds.has(s.id) ? 'Remove from saved' : 'Save'}: ${s.title}`}
                      aria-pressed={savedIds.has(s.id)}
                      className={`sabl-save${savedIds.has(s.id) ? ' on' : ''}`}
                    >
                      <span className="sabm-save-ico" dangerouslySetInnerHTML={{ __html: BOOKMARK }} />
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
                grade and field and keeps the data's own order; it does not
                score. The label says what the list actually is. */}
            <p className="sabm-table-label">
              {showScholarships ? 'Research programs for your grade and field' : 'Matched to your grade and field'}
            </p>
            {programResults.map((p, index) => (
              <ResultRow
                key={p.id}
                rank={index + 1}
                delay={Math.min(index * 40, 320)}
                title={p.name}
                titleHref={`/programs/${generateSlug(p.name)}/`}
                subtitle={p.provider}
                tags={<>
                  {p.category && <span className="sabm-tier sabm-due">{p.category}</span>}
                  <span className="sabm-tier sabm-due">{p.deadline && p.deadline !== 'TBA' && p.deadline !== 'Ongoing' ? `Due ${formatDue(p.deadline)}` : programUndatedLabel(p.deadline)}</span>
                </>}
                amount={
                  // Stipends are free text ("Paid internship", "$3,000 stipend"),
                  // so they get a chip plus a small note instead of the serif
                  // dollar treatment scholarship amounts use.
                  <div className="sabm-amount-cell">
                    {p.paid
                      ? <>
                          <span className="sabm-paid-chip">Paid</span>
                          {p.stipend && <span className="sabm-paid-note" title={p.stipend}>{p.stipend}</span>}
                        </>
                      : <span className="sabm-amount-muted">Unpaid</span>}
                  </div>
                }
                actions={<>
                  <button
                    onClick={(e) => handleToggleSaveProgram(p.id, e.currentTarget)}
                    aria-label={`${savedProgramIds.has(p.id) ? 'Remove from saved' : 'Save'}: ${p.name}`}
                    aria-pressed={savedProgramIds.has(p.id)}
                    className={`sabl-save${savedProgramIds.has(p.id) ? ' on' : ''}`}
                  >
                    <span className="sabm-save-ico" dangerouslySetInnerHTML={{ __html: BOOKMARK }} />
                  </button>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="sabl-apply"
                    onClick={() => sendEvent('apply_click', 'program', p.id)}
                    aria-label={`Apply for ${p.name} on the provider's site (opens in a new tab)`}
                  >Apply<span className="sabl-ext" aria-hidden="true">↗</span></a>
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
            <div className="sabl-empty-sub">Try leaving optional fields blank. Average and institution answers narrow results significantly.</div>
            <button onClick={reset} className="sabl-empty-btn">Try again</button>
          </div>
        )}

      </div>
    )
  }

  // ── Question step ──────────────────────────────────────────────────────────

  const current = QUESTIONS[step]
  // "Other Alberta" always stays, so a town not on the list still has a tile.
  const q = placeFilter.trim().toLowerCase()
  const shownOpts = current && current.key === 'city' && q
    ? current.opts.filter(o => o.label.toLowerCase().includes(q) || (o.hint ?? '').toLowerCase().includes(q) || o.value === 'Other Alberta')
    : current?.opts ?? []
  if (!current) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
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
          {Array.from({ length: Math.max(QUESTIONS.length, answers.city ? 0 : ceiling) }, (_, i) => (
            <div key={i} className={`sabm-seg${i >= QUESTIONS.length ? ' maybe' : i < step ? ' done' : i === step ? ' current' : ''}`} />
          ))}
        </div>
        <div className="sabl-mono sabm-step-label" aria-hidden="true">
          Question {step + 1} of {totalLabel}
        </div>
      </div>

      {/* Question + tiles; exit animates out, next step animates in directionally */}
      <div
        key={`${animKey}-${step}`}
        className={pendingTile !== null ? 'quiz-step-out' : enterDir === 'back' ? 'quiz-step-in-back' : 'quiz-step-in'}
      >
        <h2 ref={questionHeadingRef} tabIndex={-1} className="sabm-question">
          {current.q}
        </h2>

        {current.key === 'city' && (
          <input
            type="search"
            className="sabm-find"
            placeholder="Type your town"
            aria-label="Filter the list of towns"
            value={placeFilter}
            onInput={e => setPlaceFilter((e.currentTarget as HTMLInputElement).value)}
            onKeyDown={e => {
              if (e.key !== 'Enter') return
              const first = shownOpts[0]
              if (first && placeFilter.trim()) { e.preventDefault(); answer(current.key, first.value, 0) }
            }}
          />
        )}
        <div className={`sabm-opts${current.opts.length > 8 ? ' is-many' : ''}`}>
          {shownOpts.map((opt, i) => {
            // A lone last tile spans the row in the two-column grid only; the
            // compact grid has three columns on desktop and would stretch it.
            const spanFull = shownOpts.length <= 8 && shownOpts.length % 2 !== 0 && i === shownOpts.length - 1;
            return (
              <div key={opt.value + i} style={spanFull ? { gridColumn: '1 / -1', height: '100%' } : { height: '100%' }}>
                <MatchTile
                  label={opt.label}
                  hint={opt.hint}
                  delay={i * 50}
                  state={pendingTile === i ? 'selected' : pendingTile !== null ? 'dim' : 'idle'}
                  animateIn={enterDir === 'fwd'}
                  onClick={() => answer(current.key, opt.value, i)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Back button */}
      {step > 0 && (
        <button onClick={back} className="sabm-prev">← Previous</button>
      )}
    </div>
  )
}
