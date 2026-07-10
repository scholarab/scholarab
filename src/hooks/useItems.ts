import { useState, useEffect, useMemo, useCallback } from 'react';
import { getSaved, toggleSaved, getSavedPrograms, toggleSavedProgram } from '../lib/tracker.ts';
import { getToday } from '../lib/utils.ts';
import type { Scholarship, Program } from '../lib/data-loader.ts';
import { PUBLIC_PAGE_SIZE } from '../lib/constants';

export const PAGE_SIZE = PUBLIC_PAGE_SIZE;

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
  const deadMs  = s._deadline_ms || (s.deadline ? new Date(s.deadline + 'T00:00:00').getTime() : Infinity);
  if (todayMs > deadMs) return 'closed';
  return 'active';
}

// Everything except National/International counts as provincial — keep in sync with data regions.
const PROVINCIAL_REGIONS = new Set(['Alberta', 'Alberta-wide', 'Calgary', 'Edmonton', 'Lethbridge', 'Medicine Hat', 'Red Deer']);
type RegionKey = 'Alberta-wide' | 'Medicine Hat' | 'National';
const REGION_MATCH: Record<RegionKey, (s: ScholarshipWithMeta) => boolean> = {
  'Alberta-wide': s => PROVINCIAL_REGIONS.has(s.region ?? ''),
  'Medicine Hat': s => s.region === 'Medicine Hat',
  'National':     s => s.region === 'National',
};
type ScholarshipSort = 'closest_due' | 'highest_pay' | 'lowest_pay';

export function useScholarships(initialScholarships: ScholarshipWithMeta[]) {
  const [sortBy,         setSortBy        ] = useState<ScholarshipSort>('closest_due');
  const [selectedRegion, setSelectedRegion] = useState<RegionKey | null>(null);
  const [selectedCategory, setSelectedCategoryRaw] = useState('all');
  const [statusFilter,   setStatusFilterRaw] = useState<StatusFilter>('all');
  const [searchQuery,    setSearchQueryRaw] = useState('');
  const [page,           setPage          ] = useState(1);
  const [sheetOpen,      setSheetOpen     ] = useState(false);
  const [savedIds,       setSavedIds      ] = useState<number[]>([]);
  const [hasFiltered,    setHasFiltered   ] = useState(false);

  const setCategory = useCallback((cat: string) => {
    setHasFiltered(true);
    // Clicking the selected category toggles it off (matches Programs behaviour)
    setSelectedCategoryRaw(prev => (cat !== 'all' && prev === cat ? 'all' : cat));
    setPage(1);
  }, []);

  const setStatusFilter = useCallback((s: StatusFilter) => {
    setHasFiltered(true);
    setStatusFilterRaw(s);
    setPage(1);
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    setHasFiltered(true);
    setSearchQueryRaw(q);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSortBy('closest_due');
    setSelectedRegion(null);
    setSelectedCategoryRaw('all');
    setStatusFilterRaw('all');
    setSearchQueryRaw('');
    setPage(1);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedIds([...getSaved()]);
  }, []);

  // Apply ?category= after mount instead of in the initial state: the page is
  // prerendered unfiltered, so reading the URL during init makes hydration
  // tear the cards over to the filtered set. Applying it here keeps first
  // paint identical to the HTML, then animates into the filter.
  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get('category');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cat) setCategory(cat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleSave = useCallback((id: number) => {
    const newSaved = toggleSaved(id);
    setSavedIds([...newSaved]);
  }, []);

  const toggleRegion = useCallback((region: RegionKey | null) => {
    const next = region === null ? null : (selectedRegion === region ? null : region);
    setHasFiltered(true);
    setSelectedRegion(next);
    setPage(1);
  }, [selectedRegion]);

  const handleSetSort = useCallback((value: ScholarshipSort) => {
    setHasFiltered(true);
    setSortBy(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setHasFiltered(true);
    setPage(newPage);
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' })));
  }, []);

  const statusCache = useMemo(() => {
    const m = new Map<number, ScholarshipStatus>();
    for (const s of initialScholarships) m.set(s.id, getScholarshipStatus(s));
    return m;
  }, [initialScholarships]);

  const filtered = useMemo(() => {
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
  }, [initialScholarships, statusCache, statusFilter, selectedRegion, selectedCategory, searchQuery, sortBy]);

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage     = Math.min(page, totalPages);
  const visibleItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return {
    filtered,
    visibleItems,
    page: safePage,
    totalPages,
    handlePageChange,
    sortBy,
    setSort:          handleSetSort,
    selectedRegion,
    setRegion:        toggleRegion,
    sheetOpen,
    setSheetOpen,
    selectedCategory,
    setCategory,
    clearFilters,
    hasActiveFilters: sortBy !== 'closest_due' || selectedRegion !== null || selectedCategory !== 'all' || statusFilter !== 'all' || searchQuery !== '',
    regionKey:        selectedRegion ?? '',
    categoryKey:      selectedCategory,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    savedIds,
    handleToggleSave,
    isFiltered:       hasFiltered,
  };
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

export function usePrograms(initialPrograms: ProgramWithMeta[]) {
  const [sortBy,           setSortBy          ] = useState<ProgramSort>('closest_due');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [gradeFilter,      setGradeFilterRaw  ] = useState<number | null>(null);
  const [searchQuery,      setSearchQueryRaw  ] = useState('');
  const [page,             setPage            ] = useState(1);
  const [sheetOpen,        setSheetOpen        ] = useState(false);
  const [savedIds,         setSavedIds         ] = useState<number[]>([]);
  const [hasFiltered,      setHasFiltered      ] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedIds([...getSavedPrograms()]);
  }, []);

  const handleToggleSave = useCallback((id: number) => {
    const newSaved = toggleSavedProgram(id);
    setSavedIds([...newSaved]);
  }, []);

  const handleSetCategory = useCallback((cat: string) => {
    const next = cat === 'all' ? 'all' : (selectedCategory === cat ? 'all' : cat);
    setHasFiltered(true);
    setSelectedCategory(next);
    setPage(1);
  }, [selectedCategory]);

  const setGradeFilter = useCallback((g: number | null) => {
    setHasFiltered(true);
    // Clicking the selected grade toggles it off (matches category behaviour)
    setGradeFilterRaw(prev => (g !== null && prev === g ? null : g));
    setPage(1);
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    setHasFiltered(true);
    setSearchQueryRaw(q);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSortBy('closest_due');
    setSelectedCategory('all');
    setGradeFilterRaw(null);
    setSearchQueryRaw('');
    setPage(1);
  }, []);

  const handleSetSort = useCallback((value: ProgramSort) => {
    setHasFiltered(true);
    setSortBy(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setHasFiltered(true);
    setPage(newPage);
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' })));
  }, []);

  const statusCache = useMemo(() => {
    const m = new Map<number, ProgramStatus>();
    for (const p of initialPrograms) m.set(p.id, getProgramStatus(p));
    return m;
  }, [initialPrograms]);

  const filtered = useMemo(() => {
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
  }, [initialPrograms, selectedCategory, gradeFilter, searchQuery, statusCache, sortBy]);

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage     = Math.min(page, totalPages);
  const visibleItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return {
    filtered,
    visibleItems,
    page: safePage,
    totalPages,
    handlePageChange,
    sortBy,
    setSort:          handleSetSort,
    selectedCategory,
    setCategory:      handleSetCategory,
    clearFilters,
    sheetOpen,
    setSheetOpen,
    hasActiveFilters: selectedCategory !== 'all' || sortBy !== 'closest_due' || gradeFilter !== null || searchQuery !== '',
    categoryKey:      selectedCategory,
    gradeFilter,
    setGradeFilter,
    searchQuery,
    setSearchQuery,
    savedIds,
    handleToggleSave,
    isFiltered:       hasFiltered,
  };
}
