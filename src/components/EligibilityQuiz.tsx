import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { Scholarship, Program } from '../lib/data-loader'
import type { StudentProfile, ConfidenceTier } from '../lib/eligibility-types'
import { matchAll, matchProgram } from '../lib/eligibility-matcher'
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
  opts: { label: string; value: string }[]
}

const QUESTIONS: QuizQuestion[] = [
  {
    key: 'searchType',
    q: "What are you looking for?",
    opts: [
      { label: 'Scholarships', value: 'scholarships' },
      { label: 'Research Programs', value: 'programs' },
      { label: 'Both', value: 'both' },
    ],
  },
  {
    key: 'grade',
    q: "What grade are you in?",
    opts: [
      { label: 'Grade 10', value: '10' },
      { label: 'Grade 11', value: '11' },
      { label: 'Grade 12', value: '12' },
      { label: 'Already in post-secondary', value: 'post-secondary' },
    ],
  },
  {
    key: 'city',
    q: "Where are you based?",
    opts: [
      { label: 'Medicine Hat', value: 'Medicine Hat' },
      { label: 'Calgary', value: 'Calgary' },
      { label: 'Edmonton', value: 'Edmonton' },
      { label: 'Lethbridge', value: 'Lethbridge' },
      { label: 'Red Deer', value: 'Red Deer' },
      { label: 'Other Alberta', value: 'Other Alberta' },
    ],
  },
  {
    key: 'field',
    q: "What's your academic focus?",
    opts: [
      { label: 'STEM & Engineering', value: 'STEM' },
      { label: 'Health & Medicine', value: 'health' },
      { label: 'Business & Commerce', value: 'business' },
      { label: 'Arts & Humanities', value: 'arts' },
      { label: 'Trades', value: 'trades' },
      { label: 'Still figuring it out', value: '' },
    ],
  },
  {
    key: 'average',
    q: "What's your academic average?",
    opts: [
      { label: '90% or higher', value: '93' },
      { label: '80 – 89%', value: '85' },
      { label: 'Below 80%', value: '79' },
      { label: "I'd rather not say", value: '' },
    ],
  },
  {
    key: 'institution',
    q: "Where are you planning to study?",
    opts: [
      { label: 'University of Calgary', value: 'University of Calgary' },
      { label: 'University of Alberta', value: 'University of Alberta' },
      { label: 'MacEwan University', value: 'MacEwan University' },
      { label: 'Mount Royal University', value: 'Mount Royal University' },
      { label: 'Medicine Hat College', value: 'Medicine Hat College' },
      { label: 'Trades / Apprenticeship', value: 'Trades / Apprenticeship program' },
      { label: "Not sure yet", value: '' },
    ],
  },
]

const TIER_STYLES: Record<ConfidenceTier, { badge: string; label: string }> = {
  strong:   { badge: 'bg-brand-dim text-brand border-brand-border', label: 'Strong match' },
  good:     { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30', label: 'Good match' },
  possible: { badge: 'bg-subtle text-tertiary border-card', label: 'Possible match' },
}

const QUIZ_STORAGE_KEY = 'scholarab_quiz_answers_v4'

// ── Programs matching ─────────────────────────────────────────────────────────

const FIELD_KEYWORDS: Record<string, string[]> = {
  STEM:     ['stem', 'science', 'engineering', 'technology', 'math', 'research', 'computer', 'physics', 'chemistry'],
  health:   ['health', 'medicine', 'medical', 'biology', 'nursing', 'life science', 'biomedical'],
  business: ['business', 'commerce', 'economics', 'finance', 'entrepreneurship', 'management'],
  arts:     ['arts', 'humanities', 'english', 'social', 'history', 'music', 'fine art', 'writing'],
  trades:   ['trades', 'apprenticeship', 'technical', 'vocational', 'skilled'],
}

function matchPrograms(programs: Program[], answers: Record<string, string>): Program[] {
  const grade = answers.grade ?? '12'
  let filtered = programs.filter(p => p.active && matchProgram(grade, p))
  const field = answers.field
  if (field && FIELD_KEYWORDS[field]) {
    const keywords = FIELD_KEYWORDS[field]
    const byField = filtered.filter(p => {
      const text = ((p.category ?? '') + ' ' + (p.description ?? '')).toLowerCase()
      return keywords.some(kw => text.includes(kw))
    })
    if (byField.length > 0) filtered = byField
  }
  return filtered.slice(0, 10)
}

// ── Tile button ───────────────────────────────────────────────────────────────

function MatchTile({
  label, delay, onClick,
}: { label: string; delay: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const [selected, setSelected] = useState(false)

  function handleClick() {
    setSelected(true)
    setTimeout(onClick, 240)
  }

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      style={{
        textAlign: 'left',
        width: '100%',
        padding: '18px 22px',
        borderRadius: 14,
        border: `1px solid ${selected ? 'var(--brand)' : hovered ? 'var(--brand-border)' : 'var(--border-card)'}`,
        background: selected
          ? 'linear-gradient(180deg, var(--brand) 0%, #1cc195 100%)'
          : hovered
            ? 'var(--bg-card)'
            : 'var(--bg-card)',
        color: selected ? '#05130d' : 'var(--text-primary)',
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: '-0.015em',
        fontFamily: 'inherit',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        transform: selected ? 'scale(0.98)' : hovered ? 'translateX(4px)' : 'translateX(0)',
        boxShadow: selected
          ? '0 8px 32px rgba(34,211,165,0.3)'
          : hovered
            ? '0 0 0 3px rgba(34,211,165,0.08)'
            : 'none',
        transition: 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        animation: `sabSlideUp 500ms ${delay}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
      }}
    >
      <span>{label}</span>
      <svg
        width="16" height="16" viewBox="0 0 16 16" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
        style={{ flexShrink: 0, opacity: hovered || selected ? 1 : 0.3, transition: 'opacity 200ms' }}
      >
        <path d="M6 12l4-4-4-4"/>
      </svg>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function parseAmount(amount: string): number {
  const m = String(amount).match(/\$[\d,]+/)
  return m ? parseInt(m[0].replace(/[$,]/g, ''), 10) || 0 : 0
}

export default function EligibilityQuiz({ scholarships, programs }: Props) {
  const [step, setStep] = useState(() => {
    try {
      const raw = localStorage.getItem(QUIZ_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { step: number; answers: Record<string, string> }
        if (typeof parsed.step === 'number' && parsed.step >= 0) return parsed.step
      }
    } catch { /* ignore */ }
    return 0
  })
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(QUIZ_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { step: number; answers: Record<string, string> }
        return parsed.answers ?? {}
      }
    } catch { /* ignore */ }
    return {}
  })
  const [animKey, setAnimKey] = useState(0)
  const questionHeadingRef = useRef<HTMLHeadingElement>(null)

  // Focus question heading on step change for screen reader navigation
  useEffect(() => {
    if (step < QUESTIONS.length) {
      questionHeadingRef.current?.focus()
    }
  }, [animKey, step])

  // Persist
  useEffect(() => {
    if (step < QUESTIONS.length) {
      try { localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ step, answers })) } catch { /* ignore */ }
    }
  }, [step, answers])

  function answer(key: string, value: string) {
    const next = { ...answers, [key]: value }
    setAnswers(next)
    setAnimKey(k => k + 1)
    if (step + 1 >= QUESTIONS.length) {
      setStep(QUESTIONS.length)
    } else {
      setStep(s => s + 1)
    }
  }

  function reset() {
    try { localStorage.removeItem(QUIZ_STORAGE_KEY) } catch { /* ignore */ }
    setAnswers({})
    setStep(0)
    setAnimKey(k => k + 1)
  }

  function back() {
    setAnimKey(k => k + 1)
    setStep(s => s - 1)
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

  const progress = step / QUESTIONS.length

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
      <div>
        {/* Full progress bar */}
        <div style={{ height: 2, background: 'var(--border-subtle)', borderRadius: 2, marginBottom: 28, overflow: 'hidden' }}>
          <div style={{ width: '100%', height: '100%', background: 'var(--brand)', boxShadow: '0 0 12px var(--brand)', borderRadius: 2 }} />
        </div>

        {/* "Your matches" pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'var(--brand-dim)', border: '1px solid var(--brand-border)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--brand)', marginBottom: 14 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2L9.09 8.26 2 9.27l5 4.87L5.82 21 12 17.77 18.18 21 17 14.14l5-4.87-7.09-1.01L12 2z"/></svg>
          Your matches
        </div>

        <h2 className="text-primary" style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 20 }}>
          {headline}
        </h2>

        {showScholarships && totalAmount > 0 && (
          <div style={{ marginBottom: 28, padding: 'clamp(16px, 3vw, 24px)', borderRadius: 20, background: 'linear-gradient(135deg, var(--brand-dim), rgba(59,130,246,0.06), rgba(167,139,250,0.08))', border: '1px solid var(--brand-border)', backdropFilter: 'blur(20px)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-secondary)', marginBottom: 6 }}>Combined award value</p>
            <p className="text-brand" style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              ${totalAmount.toLocaleString('en-CA')}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>Strong + good matches. Always verify eligibility on the official site.</p>
          </div>
        )}

        {showScholarships && (strong.length > 0 || good.length > 0 || possible.length > 0) && (
          <div className="flex gap-2 mb-5 flex-wrap">
            {strong.length > 0 && <span className="text-xs px-3 py-1 rounded-full border bg-brand-dim text-brand border-brand-border">{strong.length} strong match{strong.length !== 1 ? 'es' : ''}</span>}
            {good.length > 0 && <span className="text-xs px-3 py-1 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/30">{good.length} good match{good.length !== 1 ? 'es' : ''}</span>}
            {possible.length > 0 && <span className="text-xs px-3 py-1 rounded-full border bg-subtle text-tertiary border-card">{possible.length} possible</span>}
          </div>
        )}

        {/* Scholarship cards */}
        {showScholarships && scholarshipResults && scholarshipResults.length > 0 && (
          <>
            {showPrograms && (
              <p className="text-xs font-semibold text-secondary uppercase tracking-widest mb-3" style={{ letterSpacing: '0.08em' }}>Scholarships</p>
            )}
            <div className="space-y-2.5">
              {scholarshipResults.map(({ scholarship: s, tier }, index) => {
                const style = TIER_STYLES[tier]
                const rankNum = String(index + 1).padStart(2, '0')
                return (
                  <div key={s.id} className="card flex items-center gap-4 p-4" style={{ paddingLeft: 20 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: index === 0 ? 'var(--brand)' : 'var(--text-faint)', width: 36, flexShrink: 0, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{rankNum}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="font-semibold text-primary text-sm leading-snug">{s.title}</p>
                      {s.audience && <p className="text-xs text-tertiary mt-0.5 line-clamp-1">{s.audience}</p>}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${style.badge}`}>{style.label}</span>
                        {s.deadline && <span className="text-xs text-tertiary">Due {s.deadline}</span>}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <p className="font-bold text-primary" style={{ fontSize: 17, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.amount}</p>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <a href={`/scholarships/${generateSlug(s.title)}`} className="text-xs text-secondary hover:text-primary transition">Details</a>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand transition hover:opacity-80">Apply →</a>
                        <button
                          onClick={(e) => handleToggleSave(s.id, e.currentTarget)}
                          aria-label={savedIds.has(s.id) ? 'Remove from saved' : 'Save scholarship'}
                          className={`flex items-center justify-center flex-shrink-0 transition-all duration-150 rounded-lg cursor-pointer ${savedIds.has(s.id) ? 'text-brand border border-brand-border' : 'text-secondary border border-card'}`}
                          style={{ width: 28, height: 28, background: savedIds.has(s.id) ? 'var(--brand-dim)' : undefined }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill={savedIds.has(s.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
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
                <div key={p.id} className="card flex items-center gap-4 p-4" style={{ paddingLeft: 20 }}>
                  <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: index === 0 && !showScholarships ? 'var(--brand)' : 'var(--text-faint)', width: 36, flexShrink: 0, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{String(index + 1).padStart(2, '0')}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-semibold text-primary text-sm leading-snug">{p.name}</p>
                    {p.provider && <p className="text-xs text-tertiary mt-0.5 line-clamp-1">{p.provider}</p>}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {p.category && <span className="text-xs px-2 py-0.5 rounded-full border bg-subtle text-tertiary border-card">{p.category}</span>}
                      {p.deadline && <span className="text-xs text-tertiary">Due {p.deadline}</span>}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    {p.paid && p.stipend
                      ? <p className="font-bold text-primary" style={{ fontSize: 17, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{p.stipend}</p>
                      : p.paid
                        ? <p className="font-bold text-primary" style={{ fontSize: 14 }}>Paid</p>
                        : <p className="text-xs text-tertiary">Unpaid</p>
                    }
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand transition hover:opacity-80">Apply →</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasAnyResults && (
          <div className="text-center py-12 px-4">
            <p className="font-semibold text-primary mb-2">No matches found for your profile</p>
            <p className="text-sm text-secondary mb-6 max-w-sm mx-auto">Try leaving optional fields blank. Average and institution answers narrow results significantly.</p>
            <button onClick={reset} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition" style={{ background: 'var(--brand)', color: '#0a0a0f' }}>Try again</button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-subtle flex flex-col sm:flex-row gap-3">
          <button onClick={reset} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-card text-secondary transition">Retake quiz</button>
          {showScholarships && (
            <a href="/scholarships" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition" style={{ background: 'var(--brand)', color: '#0a0a0f' }}>Browse all scholarships</a>
          )}
          {showPrograms && !showScholarships && (
            <a href="/programs" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition" style={{ background: 'var(--brand)', color: '#0a0a0f' }}>Browse all programs</a>
          )}
        </div>
      </div>
    )
  }

  // ── Question step ──────────────────────────────────────────────────────────

  const current = QUESTIONS[step]
  if (!current) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 400 }}>
      {/* Progress bar */}
      <div style={{ height: 2, background: 'var(--border-subtle)', borderRadius: 2, marginBottom: 28, overflow: 'hidden' }}>
        <div style={{
          width: `${progress * 100}%`, height: '100%',
          background: 'var(--brand)',
          boxShadow: '0 0 10px var(--brand)',
          borderRadius: 2,
          transition: 'width 500ms cubic-bezier(0.22, 1, 0.36, 1)',
        }} />
      </div>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Question {step + 1} of {QUESTIONS.length}
        </span>
      </div>

      {/* Question + tiles — animated on step change */}
      <div key={`${animKey}-${step}`} style={{ animation: 'sabSlideUp 420ms cubic-bezier(0.22, 1, 0.36, 1) both' }}>
        <h2 ref={questionHeadingRef} tabIndex={-1} className="text-primary" style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: 24, outline: 'none' }}>
          {current.q}
        </h2>

        {(() => {
          const useGrid = current.opts.length >= 4;
          return (
            <div style={useGrid
              ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }
              : { display: 'flex', flexDirection: 'column', gap: 10 }
            }>
              {current.opts.map((opt, i) => {
                const spanFull = useGrid && current.opts.length % 2 !== 0 && i === current.opts.length - 1;
                return (
                  <div key={opt.value + i} style={spanFull ? { gridColumn: '1 / -1' } : undefined}>
                    <MatchTile
                      label={opt.label}
                      delay={i * 50}
                      onClick={() => answer(current.key, opt.value)}
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
            marginTop: 32, background: 'none', border: 'none',
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
