import { useState, useEffect, useMemo, useCallback } from 'react';
import { track } from '@vercel/analytics';
import { getSavedPrograms, toggleSavedProgram } from '../lib/tracker.ts';
import { getToday } from '../lib/utils.ts';
import type { Program } from '../lib/data-loader.ts';

// Extended type with optional precomputed build-time fields
export interface ProgramWithMeta extends Program {
  _deadline_ms?: number;
}

export type ProgramStatus = 'active' | 'tba' | 'closed';

export const PAGE_SIZE = 16;

export function getStatus(p: ProgramWithMeta): ProgramStatus {
  if (!p.deadline || p.deadline === 'TBA' || p.deadline === 'Ongoing') return 'tba';
  // Use build-time precomputed ms value when available
  const deadMs = p._deadline_ms ?? new Date(p.deadline + 'T00:00:00').getTime();
  if (getToday().getTime() > deadMs) return 'closed';
  return 'active';
}

const SORT_VALUES = ['featured', 'closest_due'] as const;
type SortValue = typeof SORT_VALUES[number];

interface InitialParams {
  sort: SortValue;
  category: string;
  page: number;
}

function getInitialParams(validCategories: Set<string>): InitialParams {
  if (typeof window === 'undefined') return { sort: 'featured', category: 'all', page: 1 };
  const params    = new URLSearchParams(window.location.search);
  const rawSort   = params.get('sort') || 'featured';
  const sort: SortValue = (SORT_VALUES as readonly string[]).includes(rawSort) ? rawSort as SortValue : 'featured';
  const rawCat    = params.get('category') || 'all';
  const category  = rawCat === 'all' || validCategories.has(rawCat) ? rawCat : 'all';
  const rawPage   = parseInt(params.get('page') || '1', 10);
  const page      = rawPage >= 1 ? rawPage : 1;
  return { sort, category, page };
}

function updateURL(sort: SortValue, category: string, page: number): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  if (sort && sort !== 'featured')       params.set('sort', sort);
  if (category && category !== 'all')    params.set('category', category);
  if (page && page > 1)                  params.set('page', String(page));
  const qs = params.toString();
  const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', newUrl);
}

export function usePrograms(initialPrograms: ProgramWithMeta[]) {
  const [sortBy,           setSortBy          ] = useState<SortValue>('featured');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [page,             setPage            ] = useState(1);
  const [sheetOpen,        setSheetOpen        ] = useState(false);
  const [savedIds,         setSavedIds         ] = useState<number[]>([]);
  const validCategories = useMemo(
    () => new Set(initialPrograms.map(p => p.category ?? '')),
    [initialPrograms]
  );

  useEffect(() => {
    const p = getInitialParams(validCategories);
    setSortBy(p.sort);
    setSelectedCategory(p.category);
    setPage(p.page);
    setSavedIds([...getSavedPrograms()]);
  }, [initialPrograms, validCategories]);

  const handleToggleSave = useCallback((id: number) => {
    const newSaved = toggleSavedProgram(id);
    setSavedIds([...newSaved]);
    track('save_toggle', { id, saved: newSaved.includes(id) });
  }, []);

  const handleSetCategory = useCallback((cat: string) => {
    const next = cat === 'all' ? 'all' : (selectedCategory === cat ? 'all' : cat);
    setSelectedCategory(next);
    setPage(1);
    updateURL(sortBy, next, 1);
    if (next !== 'all') track('filter_category', { category: next, page: 'programs' });
  }, [selectedCategory, sortBy]);

  const handleSetSort = useCallback((value: SortValue) => {
    setSortBy(value);
    setPage(1);
    updateURL(value, selectedCategory, 1);
    track('filter_sort', { sort: value, page: 'programs' });
  }, [selectedCategory]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    updateURL(sortBy, selectedCategory, newPage);
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' })));
  }, [sortBy, selectedCategory]);

  const STATUS_ORDER: Record<ProgramStatus, number> = { active: 0, tba: 1, closed: 2 };

  // statusCache depends on today's date — must stay runtime
  const statusCache = useMemo(() => {
    const m = new Map<number, ProgramStatus>();
    for (const p of initialPrograms) m.set(p.id, getStatus(p));
    return m;
  }, [initialPrograms]);

  const filtered = useMemo(() => {
    const nonClosed = initialPrograms.filter(p => statusCache.get(p.id) !== 'closed');
    const afterCategory = selectedCategory === 'all'
      ? nonClosed
      : nonClosed.filter(p => p.category === selectedCategory);

    return [...afterCategory].sort((a, b) => {
      const sa = statusCache.get(a.id)!;
      const sb = statusCache.get(b.id)!;
      if (STATUS_ORDER[sa] !== STATUS_ORDER[sb]) return STATUS_ORDER[sa] - STATUS_ORDER[sb];
      // Use build-time precomputed ms values; fall back to 0 if absent
      if (sa === 'active') return (a._deadline_ms ?? 0) - (b._deadline_ms ?? 0);
      return 0;
    });
  }, [initialPrograms, selectedCategory, sortBy, statusCache]);

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
    hasActiveFilters: sortBy !== 'featured' || selectedCategory !== 'all',
    categoryKey:      selectedCategory,
    savedIds,
    handleToggleSave,
  };
}
