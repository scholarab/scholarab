import { useState, useEffect, useMemo, useCallback } from 'react';
import { getSaved, toggleSaved } from '../lib/tracker.ts';
import { getToday } from '../lib/utils.ts';
import type { Scholarship } from '../lib/data-loader.ts';

export interface ScholarshipWithMeta extends Scholarship {
  _open_ms?: number;
  _deadline_ms?: number;
  _amount_cents?: number;
  _slug?: string;
  _deadline_formatted?: string | null;
}

export type ScholarshipStatus = 'active' | 'future' | 'closed';

export function getStatus(s: ScholarshipWithMeta): ScholarshipStatus {
  const todayMs = getToday().getTime();
  const openMs  = s._open_ms     ?? new Date((s.openDate || '1970-01-01') + 'T00:00:00').getTime();
  const deadMs  = s._deadline_ms ?? new Date((s.deadline ?? '') + 'T00:00:00').getTime();
  if (todayMs < openMs) return 'future';
  if (todayMs > deadMs) return 'closed';
  return 'active';
}

import { PUBLIC_PAGE_SIZE } from '../lib/constants';
export const PAGE_SIZE = PUBLIC_PAGE_SIZE;

const PROVINCIAL_REGIONS = new Set(['Alberta', 'Alberta-wide', 'Calgary', 'Edmonton', 'Lethbridge', 'Medicine Hat']);

type RegionKey = 'Alberta-wide' | 'Medicine Hat' | 'National';

const REGION_MATCH: Record<RegionKey, (s: ScholarshipWithMeta) => boolean> = {
  'Alberta-wide': s => PROVINCIAL_REGIONS.has(s.region ?? ''),
  'Medicine Hat': s => s.region === 'Medicine Hat',
  'National':     s => s.region === 'National',
};

type SortValue = 'closest_due' | 'highest_pay' | 'lowest_pay';

export type StatusFilter = 'all' | 'active' | 'closing' | 'closed';

export function useScholarships(initialScholarships: ScholarshipWithMeta[]) {
  const [sortBy,         setSortBy        ] = useState<SortValue>('closest_due');
  const [selectedRegion, setSelectedRegion] = useState<RegionKey | null>(null);
  const [selectedCategory, setSelectedCategoryRaw] = useState('all');
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

  const handleSetSort = useCallback((value: SortValue) => {
    setHasFiltered(true);
    setSortBy(value);
    setPage(1);

  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setHasFiltered(true);
    setPage(newPage);
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' })));
  }, []);

  const todayMs = useMemo(() => getToday().getTime(), []);

  const statusCache = useMemo(() => {
    const m = new Map<number, ScholarshipStatus>();
    for (const s of initialScholarships) m.set(s.id, getStatus(s));
    return m;
  }, [initialScholarships]);

  const filtered = useMemo(() => {
    // Base pool depends on statusFilter
    const pool = statusFilter === 'closed'
      ? initialScholarships.filter(s => statusCache.get(s.id) === 'closed')
      : statusFilter === 'closing'
        ? initialScholarships.filter(s => {
            if (statusCache.get(s.id) !== 'active') return false;
            const deadMs = s._deadline_ms ?? 0;
            const days = Math.ceil((deadMs - todayMs) / 86_400_000);
            return days >= 0 && days <= 30;
          })
        : statusFilter === 'active'
          ? initialScholarships.filter(s => {
              if (statusCache.get(s.id) !== 'active') return false;
              const deadMs = s._deadline_ms ?? 0;
              const days = Math.ceil((deadMs - todayMs) / 86_400_000);
              return days > 30;
            })
          : initialScholarships.filter(s => statusCache.get(s.id) !== 'closed');

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
          (s.organization?.toLowerCase().includes(q)) ||
          (s.audience?.toLowerCase().includes(q))
        );

    return [...afterSearch].sort((a, b) => {
      if (sortBy === 'closest_due') return (a._deadline_ms ?? Infinity) - (b._deadline_ms ?? Infinity);
      if (sortBy === 'highest_pay') return (b._amount_cents ?? 0) - (a._amount_cents ?? 0);
      if (sortBy === 'lowest_pay')  return (a._amount_cents ?? 0) - (b._amount_cents ?? 0);
      return 0;
    });
  }, [initialScholarships, statusCache, statusFilter, selectedRegion, selectedCategory, searchQuery, sortBy, todayMs]);

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
