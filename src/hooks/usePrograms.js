import { useState, useRef, useEffect, useMemo } from 'react';
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

  const batchSizeRef    = useRef(INITIAL_BATCH);
  const hasFiltered     = useRef(false);
  const sentinelRef     = useRef(null);
  const visibleCountRef = useRef(visibleCount);

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
  }

  function handleSetCategory(cat) {
    hasFiltered.current = true;
    setVisibleCount(batchSizeRef.current);
    const next = cat === 'all' ? 'all' : (selectedCategory === cat ? 'all' : cat);
    setSelectedCategory(next);
    updateURL(sortBy, next);
  }

  function handleSetSort(value) {
    hasFiltered.current = true;
    setVisibleCount(batchSizeRef.current);
    setSortBy(value);
    updateURL(value, selectedCategory);
  }

  const STATUS_ORDER = { active: 0, tba: 1, closed: 2 };

  const filtered = useMemo(() => {
    const afterCategory = selectedCategory === 'all'
      ? initialPrograms
      : initialPrograms.filter(p => p.category === selectedCategory);

    return [...afterCategory].sort((a, b) => {
      const sa = getStatus(a), sb = getStatus(b);
      if (STATUS_ORDER[sa] !== STATUS_ORDER[sb]) return STATUS_ORDER[sa] - STATUS_ORDER[sb];
      if (sa === 'active') return new Date(a.deadline) - new Date(b.deadline);
      return 0;
    });
  }, [initialPrograms, selectedCategory, sortBy]);

  visibleCountRef.current = visibleCount;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const chunk = () => batchSizeRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCountRef.current < filtered.length) {
          setVisibleCount(v => v + chunk());
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered.length]);

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
