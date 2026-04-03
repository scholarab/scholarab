import { useState, useRef, useEffect, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import { track } from '@vercel/analytics';
import { getSavedPrograms, toggleSavedProgram } from '../lib/tracker.js';
import { getToday } from '../lib/utils.jsx';

/** Desktop default for SSR/hydration; mobile batch applied in useEffect after mount. */
export const INITIAL_BATCH = 16;

export function getStatus(p) {
  if (!p.deadline || p.deadline === 'TBA' || p.deadline === 'Ongoing') return 'tba';
  const deadline = new Date(p.deadline + 'T00:00:00');
  if (getToday() > deadline) return 'closed';
  return 'active';
}

const SORT_VALUES = ['featured', 'closest_due'];

function getInitialParams(validCategories) {
  if (typeof window === 'undefined') return { sort: 'featured', category: 'all' };
  const params = new URLSearchParams(window.location.search);
  const rawSort = params.get('sort') || 'featured';
  const sort = SORT_VALUES.includes(rawSort) ? rawSort : 'featured';
  const rawCat = params.get('category') || 'all';
  const category = rawCat === 'all' || validCategories.has(rawCat) ? rawCat : 'all';
  return { sort, category };
}

function updateURL(sort, category) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  if (sort && sort !== 'featured') params.set('sort', sort);
  if (category && category !== 'all') params.set('category', category);
  const qs = params.toString();
  const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', newUrl);
}

export function usePrograms(initialPrograms) {
  const [sortBy,           setSortBy          ] = useState('featured');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [visibleCount,     setVisibleCount     ] = useState(INITIAL_BATCH);
  const [sheetOpen,        setSheetOpen        ] = useState(false);
  const [savedIds,         setSavedIds         ] = useState([]);

  const batchSizeRef = useRef(INITIAL_BATCH);
  const hasFiltered  = useRef(false);

  const { ref: sentinelRef, inView } = useInView({ rootMargin: '300px' });

  const validCategories = useMemo(
    () => new Set(initialPrograms.map(p => p.category)),
    [initialPrograms]
  );

  useEffect(() => {
    const p = getInitialParams(validCategories);
    setSortBy(p.sort);
    setSelectedCategory(p.category);
    const batch = window.innerWidth < 768 ? 8 : 16;
    batchSizeRef.current = batch;
    setVisibleCount(batch);
    setSavedIds([...getSavedPrograms()]);
  }, [initialPrograms, validCategories]);

  function handleToggleSave(id) {
    const newSaved = toggleSavedProgram(id);
    setSavedIds([...newSaved]);
    track('save_toggle', { id, saved: newSaved.has(id) });
  }

  function handleSetCategory(cat) {
    hasFiltered.current = true;
    setVisibleCount(batchSizeRef.current);
    const next = cat === 'all' ? 'all' : (selectedCategory === cat ? 'all' : cat);
    setSelectedCategory(next);
    updateURL(sortBy, next);
    if (next !== 'all') track('filter_category', { category: next, page: 'programs' });
  }

  function handleSetSort(value) {
    hasFiltered.current = true;
    setVisibleCount(batchSizeRef.current);
    setSortBy(value);
    updateURL(value, selectedCategory);
    track('filter_sort', { sort: value, page: 'programs' });
  }

  const STATUS_ORDER = { active: 0, tba: 1, closed: 2 };

  const filtered = useMemo(() => {
    const nonClosed = initialPrograms.filter(p => getStatus(p) !== 'closed');
    const afterCategory = selectedCategory === 'all'
      ? nonClosed
      : nonClosed.filter(p => p.category === selectedCategory);

    return [...afterCategory].sort((a, b) => {
      const sa = getStatus(a), sb = getStatus(b);
      if (STATUS_ORDER[sa] !== STATUS_ORDER[sb]) return STATUS_ORDER[sa] - STATUS_ORDER[sb];
      if (sa === 'active') return new Date(a.deadline) - new Date(b.deadline);
      return 0;
    });
  }, [initialPrograms, selectedCategory, sortBy]);

  useEffect(() => {
    if (inView) {
      setVisibleCount(v => {
        if (v < filtered.length) return v + batchSizeRef.current;
        return v;
      });
    }
  }, [inView, filtered.length]);

  return {
    filtered,
    visibleCount,
    sortBy,
    setSort:          handleSetSort,
    selectedCategory,
    setCategory:      handleSetCategory,
    sheetOpen,
    setSheetOpen,
    hasActiveFilters: sortBy !== 'featured' || selectedCategory !== 'all',
    categoryKey:      selectedCategory,
    sentinelRef,
    savedIds,
    handleToggleSave,
    isFiltered:       hasFiltered.current,
  };
}
