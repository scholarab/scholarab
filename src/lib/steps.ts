// Per-listing application-step ticks, the one bit of app state that is the
// student's own work rather than a fact about a listing.
//
// Shaped like tracker.ts (in-memory cache, invalidated when another tab
// writes), but the value is a map rather than an id list: a listing's ticks
// have to outlive un-saving and re-saving it. Someone who ticks three steps,
// removes the award, then puts it back should not lose the three ticks.
//
// STEP_COUNT and the two flag helpers below came from app-core.ts, which was
// deleted with /app. This is the only module that reads them.

export const STEPS_KEY = 'scholarab_app_steps'

/** The four things a student does before submitting. */
export const STEP_COUNT = 4

/**
 * Coerce stored ticks to exactly STEP_COUNT booleans. Anything unreadable reads
 * as untouched: an unticked step is the safe default, since the student can see
 * at a glance that it is wrong and fix it with one tap, whereas a spuriously
 * ticked one quietly tells them work is done that isn't.
 */
export function normalizeStepFlags(raw: unknown): boolean[] {
  const arr = Array.isArray(raw) ? raw : []
  return Array.from({ length: STEP_COUNT }, (_, i) => arr[i] === true)
}

export function stepsDone(flags: readonly boolean[]): number {
  return flags.filter(Boolean).length
}

/** id → exactly STEP_COUNT booleans. Ids with nothing ticked are not stored. */
export type StepMap = Record<number, boolean[]>

let cache: StepMap | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === STEPS_KEY) cache = null
  })
}

/**
 * Drop anything that isn't a numeric id pointing at real ticks. Entries with
 * every step false are pruned: they are indistinguishable from never having
 * been touched, and keeping them grows the row forever as a student browses.
 */
function normalizeMap(raw: unknown): StepMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: StepMap = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d+$/.test(k)) continue
    const flags = normalizeStepFlags(v)
    if (stepsDone(flags) > 0) out[Number(k)] = flags
  }
  return out
}

function read(): StepMap {
  if (cache === null) {
    try {
      const raw = JSON.parse(localStorage.getItem(STEPS_KEY) || '{}') as unknown
      cache = normalizeMap(raw)
    } catch {
      cache = {}
    }
  }
  return cache
}

function write(map: StepMap): void {
  cache = map
  try {
    localStorage.setItem(STEPS_KEY, JSON.stringify(map))
  } catch {
    // Private-mode / quota. The ticks stay in `cache` for this session so the
    // UI still responds; only persistence across a reload is lost.
  }
}

/** Ticks for one listing — always STEP_COUNT booleans, never null. */
export function getSteps(id: number): boolean[] {
  return normalizeStepFlags(read()[id])
}

/** Flip one step and persist. Returns the listing's new ticks. */
export function toggleStep(id: number, index: number): boolean[] {
  if (!Number.isInteger(index) || index < 0 || index >= STEP_COUNT) return getSteps(id)
  const next = getSteps(id)
  next[index] = !next[index]
  const map = { ...read() }
  if (stepsDone(next) > 0) map[id] = next
  else delete map[id]
  write(map)
  return next
}

/**
 * Steps ticked across the given ids — the Saved tab's "steps you've done".
 *
 * Counts only the ids passed in, so removing an award drops it out of the total
 * without discarding its ticks: put it back and the count comes back too.
 */
export function totalStepsDone(ids: readonly number[]): number {
  const map = read()
  return ids.reduce((sum, id) => sum + stepsDone(normalizeStepFlags(map[id])), 0)
}
