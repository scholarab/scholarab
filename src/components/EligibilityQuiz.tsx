import { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { Scholarship, Program } from '../lib/data-loader'
import type { StudentProfile, ConfidenceTier } from '../lib/eligibility-types'
import { matchAll, matchPrograms } from '../lib/eligibility-matcher'
import { getSaved, toggleSaved } from '../lib/tracker.ts'
import { showConfetti } from '../lib/utils.ts'
import { generateSlug } from '../lib/utils.ts'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  scholarships: Scholarship[]
  programs: Program[]
}

// ── Questions ─────────────────────────────────────────────────────────────────

interface QuizQuestion {
  key: string
  q: string
  opts: { label: string; value: string; emoji?: string }[]
}

const QUESTIONS: QuizQuestion[] = [
  {
    key: 'searchType',
    q: "What are you looking for?",
    opts: [
      { label: 'Scholarships', value: 'scholarships', emoji: '🎓' },
      { label: 'Research Programs', value: 'programs', emoji: '🔬' },
      { label: 'Both', value: 'both', emoji: '✨' },
    ],
  },
  {
    key: 'grade',
    q: "What grade are you in?",
    opts: [
      { label: 'Grade 10', value: '10', emoji: '📗' },
      { label: 'Grade 11', value: '11', emoji: '📘' },
      { label: 'Grade 12', value: '12', emoji: '📕' },
      { label: 'Already in post-secondary', value: 'post-secondary', emoji: '🏛️' },
    ],
  },
  {
    key: 'city',
    q: "Where are you based?",
    opts: [
      { label: 'Medicine Hat', value: 'Medicine Hat', emoji: '🏔️' },
      { label: 'Calgary', value: 'Calgary', emoji: '🌆' },
      { label: 'Edmonton', value: 'Edmonton', emoji: '🏙️' },
      { label: 'Lethbridge', value: 'Lethbridge', emoji: '🌾' },
      { label: 'Red Deer', value: 'Red Deer', emoji: '🦌' },
      { label: 'Other Alberta', value: 'Other Alberta', emoji: '🗺️' },
    ],
  },
  {
    key: 'field',
    q: "What's your academic focus?",
    opts: [
      { label: 'STEM & Engineering', value: 'STEM', emoji: '⚡' },
      { label: 'Health & Medicine', value: 'health', emoji: '🧬' },
      { label: 'Business & Commerce', value: 'business', emoji: '💼' },
      { label: 'Arts & Humanities', value: 'arts', emoji: '🎨' },
      { label: 'Trades', value: 'trades', emoji: '🔧' },
      { label: 'Still figuring it out', value: '', emoji: '💭' },
    ],
  },
  {
    key: 'average',
    q: "What's your academic average?",
    opts: [
      { label: '90% or higher', value: '93', emoji: '🌟' },
      { label: '80 – 89%', value: '85', emoji: '📊' },
      { label: 'Below 80%', value: '79', emoji: '✏️' },
      { label: "I'd rather not say", value: '', emoji: '🤫' },
    ],
  },
  {
    key: 'institution',
    q: "Where are you planning to study?",
    opts: [
      { label: 'University of Calgary', value: 'University of Calgary' },
      { label: 'University of Alberta', value: 'University of Alberta' },
      { label: 'Mount Royal University', value: 'Mount Royal University' },
      { label: 'Medicine Hat College', value: 'Medicine Hat College' },
      { label: 'Trades / Apprenticeship', value: 'Trades / Apprenticeship program', emoji: '🔨' },
      { label: "Not sure yet", value: '', emoji: '🤷' },
    ],
  },
]

const TIER_STYLES: Record<ConfidenceTier, { badge: string; label: string }> = {
  strong:   { badge: 'bg-brand-dim text-brand border-brand-border', label: 'Strong match' },
  good:     { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30', label: 'Good match' },
  possible: { badge: 'bg-subtle text-tertiary border-card', label: 'Possible match' },
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
  label, emoji, delay, state, animateIn, onClick,
}: {
  label: string
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
      className={`quiz-opt${state === 'selected' ? ' quiz-opt-selected' : ''}${state === 'dim' ? ' quiz-opt-dim' : ''}${state === 'idle' && animateIn ? ' quiz-tile-in' : ''}`}
      style={{ animationDelay: `${delay}ms`, height: '100%' }}
    >
      <span className="opt-left">
        {emoji && <span className="opt-emoji" aria-hidden="true">{emoji}</span>}
        <span>{label}</span>
      </span>
      <svg
        width="16" height="16" viewBox="0 0 16 16" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
        className="chev"
      >
        <path d="M6 12l4-4-4-4"/>
      </svg>
    </button>
  )
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({
  rank, highlight, title, subtitle, tags, rightTop, rightBottom, delay,
}: {
  rank: number
  highlight: boolean
  title: string
  subtitle?: string | null
  tags: ReactNode
  rightTop: ReactNode
  rightBottom: ReactNode
  delay: number
}) {
  return (
    <div className="card flex items-center gap-4 p-4 quiz-card-in" style={{ paddingLeft: 20, animationDelay: `${delay}ms` }}>
      <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: highlight ? 'var(--brand)' : 'var(--text-faint)', width: 36, flexShrink: 0, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{String(rank).padStart(2, '0')}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="font-semibold text-primary text-sm leading-snug">{title}</p>
        {subtitle && <p className="text-xs text-tertiary mt-0.5 line-clamp-1">{subtitle}</p>}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {tags}
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        {rightTop}
        {rightBottom}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function parseAmount(amount: string): number {
  const m = String(amount).match(/\$[\d,]+/)
  return m ? parseInt(m[0].replace(/[$,]/g, ''), 10) || 0 : 0
}

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

  const scholarshipInputs = useMemo(
    () => scholarships.map(s => ({ id: s.id, region: s.region, eligibility: s.eligibility })),
    [scholarships]
  )
  const scholarshipMap = useMemo(
    () => new Map(scholarships.map(s => [s.id, s])),
    [scholarships]
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
        <div className="seg-progress" style={{ marginBottom: 14, width: 260 }}>
          {QUESTIONS.map((_, i) => (
            <div key={i} className="seg filled" />
          ))}
        </div>

        {/* "Your matches" pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'var(--brand-dim)', border: '1px solid var(--brand-border)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--brand)', marginBottom: 10 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2L9.09 8.26 2 9.27l5 4.87L5.82 21 12 17.77 18.18 21 17 14.14l5-4.87-7.09-1.01L12 2z"/></svg>
          Your matches
        </div>

        <h2 className="text-primary" style={{ fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: 12 }}>
          {headline}
        </h2>

        {showScholarships && totalAmount > 0 && (
          <div style={{ marginBottom: 14, padding: '14px 18px', borderRadius: 16, background: 'linear-gradient(135deg, var(--brand-dim), rgba(59,130,246,0.06), rgba(167,139,250,0.08))', border: '1px solid var(--brand-border)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-secondary)', marginBottom: 2 }}>Combined award value</p>
              <p className="text-brand" style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', margin: 0 }}>
                ${totalAmount.toLocaleString('en-CA')}
              </p>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, flex: 1 }}>Strong + good matches. Always verify on the official site.</p>
          </div>
        )}

        {showScholarships && (strong.length > 0 || good.length > 0 || possible.length > 0) && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {strong.length > 0 && <span className="text-xs px-3 py-1 rounded-full border bg-brand-dim text-brand border-brand-border">{strong.length} strong match{strong.length !== 1 ? 'es' : ''}</span>}
            {good.length > 0 && <span className="text-xs px-3 py-1 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/30">{good.length} good match{good.length !== 1 ? 'es' : ''}</span>}
            {possible.length > 0 && <span className="text-xs px-3 py-1 rounded-full border bg-subtle text-tertiary border-card">{possible.length} possible</span>}
          </div>
        )}

        <div className="mb-6 pt-2 flex flex-col sm:flex-row gap-3">
          <button onClick={reset} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-card text-secondary transition">Retake quiz</button>
          {showScholarships && (
            <a href="/scholarships" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition" style={{ background: 'var(--brand)', color: '#fff' }}>Browse all scholarships</a>
          )}
          {showPrograms && !showScholarships && (
            <a href="/programs" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition" style={{ background: 'var(--brand)', color: '#fff' }}>Browse all programs</a>
          )}
        </div>

        {/* Scholarship cards */}
        {showScholarships && scholarshipResults && scholarshipResults.length > 0 && (
          <>
            {showPrograms && (
              <p className="text-xs font-semibold text-secondary uppercase tracking-widest mb-3" style={{ letterSpacing: '0.08em' }}>Scholarships</p>
            )}
            <div className="space-y-2.5">
              {scholarshipResults.map(({ scholarship: s, tier }, index) => {
                const style = TIER_STYLES[tier]
                return (
                  <ResultCard
                    key={s.id}
                    rank={index + 1}
                    delay={Math.min(index * 40, 320)}
                    highlight={index === 0}
                    title={s.title}
                    subtitle={s.audience}
                    tags={<>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${style.badge}`}>{style.label}</span>
                      {s.deadline && <span className="text-xs text-tertiary">Due {s.deadline}</span>}
                    </>}
                    rightTop={<p className="font-bold text-primary" style={{ fontSize: 17, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.amount}</p>}
                    rightBottom={
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <a href={`/scholarships/${generateSlug(s.title)}`} className="text-xs text-secondary hover:text-primary transition">Details</a>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand transition hover:opacity-80">Apply →</a>
                        <button
                          onClick={(e) => handleToggleSave(s.id, e.currentTarget)}
                          aria-label={savedIds.has(s.id) ? 'Remove from saved' : 'Save scholarship'}
                          className={`flex items-center justify-center shrink-0 transition-all duration-150 rounded-lg cursor-pointer ${savedIds.has(s.id) ? 'text-brand border border-brand-border' : 'text-secondary border border-card'}`}
                          style={{ width: 28, height: 28, background: savedIds.has(s.id) ? 'var(--brand-dim)' : undefined }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill={savedIds.has(s.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                        </button>
                      </div>
                    }
                  />
                )
              })}
            </div>
          </>
        )}

        {/* Programs cards */}
        {showPrograms && programResults && programResults.length > 0 && (
          <div style={{ marginTop: showScholarships && scholarshipResults && scholarshipResults.length > 0 ? 32 : 0 }}>
            {showScholarships && (
              <p className="text-xs font-semibold text-secondary uppercase tracking-widest mb-3" style={{ letterSpacing: '0.08em' }}>Research Programs</p>
            )}
            <div className="space-y-2.5">
              {programResults.map((p, index) => (
                <ResultCard
                  key={p.id}
                  rank={index + 1}
                  delay={Math.min(index * 40, 320)}
                  highlight={index === 0 && !showScholarships}
                  title={p.name}
                  subtitle={p.provider}
                  tags={<>
                    {p.category && <span className="text-xs px-2 py-0.5 rounded-full border bg-subtle text-tertiary border-card">{p.category}</span>}
                    {p.deadline && <span className="text-xs text-tertiary">Due {p.deadline}</span>}
                  </>}
                  rightTop={p.paid && p.stipend
                    ? <p className="font-bold text-primary" style={{ fontSize: 17, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{p.stipend}</p>
                    : p.paid
                      ? <p className="font-bold text-primary" style={{ fontSize: 14 }}>Paid</p>
                      : <p className="text-xs text-tertiary">Unpaid</p>
                  }
                  rightBottom={<a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand transition hover:opacity-80">Apply →</a>}
                />
              ))}
            </div>
          </div>
        )}

        {!hasAnyResults && (
          <div className="text-center py-12 px-4">
            <p className="font-semibold text-primary mb-2">No matches found for your profile</p>
            <p className="text-sm text-secondary mb-6 max-w-sm mx-auto">Try leaving optional fields blank. Average and institution answers narrow results significantly.</p>
            <button onClick={reset} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition" style={{ background: 'var(--brand)', color: '#fff' }}>Try again</button>
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
      {/* Segmented progress dots */}
      <div className="seg-progress" style={{ marginBottom: 14, width: 260 }}>
        {QUESTIONS.map((_, i) => (
          <div key={i} className={`seg${i < step ? ' filled' : ''}`} />
        ))}
      </div>

      {/* Question + tiles — exit animates out, next step animates in directionally */}
      <div
        key={`${animKey}-${step}`}
        className={pendingTile !== null ? 'quiz-step-out' : enterDir === 'back' ? 'quiz-step-in-back' : 'quiz-step-in'}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Question {step + 1} of {QUESTIONS.length}
          </span>
        </div>

        <h2 ref={questionHeadingRef} tabIndex={-1} className="text-primary" style={{ fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: 16, outline: 'none' }}>
          {current.q}
        </h2>

        {(() => {
          const useGrid = current.opts.length >= 4;
          return (
            <div className={useGrid ? 'tile-grid' : 'tile-col'}>
              {current.opts.map((opt, i) => {
                const spanFull = useGrid && current.opts.length % 2 !== 0 && i === current.opts.length - 1;
                return (
                  <div key={opt.value + i} style={spanFull ? { gridColumn: '1 / -1', height: '100%' } : { height: '100%' }}>
                    <MatchTile
                      label={opt.label}
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
          );
        })()}
      </div>

      {/* Back button */}
      {step > 0 && (
        <button
          onClick={back}
          style={{
            marginTop: 20, background: 'none', border: 'none',
            color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'inherit', alignSelf: 'flex-start', padding: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 12L6 8l4-4"/></svg>
          Previous
        </button>
      )}
    </div>
  )
}
