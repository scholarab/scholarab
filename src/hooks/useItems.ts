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
  _amount_cents?: number;
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

const PROVINCIAL_REGIONS = new Set(['Alberta', 'Alberta-wide', 'Calgary', 'Edmonton', 'Lethbridge', 'Medicine Hat']);
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
  const [selectedCategory, setSelectedCategoryRaw] = useState(() => {
    if (typeof window === 'undefined') return 'all';
    return new URLSearchParams(window.location.search).get('category') ?? 'all';
  });
  const [statusFilter,   setStatusFilterRaw] = useState<StatusFilter>('all');
  const [searchQuery,    setSearchQueryRaw] = useState('');
  const [page,           setPage          ] = useState(1);
  const [sheetOpen,      setSheetOpen     ] = useState(false);
  const [savedIds,       setSavedIds      ] = useState<number[]>([]);
  const [hasFiltered,    setHasFiltered   ] = useState(false);

  const setCategory = useCallback((cat: string) => {
    const next = cat === 'all' ? 'all' : cat;
    setHasFiltered(true);
    setSelectedCategoryRaw(next);
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedIds([...getSaved()]);
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

    return [...afterSearch].sort((a, b) => {
      if (sortBy === 'closest_due') {
        const aStatus = statusCache.get(a.id);
        const bStatus = statusCache.get(b.id);
        // active first → future → closed (so expired entries don't bury open ones)
        const rank = { active: 0, future: 1, closed: 2 } as Record<string, number>;
        const aRank = rank[aStatus ?? 'active'] ?? 0;
        const bRank = rank[bStatus ?? 'active'] ?? 0;
        if (aRank !== bRank) return aRank - bRank;
        // within closed: most recently expired first
        if (aStatus === 'closed') return (b._deadline_ms || 0) - (a._deadline_ms || 0);
        return (a._deadline_ms || Infinity) - (b._deadline_ms || Infinity);
      }
      if (sortBy === 'highest_pay') return (b._amount_cents ?? 0) - (a._amount_cents ?? 0);
      if (sortBy === 'lowest_pay')  return (a._amount_cents ?? 0) - (b._amount_cents ?? 0);
      return 0;
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
}

export type ProgramStatus = 'active' | 'tba' | 'closed';

export function getProgramStatus(p: ProgramWithMeta): ProgramStatus {
  if (!p.deadline || p.deadline === 'TBA' || p.deadline === 'Ongoing') return 'tba';
  const deadMs = p._deadline_ms ?? new Date(p.deadline + 'T00:00:00').getTime();
  if (getToday().getTime() > deadMs) return 'closed';
  return 'active';
}

type ProgramSort = 'closest_due';

export function usePrograms(initialPrograms: ProgramWithMeta[]) {
  const [sortBy,           setSortBy          ] = useState<ProgramSort>('closest_due');
  const [selectedCategory, setSelectedCategory] = useState('all');
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

    return [...afterCategory].sort((a, b) => (a._deadline_ms ?? Infinity) - (b._deadline_ms ?? Infinity));
  }, [initialPrograms, selectedCategory, statusCache]);

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
    sheetOpen,
    setSheetOpen,
    hasActiveFilters: selectedCategory !== 'all',
    categoryKey:      selectedCategory,
    savedIds,
    handleToggleSave,
    isFiltered:       hasFiltered,
  };
}
