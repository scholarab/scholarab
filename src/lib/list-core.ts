// Framework-free filtering/sorting/status logic for the public directories.
// Shared by the directory page scripts and the eligibility quiz.
import { getToday } from './utils.ts';
import { scholarshipStatusOf } from './status.ts';
import type { ScholarshipStatus } from './status.ts';
import type { Scholarship, Program } from './data-loader.ts';

// ── Scholarships ──────────────────────────────────────────────────────────────

export interface ScholarshipWithMeta extends Scholarship {
  _open_ms?: number;
  _deadline_ms?: number;
  _amount?: number;
  _slug?: string;
  _deadline_formatted?: string | null;
}

export type { ScholarshipStatus };
export type StatusFilter = 'all' | 'active' | 'opening' | 'closed';

export function getScholarshipStatus(s: ScholarshipWithMeta): ScholarshipStatus {
  return scholarshipStatusOf(s, getToday(), { openMs: s._open_ms, deadlineMs: s._deadline_ms });
}

// Everything except National/International counts as provincial; keep in sync with data regions.
const PROVINCIAL_REGIONS = new Set(['Alberta', 'Alberta-wide', 'Airdrie', 'Brooks', 'Calgary', 'Edmonton', 'Lethbridge', 'Medicine Hat', 'Red Deer', 'St. Albert']);

/**
 * A scope chip's value. Two of these are rollups; every other key is a literal
 * `region` value from the data.
 *
 * This used to be a closed union of three keys with a hand-written matcher per
 * key, which meant adding a city hub gave the city a landing page and a guide
 * link but left it unreachable from the directory's own chips -- forty-one
 * Calgary, Edmonton, Red Deer and Lethbridge awards sat behind a filter that
 * had no button. The chips are now derived from the facet registry, so a new
 * city hub brings its chip with it in the same commit.
 */
export type RegionKey = string;

export function regionMatches(key: RegionKey, s: ScholarshipWithMeta): boolean {
  if (key === 'Alberta-wide') return PROVINCIAL_REGIONS.has(s.region ?? '');
  // International awards open to Canadians live under the National chip;
  // without this they'd be unreachable from any region filter.
  if (key === 'National') return s.region === 'National' || s.region === 'International';
  return s.region === key;
}
export type ScholarshipSort = 'closest_due' | 'highest_pay' | 'lowest_pay';

export interface ScholarshipFilterState {
  statusFilter: StatusFilter;
  selectedCategory: string;
  selectedRegion: RegionKey | null;
  searchQuery: string;
  sortBy: ScholarshipSort;
}

export function buildScholarshipStatusCache(items: ScholarshipWithMeta[]): Map<number, ScholarshipStatus> {
  const m = new Map<number, ScholarshipStatus>();
  for (const s of items) m.set(s.id, getScholarshipStatus(s));
  return m;
}

/**
 * The view a reader gets before touching a single control.
 *
 * It was written out inline in ScholarshipDirectory, which was fine while the
 * component was the only caller. /scholarships now also emits an ItemList of
 * the same listings, and an ItemList whose order disagrees with the order on
 * the page is markup contradicting the document. One constant, so they cannot.
 */
export const DEFAULT_SCHOLARSHIP_STATE: ScholarshipFilterState = {
  statusFilter: 'all',
  selectedCategory: 'all',
  selectedRegion: null,
  searchQuery: '',
  sortBy: 'closest_due',
};

/**
 * Everything the filters keep, in the data's own order.
 *
 * Split out of filterSortScholarships because the chip counts need the size of
 * this set and nothing else: sorting to obtain a number is work thrown away,
 * and the count row asks for it once per chip on every keystroke.
 */
export function selectScholarships(
  initialScholarships: ScholarshipWithMeta[],
  { statusFilter, selectedCategory, selectedRegion, searchQuery }: ScholarshipFilterState,
  statusCache: Map<number, ScholarshipStatus> = buildScholarshipStatusCache(initialScholarships),
): ScholarshipWithMeta[] {
  const pool = statusFilter === 'closed'
    ? initialScholarships.filter(s => statusCache.get(s.id) === 'closed')
    : statusFilter === 'opening'
      ? initialScholarships.filter(s => statusCache.get(s.id) === 'future')
      : statusFilter === 'active'
        ? initialScholarships.filter(s => statusCache.get(s.id) === 'active')
        : initialScholarships;

  const afterCategory = selectedCategory === 'all'
    ? pool
    : pool.filter(s => s.category === selectedCategory);
  const afterRegion = selectedRegion === null
    ? afterCategory
    : afterCategory.filter(s => regionMatches(selectedRegion, s));
  const q = searchQuery.trim().toLowerCase();
  const afterSearch = q === ''
    ? afterRegion
    : afterRegion.filter(s =>
        (s.title?.toLowerCase().includes(q)) ||
        (s.audience?.toLowerCase().includes(q)) ||
        (s.category?.toLowerCase().includes(q))
      );

  return afterSearch;
}

export function filterSortScholarships(
  initialScholarships: ScholarshipWithMeta[],
  state: ScholarshipFilterState,
  statusCache: Map<number, ScholarshipStatus> = buildScholarshipStatusCache(initialScholarships),
): ScholarshipWithMeta[] {
  const afterSearch = selectScholarships(initialScholarships, state, statusCache);
  const { sortBy } = state;
  const rank = { active: 0, future: 1, closed: 2 } as Record<string, number>;
  return [...afterSearch].sort((a, b) => {
    const aStatus = statusCache.get(a.id) ?? 'active';
    const bStatus = statusCache.get(b.id) ?? 'active';
    // active first → future → closed, for every sort (so expired entries don't bury open ones)
    const statusDiff = (rank[aStatus] ?? 0) - (rank[bStatus] ?? 0);
    if (statusDiff !== 0) return statusDiff;

    if (sortBy === 'highest_pay' || sortBy === 'lowest_pay') {
      const aAmt = a._amount ?? 0;
      const bAmt = b._amount ?? 0;
      // unparseable amounts ("Varies") go last within their status group
      if ((aAmt === 0) !== (bAmt === 0)) return aAmt === 0 ? 1 : -1;
      if (aAmt !== bAmt) return sortBy === 'highest_pay' ? bAmt - aAmt : aAmt - bAmt;
      return (a._deadline_ms || Infinity) - (b._deadline_ms || Infinity);
    }

    // closest_due
    if (aStatus === 'closed') return (b._deadline_ms || 0) - (a._deadline_ms || 0); // most recently expired first
    if (aStatus === 'future') return (a._open_ms || Infinity) - (b._open_ms || Infinity); // opening soonest first
    return (a._deadline_ms || Infinity) - (b._deadline_ms || Infinity);
  });
}

// How loud a "N DAYS LEFT" chip gets. One week was the only tier, which made a
// 9-day deadline and a 300-day one look identical; on a grid where most
// listings are months out, everything shouted and nothing did. Two weeks is
// "start now", six weeks is "on your radar", past that is just information.
export const URGENT_DAYS = 14;
export const SOON_DAYS = 45;

export function daysLeftClass(days: number): string {
  if (days <= URGENT_DAYS) return 'sabl-days urgent';
  if (days <= SOON_DAYS) return 'sabl-days soon';
  return 'sabl-days';
}

// ── Grid grouping ─────────────────────────────────────────────────────────────
// The directory sorts open listings above ones that have not opened yet and
// closed ones below both, but nothing marked the seams, so 153 cards read as
// one undifferentiated wall and the ~75% you cannot act on today looked exactly
// like the ~25% you can. These labels name the seams.
//
// The key MUST be the sort's primary key, or a group would appear twice: every
// scholarship sort ranks by status first, so status is safe. Programs only
// guarantee closed-last, so they group open-vs-closed and nothing finer.

export const SCHOLARSHIP_GROUP_LABELS: Record<string, string> = {
  active: 'OPEN NOW',
  future: 'OPENING LATER',
  closed: 'CLOSED',
};

export const PROGRAM_GROUP_LABELS: Record<string, string> = {
  open: 'OPEN NOW',
  closed: 'CLOSED',
};

export function scholarshipGroupKey(s: ScholarshipWithMeta): string {
  return getScholarshipStatus(s);
}

export function programGroupKey(p: ProgramWithMeta): string {
  return getProgramStatus(p) === 'closed' ? 'closed' : 'open';
}

/** [{key, label, count}] in display order, for a list already in display order. */
export function groupRuns<T>(items: T[], keyOf: (item: T) => string, labels: Record<string, string>)
  : Array<{ key: string; label: string; count: number }> {
  const runs: Array<{ key: string; label: string; count: number }> = [];
  for (const it of items) {
    const key = keyOf(it);
    const last = runs[runs.length - 1];
    if (last && last.key === key) last.count++;
    else runs.push({ key, label: labels[key] ?? key.toUpperCase(), count: 1 });
  }
  return runs;
}

/**
 * The line above the grid. "153 OF 153 LISTINGS SHOWN" was true and useless;
 * it counted a wall of cards without saying how much of it a student could act
 * on today, which on this directory is about a quarter.
 */
export function directoryCountLine(shown: number, total: number, noun: string, openNow: number): string {
  // Suppressed when everything shown is already open; "117 OF 117 PROGRAMS ·
  // 117 OPEN NOW" is the same number three times. The clause earns its place
  // only where it contradicts the first one, which is the whole point of it.
  const line = `${shown} OF ${total} ${noun}`;
  return openNow === shown ? line : `${line} · ${openNow} OPEN NOW`;
}

export function shortDate(iso: string): string {
  return new Date(iso + 'T00:00:00')
    .toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    .toUpperCase();
}

// The corner chip on a scholarship card ("14 DAYS LEFT" / "OPENS SEP 1" /
// "CLOSED"); null means no chip (open listing with no fixed deadline).
// Clock-dependent, so the client recomputes it on every page load.
export function scholarshipDayChip(s: ScholarshipWithMeta): { label: string; cls: string } | null {
  const status = getScholarshipStatus(s);
  if (status === 'closed') return { label: 'CLOSED', cls: 'sabl-days neutral' };
  if (status === 'future') {
    return { label: s.openDate ? `OPENS ${shortDate(s.openDate)}` : 'OPENING SOON', cls: 'sabl-days neutral' };
  }
  if (!s.deadline) return null;
  const days = Math.max(0, Math.round((new Date(s.deadline + 'T00:00:00').getTime() - getToday().getTime()) / 86400000));
  const label = days === 0 ? 'DUE TODAY' : `${days} ${days === 1 ? 'DAY' : 'DAYS'} LEFT`;
  return { label, cls: daysLeftClass(days) };
}

// ── Programs ──────────────────────────────────────────────────────────────────

export interface ProgramWithMeta extends Program {
  _deadline_ms?: number;
  _slug?: string;
}

// "Grades 9–12", "9-12", "Grade 11", "Grade 12 (graduating)" → range/single match.
// "High school", "Ages 13–18", and anything unparseable count as inclusive;
// better to show a listing the student can rule out than to hide one they can't see.
export function programMatchesGrade(gradesText: string | null, grade: number): boolean {
  if (!gradesText) return true;
  const range = gradesText.match(/(\d{1,2})\s*[–-]\s*(\d{1,2})/);
  if (range) {
    const lo = parseInt(range[1]!, 10);
    const hi = parseInt(range[2]!, 10);
    if (hi <= 12) return grade >= lo && grade <= hi; // grades, not ages
  }
  const single = gradesText.match(/grade\s*(\d{1,2})/i);
  if (single && !range) {
    const g = parseInt(single[1]!, 10);
    if (g <= 12) return grade === g;
  }
  return true;
}

export type ProgramStatus = 'active' | 'tba' | 'closed';

export function getProgramStatus(p: ProgramWithMeta): ProgramStatus {
  if (!p.deadline || p.deadline === 'TBA' || p.deadline === 'Ongoing') return 'tba';
  const deadMs = p._deadline_ms ?? new Date(p.deadline + 'T00:00:00').getTime();
  if (getToday().getTime() > deadMs) return 'closed';
  return 'active';
}

// The corner chip on a program card; the scholarship chip's twin, so both
// directories read the same. Clock-dependent, so the client recomputes it on
// every page load rather than trusting CDN-cached HTML.
export function programDayChip(p: ProgramWithMeta): { label: string; cls: string } | null {
  const status = getProgramStatus(p);
  if (status === 'closed') return { label: 'CLOSED', cls: 'sabl-days neutral' };
  if (status === 'tba') {
    return p.deadline === 'Ongoing'
      ? { label: 'ONGOING', cls: 'sabl-days neutral' }
      : { label: 'DEADLINE TBA', cls: 'sabl-days neutral' };
  }
  const deadMs = p._deadline_ms ?? new Date(p.deadline! + 'T00:00:00').getTime();
  const days = Math.max(0, Math.round((deadMs - getToday().getTime()) / 86400000));
  const label = days === 0 ? 'DUE TODAY' : `${days} ${days === 1 ? 'DAY' : 'DAYS'} LEFT`;
  return { label, cls: daysLeftClass(days) };
}

export type ProgramSort = 'closest_due' | 'paid_first' | 'name';

// dated deadlines first (soonest), then Ongoing (actionable any time), then TBA
function programDeadlineOrder(p: ProgramWithMeta): number {
  if (typeof p._deadline_ms === 'number') return p._deadline_ms;
  if (p.deadline && p.deadline !== 'TBA' && p.deadline !== 'Ongoing') {
    const ms = new Date(p.deadline + 'T00:00:00').getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return p.deadline === 'Ongoing' ? Number.MAX_SAFE_INTEGER - 1 : Number.MAX_SAFE_INTEGER;
}

// 'open' is the historical behaviour (closed programs never surface); the
// directory passes an explicit value so its STATUS chips can reach them.
export type ProgramStatusFilter = 'all' | 'open' | 'active' | 'tba' | 'closed';

export interface ProgramFilterState {
  selectedCategory: string;
  gradeFilter: number | null;
  searchQuery: string;
  sortBy: ProgramSort;
  statusFilter?: ProgramStatusFilter;
}

export function buildProgramStatusCache(items: ProgramWithMeta[]): Map<number, ProgramStatus> {
  const m = new Map<number, ProgramStatus>();
  for (const p of items) m.set(p.id, getProgramStatus(p));
  return m;
}

/** The program twin of DEFAULT_SCHOLARSHIP_STATE; see that comment. */
export const DEFAULT_PROGRAM_STATE: ProgramFilterState = {
  selectedCategory: 'all',
  gradeFilter: null,
  searchQuery: '',
  sortBy: 'closest_due',
  statusFilter: 'all',
};

/** The program twin of selectScholarships; see that comment. */
export function selectPrograms(
  initialPrograms: ProgramWithMeta[],
  { selectedCategory, gradeFilter, searchQuery, statusFilter = 'open' }: ProgramFilterState,
  statusCache: Map<number, ProgramStatus> = buildProgramStatusCache(initialPrograms),
): ProgramWithMeta[] {
  const afterStatus = statusFilter === 'all'
    ? initialPrograms
    : initialPrograms.filter(p => {
        const status = statusCache.get(p.id);
        return statusFilter === 'open' ? status !== 'closed' : status === statusFilter;
      });
  const afterCategory = selectedCategory === 'all'
    ? afterStatus
    : afterStatus.filter(p => p.category === selectedCategory);
  const afterGrade = gradeFilter === null
    ? afterCategory
    : afterCategory.filter(p => programMatchesGrade(p.grades, gradeFilter));
  const q = searchQuery.trim().toLowerCase();
  const afterSearch = q === ''
    ? afterGrade
    : afterGrade.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.provider?.toLowerCase().includes(q)) ||
        (p.description?.toLowerCase().includes(q)) ||
        (p.category?.toLowerCase().includes(q))
      );

  return afterSearch;
}

export function filterSortPrograms(
  initialPrograms: ProgramWithMeta[],
  state: ProgramFilterState,
  statusCache: Map<number, ProgramStatus> = buildProgramStatusCache(initialPrograms),
): ProgramWithMeta[] {
  const afterSearch = selectPrograms(initialPrograms, state, statusCache);
  const { sortBy } = state;
  const rank = { active: 0, tba: 1, closed: 2 } as Record<string, number>;
  return [...afterSearch].sort((a, b) => {
    const aStatus = statusCache.get(a.id) ?? 'active';
    const bStatus = statusCache.get(b.id) ?? 'active';
    // Closed programs sink below open ones in every sort; same rule as
    // scholarships, so a past deadline can never head the list.
    if (aStatus === 'closed' || bStatus === 'closed') {
      const statusDiff = (rank[aStatus] ?? 0) - (rank[bStatus] ?? 0);
      if (statusDiff !== 0) return statusDiff;
      // within the closed group: most recently expired first
      if (aStatus === 'closed' && sortBy === 'closest_due') {
        return programDeadlineOrder(b) - programDeadlineOrder(a);
      }
    }

    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'paid_first') {
      const paidDiff = (b.paid ? 1 : 0) - (a.paid ? 1 : 0);
      if (paidDiff !== 0) return paidDiff;
    }
    return programDeadlineOrder(a) - programDeadlineOrder(b);
  });
}
