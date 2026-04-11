import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { track } from '@vercel/analytics';
import { getSavedPrograms, toggleSavedProgram } from '../lib/tracker.ts';
import { getToday } from '../lib/utils.ts';
import type { Program } from '../lib/data-loader.ts';

export interface ProgramWithMeta extends Program {
  _deadline_ms?: number;
}

export type ProgramStatus = 'active' | 'tba' | 'closed';

import { PUBLIC_PAGE_SIZE } from '../lib/constants';
export const PAGE_SIZE = PUBLIC_PAGE_SIZE;

export function getStatus(p: ProgramWithMeta): ProgramStatus {
  if (!p.deadline || p.deadline === 'TBA' || p.deadline === 'Ongoing') return 'tba';
  const deadMs = p._deadline_ms ?? new Date(p.deadline + 'T00:00:00').getTime();
  if (getToday().getTime() > deadMs) return 'closed';
  return 'active';
}

type SortValue = 'closest_due';

export function usePrograms(initialPrograms: ProgramWithMeta[]) {
  const [sortBy,           setSortBy          ] = useState<SortValue>('closest_due');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [page,             setPage            ] = useState(1);
  const [sheetOpen,        setSheetOpen        ] = useState(false);
  const [savedIds,         setSavedIds         ] = useState<number[]>([]);
  const hasFiltered = useRef(false);

  useEffect(() => {
    setSavedIds([...getSavedPrograms()]);
  }, []);

  const handleToggleSave = useCallback((id: number) => {
    const newSaved = toggleSavedProgram(id);
    setSavedIds([...newSaved]);
    track('save_toggle', { id, saved: newSaved.includes(id) });
  }, []);

  const handleSetCategory = useCallback((cat: string) => {
    const next = cat === 'all' ? 'all' : (selectedCategory === cat ? 'all' : cat);
    hasFiltered.current = true;
    setSelectedCategory(next);
    setPage(1);
    if (next !== 'all') track('filter_category', { category: next, page: 'programs' });
  }, [selectedCategory]);

  const handleSetSort = useCallback((value: SortValue) => {
    hasFiltered.current = true;
    setSortBy(value);
    setPage(1);
    track('filter_sort', { sort: value, page: 'programs' });
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    hasFiltered.current = true;
    setPage(newPage);
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' })));
  }, []);

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

    return [...afterCategory].sort((a, b) => (a._deadline_ms ?? Infinity) - (b._deadline_ms ?? Infinity));
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
    hasActiveFilters: selectedCategory !== 'all',
    categoryKey:      selectedCategory,
    savedIds,
    handleToggleSave,
    isFiltered:       hasFiltered.current,
  };
}
