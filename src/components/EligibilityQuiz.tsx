import { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { Scholarship, Program } from '../lib/data-loader'
import type { StudentProfile, ConfidenceTier } from '../lib/eligibility-types'
import { matchAll, matchPrograms } from '../lib/eligibility-matcher'
import { getSaved, toggleSaved, getSavedPrograms, toggleSavedProgram } from '../lib/tracker.ts'
import { showConfetti, generateSlug, parseAmount } from '../lib/utils.ts'
import { sendEvent } from '../lib/events.ts'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  scholarships: Scholarship[]
  programs: Program[]
}

// ── Questions ─────────────────────────────────────────────────────────────────

interface QuizQuestion {
  key: string
  q: string
  opts: { label: string; value: string; hint?: string; emoji?: string }[]
}

// Mono hints come from the "ScholarAB Match" design; keys/values/labels are the
// real matching-engine inputs and must not change without updating the matcher.
const QUESTIONS: QuizQuestion[] = [
  {
    key: 'searchType',
    q: "What are you looking for?",
    opts: [
      { label: 'Scholarships', value: 'scholarships', hint: 'AWARDS AND BURSARIES', emoji: '🎓' },
      { label: 'Research Programs', value: 'programs', hint: 'SUMMER AND ENRICHMENT', emoji: '🔬' },
      { label: 'Both', value: 'both', hint: 'SHOW ME EVERYTHING', emoji: '✨' },
    ],
  },
  {
    key: 'grade',
    q: "What grade are you in?",
    opts: [
      { label: 'Grade 10', value: '10', hint: 'TWO YEARS TO PLAN' },
      { label: 'Grade 11', value: '11', hint: 'PRIME PREP TIME' },
      { label: 'Grade 12', value: '12', hint: 'DEADLINES MATTER NOW' },
      { label: 'Already in post-secondary', value: 'post-secondary', hint: 'CONTINUING AWARDS' },
    ],
  },
  {
    key: 'city',
    q: "Where are you based?",
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
    q: "Where are you planning to study?",
    opts: [
      { label: 'University of Calgary', value: 'University of Calgary', hint: 'CALGARY' },
      { label: 'University of Alberta', value: 'University of Alberta', hint: 'EDMONTON' },
      { label: 'Mount Royal University', value: 'Mount Royal University', hint: 'CALGARY' },
      { label: 'Medicine Hat College', value: 'Medicine Hat College', hint: 'MEDICINE HAT' },
      { label: 'Trades / Apprenticeship', value: 'Trades / Apprenticeship program', hint: 'SAIT, NAIT AND MORE' },
      { label: "Not sure yet", value: '', hint: 'KEEP OPTIONS OPEN' },
    ],
  },
]

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

const QUIZ_STORAGE_KEY = 'scholarab_quiz_answers_v4'

function loadStoredQuiz(): { step: number; answers: Record<string, string> } {
  try {
    const raw = localStorage.getItem(QUIZ_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { step?: unknown; answers?: unknown }
      const step = typeof parsed.step === 'number' && Number.isFinite(parsed.step)
        ? Math.min(Math.max(Math.trunc(parsed.step), 0), QUESTIONS.length)
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
  label, hint, emoji, delay, state, animateIn, onClick,
}: {
  label: string
  hint?: string
  emoji?: string
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
        <span className="sabm-opt-label">
          {emoji && <span className="sabm-opt-emoji" aria-hidden="true">{emoji} </span>}
          {label}
        </span>
        {hint && <span className="sabm-opt-hint sabl-mono">{hint}</span>}
      </span>
      <span className="sabm-opt-arrow" aria-hidden="true">→</span>
    </button>
  )
}

// ── Result row (design table style) ──────────────────────────────────────────

function ResultRow({
  rank, title, titleHref, subtitle, tags, amount, actions, delay,
}: {
  rank: number
  title: string
  titleHref: string
  subtitle?: string | null
  tags: ReactNode
  amount: ReactNode
  actions: ReactNode
  delay: number
}) {
  return (
    <div className="sabm-row quiz-card-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="sabm-row-num sabl-mono">{String(rank).padStart(2, '0')}</div>
      <div className="sabm-row-main">
        <a href={titleHref} className="sabm-row-name">{title}</a>
        {subtitle && <div className="sabm-row-blurb">{subtitle}</div>}
        <div className="sabm-row-tags">{tags}</div>
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
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedOnce = useRef(false)
  const questionHeadingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => () => {
    if (transitionTimeout.current) clearTimeout(transitionTimeout.current)
  }, [])

  // Focus question heading on step change for screen reader navigation.
  // Skipped on first render so hydration doesn't steal focus from the page.
  useEffect(() => {
    if (!mountedOnce.current) {
      mountedOnce.current = true
      return
    }
    if (step < QUESTIONS.length) {
      questionHeadingRef.current?.focus({ preventScroll: true })
    }
  }, [animKey, step])

  // Persist — including the completed state, so results survive a reload
  useEffect(() => {
    try { localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ step, answers })) } catch { /* ignore */ }
  }, [step, answers])

  function answer(key: string, value: string, index: number) {
    if (pendingTile !== null) return
    setPendingTile(index)
    transitionTimeout.current = setTimeout(() => {
      setPendingTile(null)
      setAnswers(a => ({ ...a, [key]: value }))
      setEnterDir('fwd')
      setAnimKey(k => k + 1)
      // Answering the first question = one started run; with quiz_complete
      // this gives a drop-off rate. Session-deduped like every event.
      if (step === 0) sendEvent('quiz_start')
      // Answering the final question = one completed run. Counted here, not on
      // the results screen, so restored sessions don't recount.
      if (step === QUESTIONS.length - 1) sendEvent('quiz_complete')
      setStep(s => Math.min(s + 1, QUESTIONS.length))
    }, 260)
  }

  function reset() {
    try { localStorage.removeItem(QUIZ_STORAGE_KEY) } catch { /* ignore */ }
    if (transitionTimeout.current) clearTimeout(transitionTimeout.current)
    setPendingTile(null)
    setAnswers({})
    setEnterDir('fwd')
    setStep(0)
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
      schoolBoard: null,
      specificSchool: null,
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
  // open or closed, and the page is prerendered — so filter by the visitor's
  // clock, not the build's). Not-yet-open listings stay: their dated deadline
  // is honest and they're worth preparing for.
  const openScholarships = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return scholarships.filter(s => !s.deadline || new Date(s.deadline + 'T00:00:00').getTime() >= today.getTime())
  }, [scholarships])
  const scholarshipInputs = useMemo(
    () => openScholarships.map(s => ({ id: s.id, region: s.region, eligibility: s.eligibility })),
    [openScholarships]
  )
  const scholarshipMap = useMemo(
    () => new Map(openScholarships.map(s => [s.id, s])),
    [openScholarships]
  )

  const searchType = answers.searchType ?? 'scholarships'
  const showScholarships = searchType === 'scholarships' || searchType === 'both'
  const showPrograms = searchType === 'programs' || searchType === 'both'

  const scholarshipResults = useMemo(() => {
    if (!profile || step < QUESTIONS.length || !showScholarships) return null
    const all = matchAll(profile, scholarshipInputs).map(m => ({
      ...m,
      scholarship: scholarshipMap.get(m.id)!,
    })).filter(m => m.scholarship)
    const quality  = all.filter(r => r.tier !== 'possible')
    const possible = all.filter(r => r.tier === 'possible')
    return quality.length >= 5 ? quality.slice(0, 10) : [...quality, ...possible].slice(0, 10)
  }, [profile, step, scholarshipInputs, scholarshipMap, showScholarships])

  const programResults = useMemo(() => {
    if (step < QUESTIONS.length || !showPrograms) return null
    return matchPrograms(programs, answers)
  }, [programs, answers, step, showPrograms])

  const totalAmount = useMemo(() => {
    if (!scholarshipResults) return 0
    return scholarshipResults.filter(r => r.tier !== 'possible').reduce((sum, r) => sum + parseAmount(r.scholarship.amount), 0)
  }, [scholarshipResults])

  const [savedIds, setSavedIds] = useState<Set<number>>(() => new Set(getSaved()))
  const handleToggleSave = useCallback((id: number, el?: Element | null) => {
    toggleSaved(id)
    const next = new Set(getSaved())
    if (next.has(id)) showConfetti(el)
    setSavedIds(next)
  }, [])

  // Programs have their own shortlist key, read by the /saved page
  const [savedProgramIds, setSavedProgramIds] = useState<Set<number>>(() => new Set(getSavedPrograms()))
  const handleToggleSaveProgram = useCallback((id: number, el?: Element | null) => {
    toggleSavedProgram(id)
    const next = new Set(getSavedPrograms())
    if (next.has(id)) showConfetti(el)
    setSavedProgramIds(next)
  }, [])

  // Hide the static match-page intro when results are shown
  useEffect(() => {
    document.body.classList.toggle('quiz-results', step >= QUESTIONS.length)
    return () => document.body.classList.remove('quiz-results')
  }, [step])

  // ── Results ────────────────────────────────────────────────────────────────

  if (step >= QUESTIONS.length) {
    const strong   = scholarshipResults?.filter(r => r.tier === 'strong') ?? []
    const good     = scholarshipResults?.filter(r => r.tier === 'good') ?? []
    const possible = scholarshipResults?.filter(r => r.tier === 'possible') ?? []

    const scholarshipCount = scholarshipResults?.length ?? 0
    const programCount = programResults?.length ?? 0
    const hasAnyResults = scholarshipCount > 0 || programCount > 0

    const headline = showScholarships && showPrograms
      ? `We found ${scholarshipCount} scholarship${scholarshipCount !== 1 ? 's' : ''} and ${programCount} program${programCount !== 1 ? 's' : ''} for you.`
      : showPrograms
        ? `We found ${programCount} program${programCount !== 1 ? 's' : ''} matching your profile.`
        : `We found ${scholarshipCount} scholarship${scholarshipCount !== 1 ? 's' : ''} you qualify for.`

    return (
      <div className="quiz-results-in">
        {/* Segmented progress — all filled */}
        <div className="sabm-progress" style={{ marginTop: 4 }}>
          {QUESTIONS.map((_, i) => (
            <div key={i} className="sabm-seg done" />
          ))}
        </div>

        <div className="sabm-kicker sabl-mono" style={{ marginTop: 24 }}>
          <span className="sabm-kicker-dot" aria-hidden="true"></span>
          <span>YOUR MATCHES</span>
        </div>

        <h2 className="sabm-results-h1">
          {headline}
        </h2>

        {showScholarships && totalAmount > 0 && (
          <div className="sabm-value-card">
            <div style={{ flex: 'none' }}>
              <div className="sabm-value-label sabl-mono">COMBINED AWARD VALUE</div>
              <div className="sabm-value-amount tnum">${totalAmount.toLocaleString('en-CA')}</div>
            </div>
            <div className="sabm-value-note">
              Strong and good matches based on your answers. Always verify eligibility on the official site before applying.
            </div>
          </div>
        )}

        <div className="sabm-results-bar">
          {showScholarships && (strong.length > 0 || good.length > 0 || possible.length > 0) ? (
            <div className="sabm-count-chips">
              {strong.length > 0 && <span className="sabl-mono sabm-count-chip solid">{strong.length} strong match{strong.length !== 1 ? 'es' : ''}</span>}
              {good.length > 0 && <span className="sabl-mono sabm-count-chip">{good.length} good match{good.length !== 1 ? 'es' : ''}</span>}
              {possible.length > 0 && <span className="sabl-mono sabm-count-chip">{possible.length} possible</span>}
            </div>
          ) : <div />}
          <div className="sabm-results-actions">
            <button onClick={reset} className="sabm-btn-outline">Retake quiz</button>
            {showScholarships && (
              <a href="/scholarships/" className="sabm-btn-accent">Browse all scholarships →</a>
            )}
            {showPrograms && !showScholarships && (
              <a href="/programs/" className="sabm-btn-accent">Browse all programs →</a>
            )}
          </div>
        </div>

        {/* Scholarship rows */}
        {showScholarships && scholarshipResults && scholarshipResults.length > 0 && (
          <div className="sabm-table">
            {showPrograms && <p className="sabl-mono sabm-table-label">SCHOLARSHIPS</p>}
            {scholarshipResults.map(({ scholarship: s, tier }, index) => {
              const style = TIER_STYLES[tier]
              return (
                <ResultRow
                  key={s.id}
                  rank={index + 1}
                  delay={Math.min(index * 40, 320)}
                  title={s.title}
                  titleHref={`/scholarships/${generateSlug(s.title)}/`}
                  subtitle={s.audience}
                  tags={<>
                    <span className={style.badge}>{style.label}</span>
                    {s.deadline && <span className="sabm-tier sabm-due">Due {formatDue(s.deadline)}</span>}
                  </>}
                  amount={s.amount}
                  actions={<>
                    <button
                      onClick={(e) => handleToggleSave(s.id, e.currentTarget)}
                      aria-label={savedIds.has(s.id) ? 'Remove from saved' : 'Save scholarship'}
                      aria-pressed={savedIds.has(s.id)}
                      className={`sabl-save${savedIds.has(s.id) ? ' on' : ''}`}
                    >
                      {savedIds.has(s.id) ? '★' : '☆'}
                    </button>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      className="sabl-apply"
                      onClick={() => sendEvent('apply_click', 'scholarship', s.id)}
                    >Apply →</a>
                  </>}
                />
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
            {showScholarships && <p className="sabl-mono sabm-table-label">RESEARCH PROGRAMS</p>}
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
                  {p.deadline && p.deadline !== 'TBA' && p.deadline !== 'Ongoing' && <span className="sabm-tier sabm-due">Due {formatDue(p.deadline)}</span>}
                </>}
                amount={
                  // Stipends are free text ("Paid internship", "$3,000 stipend"),
                  // so they get a chip plus a small note instead of the serif
                  // dollar treatment scholarship amounts use.
                  <div className="sabm-amount-cell">
                    {p.paid
                      ? <>
                          <span className="sabl-mono sabm-paid-chip">$ PAID</span>
                          {p.stipend && <span className="sabm-paid-note" title={p.stipend}>{p.stipend}</span>}
                        </>
                      : <span className="sabm-amount-muted">Unpaid</span>}
                  </div>
                }
                actions={<>
                  <button
                    onClick={(e) => handleToggleSaveProgram(p.id, e.currentTarget)}
                    aria-label={savedProgramIds.has(p.id) ? 'Remove from saved' : 'Save program'}
                    aria-pressed={savedProgramIds.has(p.id)}
                    className={`sabl-save${savedProgramIds.has(p.id) ? ' on' : ''}`}
                  >
                    {savedProgramIds.has(p.id) ? '★' : '☆'}
                  </button>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="sabl-apply"
                    onClick={() => sendEvent('apply_click', 'program', p.id)}
                  >Apply →</a>
                </>}
              />
            ))}
          </div>
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
  if (!current) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Segmented progress */}
      <div className="sabm-progress-wrap">
        <div className="sabm-progress">
          {QUESTIONS.map((_, i) => (
            <div key={i} className={`sabm-seg${i < step ? ' done' : i === step ? ' current' : ''}`} />
          ))}
        </div>
        <div className="sabl-mono sabm-step-label">
          Question {step + 1} of {QUESTIONS.length}
        </div>
      </div>

      {/* Question + tiles — exit animates out, next step animates in directionally */}
      <div
        key={`${animKey}-${step}`}
        className={pendingTile !== null ? 'quiz-step-out' : enterDir === 'back' ? 'quiz-step-in-back' : 'quiz-step-in'}
      >
        <h2 ref={questionHeadingRef} tabIndex={-1} className="sabm-question">
          {current.q}
        </h2>

        <div className="sabm-opts">
          {current.opts.map((opt, i) => {
            const spanFull = current.opts.length % 2 !== 0 && i === current.opts.length - 1;
            return (
              <div key={opt.value + i} style={spanFull ? { gridColumn: '1 / -1', height: '100%' } : { height: '100%' }}>
                <MatchTile
                  label={opt.label}
                  hint={opt.hint}
                  emoji={opt.emoji}
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
