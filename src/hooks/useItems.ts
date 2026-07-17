import { useState, useEffect, useMemo, useCallback } from 'react';
import { getSaved, toggleSaved, getSavedPrograms, toggleSavedProgram } from '../lib/tracker.ts';
import { showConfetti } from '../lib/utils.ts';
import { PUBLIC_PAGE_SIZE } from '../lib/constants';
import {
  buildScholarshipStatusCache, filterSortScholarships,
  buildProgramStatusCache, filterSortPrograms,
  getScholarshipStatus, getProgramStatus, programMatchesGrade,
} from '../lib/list-core.ts';
import type {
  ScholarshipWithMeta, ScholarshipSort, StatusFilter, RegionKey,
  ProgramWithMeta, ProgramSort,
} from '../lib/list-core.ts';

export { getScholarshipStatus, getProgramStatus, programMatchesGrade };
export type { ScholarshipWithMeta, ProgramWithMeta, StatusFilter };
export type { ScholarshipStatus, ProgramStatus } from '../lib/list-core.ts';

export const PAGE_SIZE = PUBLIC_PAGE_SIZE;

// ── Scholarships ──────────────────────────────────────────────────────────────

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

  const handleToggleSave = useCallback((id: number, originEl?: Element | null) => {
    const newSaved = toggleSaved(id);
    if (newSaved.includes(id)) showConfetti(originEl);
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

  const statusCache = useMemo(() => buildScholarshipStatusCache(initialScholarships), [initialScholarships]);

  const filtered = useMemo(
    () => filterSortScholarships(initialScholarships, { statusFilter, selectedCategory, selectedRegion, searchQuery, sortBy }, statusCache),
    [initialScholarships, statusCache, statusFilter, selectedRegion, selectedCategory, searchQuery, sortBy],
  );

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

  const handleToggleSave = useCallback((id: number, originEl?: Element | null) => {
    const newSaved = toggleSavedProgram(id);
    if (newSaved.includes(id)) showConfetti(originEl);
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

  const statusCache = useMemo(() => buildProgramStatusCache(initialPrograms), [initialPrograms]);

  const filtered = useMemo(
    () => filterSortPrograms(initialPrograms, { selectedCategory, gradeFilter, searchQuery, sortBy }, statusCache),
    [initialPrograms, selectedCategory, gradeFilter, searchQuery, statusCache, sortBy],
  );

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
