import { useState, useMemo, useCallback } from 'react'
import type { Scholarship } from '../lib/data-loader'
import type { StudentProfile, ConfidenceTier } from '../lib/eligibility-types'
import { matchAll } from '../lib/eligibility-matcher'
import { getSaved, toggleSaved } from '../lib/tracker.ts'
import { showConfetti } from '../lib/utils.ts'
import { generateSlug } from '../lib/utils.ts'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 'results'

interface Props {
  scholarships: Scholarship[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GRADE_OPTIONS = [
  { value: '10', label: 'Grade 10' },
  { value: '11', label: 'Grade 11' },
  { value: '12', label: 'Grade 12' },
]

const CITY_OPTIONS = [
  'Medicine Hat', 'Calgary', 'Edmonton', 'Lethbridge', 'Red Deer', 'Other Alberta',
]

const INSTITUTIONS = [
  'University of Calgary',
  'University of Alberta',
  'MacEwan University',
  'Mount Royal University',
  'University of Lethbridge',
  'Medicine Hat College',
  'Trades / Apprenticeship program',
  'Not sure yet',
]

const FIELDS = [
  { value: 'STEM', label: 'STEM' },
  { value: 'health', label: 'Health & Medicine' },
  { value: 'business', label: 'Business' },
  { value: 'arts', label: 'Arts & Humanities' },
  { value: 'trades', label: 'Trades' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'education', label: 'Education' },
  { value: 'social_work', label: 'Social Work' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'law', label: 'Law' },
  { value: 'music', label: 'Music / Performing Arts' },
]

const AVERAGE_BRACKETS = [
  { value: 72, label: 'Below 80%' },
  { value: 85, label: '80 – 89%' },
  { value: 93, label: '90% or higher' },
]

const TIER_STYLES: Record<ConfidenceTier, { badge: string; label: string }> = {
  strong:   { badge: 'bg-brand-dim text-brand border-brand-border', label: 'Strong match' },
  good:     { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30', label: 'Good match' },
  possible: { badge: 'bg-subtle text-tertiary border-card', label: 'Possible match' },
}

// ── Helper components ─────────────────────────────────────────────────────────

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 select-none border ${
        active
          ? 'border-brand-border text-brand'
          : 'bg-subtle border-card text-secondary hover:border-medium'
      }`}
      style={active ? { background: 'var(--brand-dim)' } : undefined}
    >
      {label}
    </button>
  )
}

function ProgressBar({ step }: { step: Step }) {
  const steps = [1, 2, 3]
  const current = step === 'results' ? 3 : (step as number)
  return (
    <div className="flex gap-1.5 mb-8">
      {steps.map(s => (
        <div
          key={s}
          className="h-1 flex-1 rounded-full transition-all duration-300"
          style={{ background: s <= current ? 'var(--brand)' : 'var(--bg-subtle)' }}
        />
      ))}
    </div>
  )
}

function parseAmount(amount: string): number {
  return parseInt(String(amount).replace(/[$,]/g, ''), 10) || 0
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EligibilityQuiz({ scholarships }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 'results'>(1)
  const [grade, setGrade] = useState<StudentProfile['grade'] | ''>('')
  const [city, setCity] = useState('')
  const [targetInstitution, setTargetInstitution] = useState('')
  const [fields, setFields] = useState<string[]>([])
  const [averageBracket, setAverageBracket] = useState<number | null>(null)
  const [identifiesAsFemale, setIdentifiesAsFemale] = useState<boolean | null>(null)
  const [identifiesAsIndigenous, setIdentifiesAsIndigenous] = useState<boolean | null>(null)
  const [identifiesAsBIPOC, setIdentifiesAsBIPOC] = useState<boolean | null>(null)
  const [inFosterCare, setInFosterCare] = useState<boolean | null>(null)
  const [inApprenticeship, setInApprenticeship] = useState<boolean | null>(null)
  const [citizenship, setCitizenship] = useState<StudentProfile['citizenship']>(null)

  function reset() {
    setStep(1); setGrade(''); setCity(''); setTargetInstitution('')
    setFields([]); setAverageBracket(null)
    setIdentifiesAsFemale(null); setIdentifiesAsIndigenous(null); setIdentifiesAsBIPOC(null)
    setInFosterCare(null); setInApprenticeship(null); setCitizenship(null)
  }

  const profile = useMemo((): StudentProfile | null => {
    if (!grade || !city) return null
    return {
      grade: grade as StudentProfile['grade'],
      city,
      schoolBoard: null,
      specificSchool: null,
      targetInstitution: targetInstitution && targetInstitution !== 'Not sure yet' ? targetInstitution : null,
      fields,
      averagePercent: averageBracket,
      identifiesAsFemale,
      identifiesAsIndigenous,
      identifiesAsBIPOC,
      hasFinancialNeed: null,
      familyIncome: null,
      inFosterCare,
      inApprenticeship,
      extracurriculars: [],
      citizenship,
    }
  }, [grade, city, targetInstitution, fields, averageBracket,
      identifiesAsFemale, identifiesAsIndigenous, identifiesAsBIPOC,
      inFosterCare, inApprenticeship, citizenship])

  const results = useMemo(() => {
    if (!profile) return null
    const matched = matchAll(profile, scholarships.map(s => ({
      id: s.id,
      region: s.region,
      eligibility: s.eligibility,
    })))
    const scholarshipMap = new Map(scholarships.map(s => [s.id, s]))
    return matched.map(m => ({
      ...m,
      scholarship: scholarshipMap.get(m.id)!,
    })).filter(m => m.scholarship)
  }, [profile, scholarships])

  const totalAmount = useMemo(() => {
    if (!results) return 0
    return results
      .filter(r => r.tier !== 'possible')
      .reduce((sum, r) => sum + parseAmount(r.scholarship.amount), 0)
  }, [results])

  function toggleField(f: string) {
    setFields(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  function toggleIdentity(current: boolean | null, setter: (v: boolean | null) => void) {
    setter(current === true ? null : true)
  }

  const [savedIds, setSavedIds] = useState<Set<number>>(() => new Set(getSaved()))
  const handleToggleSave = useCallback((id: number, el?: Element | null) => {
    toggleSaved(id)
    const next = new Set(getSaved())
    if (next.has(id)) showConfetti(el)
    setSavedIds(next)
  }, [])

  // ── Step 1 — Where are you at? ──────────────────────────────────────────────

  if (step === 1) {
    return (
      <div>
        <ProgressBar step={1} />
        <h2 className="text-xl font-bold mb-1 text-primary">Where are you at?</h2>
        <p className="text-sm text-secondary mb-6">We'll use this to filter scholarships by grade and location.</p>

        <div className="mb-6">
          <p className="text-sm text-secondary mb-2.5 font-medium">Your grade</p>
          <div className="flex flex-wrap gap-2">
            {GRADE_OPTIONS.map(({ value, label }) => (
              <Chip key={value} label={label} active={grade === value} onClick={() => setGrade(value as StudentProfile['grade'])} />
            ))}
          </div>
          {(grade === '10' || grade === '11') && (
            <div className="mt-3 p-3 rounded-lg border border-amber-400/30 bg-amber-400/8 text-xs text-amber-400/80">
              Most scholarships are for Grade 12 students, so results here will be limited.{' '}
              <a href="/programs" className="underline font-medium">Browse research programs</a>{' '}
              instead; many are open to Grade 10 and 11.
            </div>
          )}
        </div>

        <div className="mb-6">
          <p className="text-sm text-secondary mb-2.5 font-medium">Your city</p>
          <div className="flex flex-wrap gap-2">
            {CITY_OPTIONS.map(c => (
              <Chip key={c} label={c} active={city === c} onClick={() => setCity(c)} />
            ))}
          </div>
        </div>

        <div className="mb-8">
          <p className="text-sm text-secondary mb-2.5 font-medium">Where are you planning to study? <span className="text-tertiary font-normal">(optional)</span></p>
          <div className="flex flex-wrap gap-2">
            {INSTITUTIONS.map(inst => (
              <Chip key={inst} label={inst} active={targetInstitution === inst} onClick={() => setTargetInstitution(prev => prev === inst ? '' : inst)} />
            ))}
          </div>
        </div>

        <button
          onClick={() => setStep(2)}
          disabled={grade === '' || city === ''}
          className="w-full py-3 rounded-xl text-sm font-semibold transition disabled:opacity-30"
          style={{ background: 'var(--brand)', color: '#0a0a0f' }}
        >
          Next →
        </button>
      </div>
    )
  }

  // ── Step 2 — What do you want to study? ────────────────────────────────────

  if (step === 2) {
    return (
      <div>
        <ProgressBar step={2} />
        <h2 className="text-xl font-bold mb-1 text-primary">What do you want to study?</h2>
        <p className="text-sm text-secondary mb-6">Optional: helps surface scholarships specific to your field.</p>

        <div className="mb-6">
          <p className="text-sm text-secondary mb-2.5 font-medium">Field of study</p>
          <div className="flex flex-wrap gap-2">
            {FIELDS.map(({ value, label }) => (
              <Chip key={value} label={label} active={fields.includes(value)} onClick={() => toggleField(value)} />
            ))}
          </div>
        </div>

        <div className="mb-8">
          <p className="text-sm text-secondary mb-2.5 font-medium">Academic average</p>
          <div className="flex flex-wrap gap-2">
            {AVERAGE_BRACKETS.map(({ value, label }) => (
              <Chip key={value} label={label} active={averageBracket === value} onClick={() => setAverageBracket(prev => prev === value ? null : value)} />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-card text-secondary transition">
            ← Back
          </button>
          <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl text-sm font-semibold transition" style={{ background: 'var(--brand)', color: '#0a0a0f' }}>
            Next →
          </button>
        </div>
      </div>
    )
  }

  // ── Step 3 — About you ─────────────────────────────────────────────────────

  if (step === 3) {
    return (
      <div>
        <ProgressBar step={3} />
        <h2 className="text-xl font-bold mb-1 text-primary">About you</h2>
        <p className="text-sm text-secondary mb-1">All optional. Helps surface scholarships made for you specifically.</p>
        <p className="text-xs text-faint mb-6 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Processed on this device only. Never sent anywhere.
        </p>

        <div className="mb-5">
          <p className="text-sm text-secondary mb-2.5 font-medium">I identify as</p>
          <div className="flex flex-wrap gap-2">
            <Chip label="Male" active={identifiesAsFemale === false} onClick={() => setIdentifiesAsFemale(prev => prev === false ? null : false)} />
            <Chip label="Female" active={identifiesAsFemale === true} onClick={() => setIdentifiesAsFemale(prev => prev === true ? null : true)} />
            <Chip label="Indigenous (First Nations, Métis, Inuit)" active={identifiesAsIndigenous === true} onClick={() => toggleIdentity(identifiesAsIndigenous, setIdentifiesAsIndigenous)} />
            <Chip label="Person of colour" active={identifiesAsBIPOC === true} onClick={() => toggleIdentity(identifiesAsBIPOC, setIdentifiesAsBIPOC)} />
          </div>
        </div>

        <div className="mb-8">
          <p className="text-sm text-secondary mb-2.5 font-medium">Citizenship</p>
          <div className="flex flex-wrap gap-2">
            {([
              { value: 'canadian_citizen', label: 'Canadian citizen' },
              { value: 'permanent_resident', label: 'Permanent resident' },
              { value: 'other', label: 'Other / International' },
            ] as { value: StudentProfile['citizenship']; label: string }[]).map(({ value, label }) => (
              <Chip
                key={value as string}
                label={label}
                active={citizenship === value}
                onClick={() => setCitizenship(prev => prev === value ? null : value)}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-card text-secondary transition">
            ← Back
          </button>
          <button
            onClick={() => setStep('results')}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition"
            style={{ background: 'var(--brand)', color: '#0a0a0f' }}
          >
            Find my scholarships →
          </button>
        </div>
      </div>
    )
  }

  // ── Results ────────────────────────────────────────────────────────────────

  if (!results) return null

  const strong   = results.filter(r => r.tier === 'strong')
  const good     = results.filter(r => r.tier === 'good')
  const possible = results.filter(r => r.tier === 'possible')

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm text-secondary mb-1">Based on your profile</p>
        <h2 className="text-2xl font-bold text-primary mb-1">
          {results.length} scholarship{results.length !== 1 ? 's' : ''} found
        </h2>
        {totalAmount > 0 && (
          <p className="font-bold text-brand" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
            Up to ${totalAmount.toLocaleString('en-CA')} available
          </p>
        )}
        <p className="text-xs text-faint mt-1">
          Strong + good matches only. Always verify eligibility on the official site.
        </p>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        {strong.length > 0 && (
          <span className="text-xs px-3 py-1 rounded-full border bg-brand-dim text-brand border-brand-border">
            {strong.length} strong match{strong.length !== 1 ? 'es' : ''}
          </span>
        )}
        {good.length > 0 && (
          <span className="text-xs px-3 py-1 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/30">
            {good.length} good match{good.length !== 1 ? 'es' : ''}
          </span>
        )}
        {possible.length > 0 && (
          <span className="text-xs px-3 py-1 rounded-full border bg-subtle text-tertiary border-card">
            {possible.length} possible
          </span>
        )}
      </div>

      <div className="space-y-3">
        {results.map(({ scholarship: s, tier }) => {
          const style = TIER_STYLES[tier]
          return (
            <div
              key={s.id}
              className="p-4 rounded-xl border border-subtle bg-subtle"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary text-sm leading-snug">{s.title}</p>
                  {s.audience && (
                    <p className="text-xs text-tertiary mt-0.5 line-clamp-1">{s.audience}</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="font-bold text-brand" style={{ fontSize: 18 }}>{s.amount}</p>
                  {s.deadline && (
                    <p className="text-xs text-faint mt-0.5">Due {s.deadline}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${style.badge}`}>
                  {style.label}
                </span>
                <div className="flex items-center gap-3">
                  <a
                    href={`/scholarships/${generateSlug(s.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-secondary hover:text-primary transition"
                  >
                    Details
                  </a>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-brand transition hover:opacity-80"
                  >
                    Apply →
                  </a>
                  <button
                    onClick={(e) => handleToggleSave(s.id, e.currentTarget)}
                    aria-label={savedIds.has(s.id) ? 'Remove from saved' : 'Save scholarship'}
                    className={`flex items-center justify-center flex-shrink-0 transition-all duration-150 rounded-lg cursor-pointer ${
                      savedIds.has(s.id)
                        ? 'text-brand border border-brand-border'
                        : 'text-secondary border border-card'
                    }`}
                    style={{ width: 28, height: 28, background: savedIds.has(s.id) ? 'var(--brand-dim)' : undefined }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={savedIds.has(s.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {results.length === 0 && (
        <div className="text-center py-12 px-4">
          <p className="text-3xl mb-4">🔍</p>
          <p className="font-semibold text-primary mb-2">No scholarships matched your profile</p>
          <p className="text-sm text-secondary mb-6 max-w-sm mx-auto">
            Try leaving optional fields blank. Average and identity answers narrow results significantly.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition"
            style={{ background: 'var(--brand)', color: '#0a0a0f' }}
          >
            Try again
          </button>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-subtle flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-card text-secondary transition"
        >
          Start over
        </button>
        <a
          href="/scholarships"
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition"
          style={{ background: 'var(--brand)', color: '#0a0a0f' }}
        >
          Browse all scholarships
        </a>
      </div>
    </div>
  )
}
