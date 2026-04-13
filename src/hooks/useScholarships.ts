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

export function useScholarships(initialScholarships: ScholarshipWithMeta[]) {
  const [sortBy,         setSortBy        ] = useState<SortValue>('closest_due');
  const [selectedRegion, setSelectedRegion] = useState<RegionKey | null>(null);
  const [selectedCategory, setSelectedCategoryRaw] = useState('all');
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

  const statusCache = useMemo(() => {
    const m = new Map<number, ScholarshipStatus>();
    for (const s of initialScholarships) m.set(s.id, getStatus(s));
    return m;
  }, [initialScholarships]);

  const withoutClosed = useMemo(
    () => initialScholarships.filter(s => statusCache.get(s.id) !== 'closed'),
    [initialScholarships, statusCache]
  );

  const filtered = useMemo(() => {
    const afterCategory = selectedCategory === 'all'
      ? withoutClosed
      : withoutClosed.filter(s => s.category === selectedCategory);
    const afterRegion = selectedRegion === null
      ? afterCategory
      : afterCategory.filter(REGION_MATCH[selectedRegion]);

    return [...afterRegion].sort((a, b) => {
      if (sortBy === 'closest_due') return (a._deadline_ms ?? Infinity) - (b._deadline_ms ?? Infinity);
      if (sortBy === 'highest_pay') return (b._amount_cents ?? 0) - (a._amount_cents ?? 0);
      if (sortBy === 'lowest_pay')  return (a._amount_cents ?? 0) - (b._amount_cents ?? 0);
      return 0;
    });
  }, [withoutClosed, selectedRegion, selectedCategory, sortBy]);

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
    hasActiveFilters: sortBy !== 'closest_due' || selectedRegion !== null || selectedCategory !== 'all',
    regionKey:        selectedRegion ?? '',
    categoryKey:      selectedCategory,
    savedIds,
    handleToggleSave,
    isFiltered:       hasFiltered,
  };
}
