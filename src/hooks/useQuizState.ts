import { useState, useEffect } from 'react'
import type { StudentProfile } from '../lib/eligibility-types'

type Step = 1 | 2 | 3 | 'results'

const STORAGE_KEY = 'scholarab-quiz'

function loadSaved() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}

export interface QuizState {
  step: Step
  grade: StudentProfile['grade'] | ''
  city: string
  targetInstitution: string
  fields: string[]
  averageBracket: number | null
  identifiesAsFemale: boolean | null
  identifiesAsIndigenous: boolean | null
  identifiesAsBIPOC: boolean | null
  inFosterCare: boolean | null
  inApprenticeship: boolean | null
  citizenship: StudentProfile['citizenship']
}

export interface QuizStateSetters {
  setStep: (v: Step) => void
  setGrade: (v: StudentProfile['grade'] | '') => void
  setCity: (v: string) => void
  setTargetInstitution: (v: string) => void
  setFields: (v: string[] | ((prev: string[]) => string[])) => void
  setAverageBracket: (v: number | null | ((prev: number | null) => number | null)) => void
  setIdentifiesAsFemale: (v: boolean | null | ((prev: boolean | null) => boolean | null)) => void
  setIdentifiesAsIndigenous: (v: boolean | null | ((prev: boolean | null) => boolean | null)) => void
  setIdentifiesAsBIPOC: (v: boolean | null | ((prev: boolean | null) => boolean | null)) => void
  setInFosterCare: (v: boolean | null) => void
  setInApprenticeship: (v: boolean | null) => void
  setCitizenship: (v: StudentProfile['citizenship'] | ((prev: StudentProfile['citizenship']) => StudentProfile['citizenship'])) => void
  reset: () => void
}

export function useQuizState(): QuizState & QuizStateSetters {
  const s = loadSaved()

  const [step, setStep] = useState<Step>(s?.step ?? 1)
  const [grade, setGrade] = useState<StudentProfile['grade'] | ''>(s?.grade ?? '')
  const [city, setCity] = useState<string>(s?.city ?? '')
  const [targetInstitution, setTargetInstitution] = useState<string>(s?.targetInstitution ?? '')
  const [fields, setFields] = useState<string[]>(s?.fields ?? [])
  const [averageBracket, setAverageBracket] = useState<number | null>(s?.averageBracket ?? null)
  const [identifiesAsFemale, setIdentifiesAsFemale] = useState<boolean | null>(s?.identifiesAsFemale ?? null)
  const [identifiesAsIndigenous, setIdentifiesAsIndigenous] = useState<boolean | null>(s?.identifiesAsIndigenous ?? null)
  const [identifiesAsBIPOC, setIdentifiesAsBIPOC] = useState<boolean | null>(s?.identifiesAsBIPOC ?? null)
  const [inFosterCare, setInFosterCare] = useState<boolean | null>(s?.inFosterCare ?? null)
  const [inApprenticeship, setInApprenticeship] = useState<boolean | null>(s?.inApprenticeship ?? null)
  const [citizenship, setCitizenship] = useState<StudentProfile['citizenship']>(s?.citizenship ?? null)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        step, grade, city, targetInstitution, fields, averageBracket,
        identifiesAsFemale, identifiesAsIndigenous, identifiesAsBIPOC,
        inFosterCare, inApprenticeship, citizenship,
      }))
    } catch {}
  }, [step, grade, city, targetInstitution, fields, averageBracket,
      identifiesAsFemale, identifiesAsIndigenous, identifiesAsBIPOC,
      inFosterCare, inApprenticeship, citizenship])

  function reset() {
    try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
    setStep(1); setGrade(''); setCity(''); setTargetInstitution('');
    setFields([]); setAverageBracket(null);
    setIdentifiesAsFemale(null); setIdentifiesAsIndigenous(null); setIdentifiesAsBIPOC(null);
    setInFosterCare(null); setInApprenticeship(null); setCitizenship(null)
  }

  return {
    step, grade, city, targetInstitution, fields, averageBracket,
    identifiesAsFemale, identifiesAsIndigenous, identifiesAsBIPOC,
    inFosterCare, inApprenticeship, citizenship,
    setStep, setGrade, setCity, setTargetInstitution, setFields, setAverageBracket,
    setIdentifiesAsFemale, setIdentifiesAsIndigenous, setIdentifiesAsBIPOC,
    setInFosterCare, setInApprenticeship, setCitizenship,
    reset,
  }
}
