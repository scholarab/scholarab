// Framework-free filtering/sorting/status logic for the public directories.
// Shared by the directory page scripts and the eligibility quiz.
import { getToday } from './utils.ts';
import type { Scholarship, Program } from './data-loader.ts';

// ── Scholarships ──────────────────────────────────────────────────────────────

export interface ScholarshipWithMeta extends Scholarship {
  _open_ms?: number;
  _deadline_ms?: number;
  _amount?: number;
  _slug?: string;
  _deadline_formatted?: string | null;
}

export type ScholarshipStatus = 'active' | 'future' | 'closed';
export type StatusFilter = 'all' | 'active' | 'opening' | 'closed';

export function getScholarshipStatus(s: ScholarshipWithMeta): ScholarshipStatus {
  const todayMs = getToday().getTime();
  const openMs  = s._open_ms ?? new Date((s.openDate || '1970-01-01') + 'T00:00:00').getTime();
  if (todayMs < openMs) return 'future';
  // `||` on purpose: _deadline_ms of 0 means "no deadline" → Infinity, never a 1970 cutoff
  const deadMs  = s._deadline_ms || (s.deadline ? new Date(s.deadline + 'T00:00:00').getTime() : Infinity);
  if (todayMs > deadMs) return 'closed';
  return 'active';
}

// Everything except National/International counts as provincial — keep in sync with data regions.
const PROVINCIAL_REGIONS = new Set(['Alberta', 'Alberta-wide', 'Calgary', 'Edmonton', 'Lethbridge', 'Medicine Hat', 'Red Deer']);
export type RegionKey = 'Alberta-wide' | 'Medicine Hat' | 'National';
export const REGION_MATCH: Record<RegionKey, (s: ScholarshipWithMeta) => boolean> = {
  'Alberta-wide': s => PROVINCIAL_REGIONS.has(s.region ?? ''),
  'Medicine Hat': s => s.region === 'Medicine Hat',
  'National':     s => s.region === 'National',
};
export type ScholarshipSort = 'closest_due' | 'highest_pay' | 'lowest_pay';

export interface ScholarshipFilterState {
  statusFilter: StatusFilter;
  selectedCategory: string;
  selectedRegion: RegionKey | null;
  searchQuery: string;
  sortBy: ScholarshipSort;
}

function buildScholarshipStatusCache(items: ScholarshipWithMeta[]): Map<number, ScholarshipStatus> {
  const m = new Map<number, ScholarshipStatus>();
  for (const s of items) m.set(s.id, getScholarshipStatus(s));
  return m;
}

export function filterSortScholarships(
  initialScholarships: ScholarshipWithMeta[],
  { statusFilter, selectedCategory, selectedRegion, searchQuery, sortBy }: ScholarshipFilterState,
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
    : afterCategory.filter(REGION_MATCH[selectedRegion]);
  const q = searchQuery.trim().toLowerCase();
  const afterSearch = q === ''
    ? afterRegion
    : afterRegion.filter(s =>
        (s.title?.toLowerCase().includes(q)) ||
        (s.audience?.toLowerCase().includes(q)) ||
        (s.category?.toLowerCase().includes(q))
      );

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
  return { label, cls: `sabl-days${days <= 7 ? ' urgent' : ''}` };
}

// ── Programs ──────────────────────────────────────────────────────────────────

export interface ProgramWithMeta extends Program {
  _deadline_ms?: number;
  _slug?: string;
}

// "Grades 9–12", "9-12", "Grade 11", "Grade 12 (graduating)" → range/single match.
// "High school", "Ages 13–18", and anything unparseable count as inclusive —
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

export interface ProgramFilterState {
  selectedCategory: string;
  gradeFilter: number | null;
  searchQuery: string;
  sortBy: ProgramSort;
}

function buildProgramStatusCache(items: ProgramWithMeta[]): Map<number, ProgramStatus> {
  const m = new Map<number, ProgramStatus>();
  for (const p of items) m.set(p.id, getProgramStatus(p));
  return m;
}

export function filterSortPrograms(
  initialPrograms: ProgramWithMeta[],
  { selectedCategory, gradeFilter, searchQuery, sortBy }: ProgramFilterState,
  statusCache: Map<number, ProgramStatus> = buildProgramStatusCache(initialPrograms),
): ProgramWithMeta[] {
  const nonClosed = initialPrograms.filter(p => statusCache.get(p.id) !== 'closed');
  const afterCategory = selectedCategory === 'all'
    ? nonClosed
    : nonClosed.filter(p => p.category === selectedCategory);
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

  return [...afterSearch].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'paid_first') {
      const paidDiff = (b.paid ? 1 : 0) - (a.paid ? 1 : 0);
      if (paidDiff !== 0) return paidDiff;
    }
    return programDeadlineOrder(a) - programDeadlineOrder(b);
  });
}
