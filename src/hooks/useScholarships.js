import { useState, useRef, useEffect, useMemo } from 'react';
import { getSaved, toggleSaved } from '../lib/tracker.js';
import { getToday } from '../lib/utils.jsx';

export function getStatus(s) {
  const t        = getToday();
  const open     = new Date((s.open_date || '1970-01-01') + 'T00:00:00');
  const deadline = new Date(s.deadline + 'T00:00:00');
  if (t < open)     return 'future';
  if (t > deadline) return 'closed';
  return 'active';
}

/** Desktop default for SSR/hydration; mobile batch is applied in useEffect after mount. */
export const INITIAL_BATCH = 16;

const PROVINCIAL_REGIONS = new Set(['Alberta', 'Alberta-wide', 'Calgary', 'Edmonton', 'Lethbridge', 'Medicine Hat']);

const REGION_MATCH = {
  'Alberta-wide': s => PROVINCIAL_REGIONS.has(s.region),
  'Medicine Hat': s => s.region === 'Medicine Hat',
  'National':     s => s.region === 'National',
};

function getInitialParams() {
  if (typeof window === 'undefined') return { sort: 'featured', region: null };
  const params = new URLSearchParams(window.location.search);
  const rawSort = params.get('sort') || 'featured';
  const sort = ['featured', 'closest_due', 'highest_pay', 'lowest_pay'].includes(rawSort) ? rawSort : 'featured';
  const rawRegion = params.get('region');
  const region = rawRegion && REGION_MATCH[rawRegion] ? rawRegion : null;
  return { sort, region };
}

function updateURL(sort, region) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  if (sort && sort !== 'random') params.set('sort', sort);
  if (region)                    params.set('region', region);
  const qs     = params.toString();
  const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', newUrl);
}

export function useScholarships(initialScholarships) {
  /** Matches server render: no URL reads or random shuffle until after mount. */
  const [sortBy,         setSortBy        ] = useState('featured');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [visibleCount,   setVisibleCount  ] = useState(INITIAL_BATCH);
  const [sheetOpen,      setSheetOpen     ] = useState(false);
  const [query,          setQuery         ] = useState('');

  const [savedIds, setSavedIds] = useState([]);
  const batchSizeRef    = useRef(INITIAL_BATCH);
  const hasFiltered     = useRef(false);
  const sentinelRef     = useRef(null);
  const visibleCountRef = useRef(visibleCount);

  useEffect(() => {
    const p = getInitialParams();
    setSortBy(p.sort);
    setSelectedRegion(p.region);
    const batch = window.innerWidth < 768 ? 8 : 16;
    batchSizeRef.current = batch;
    setVisibleCount(batch);
    setSavedIds([...getSaved()]);
  }, [initialScholarships]);

  function handleToggleSave(id) {
    const newSaved = toggleSaved(id);
    setSavedIds([...newSaved]);
  }

  function toggleRegion(region) {
    hasFiltered.current = true;
    setVisibleCount(batchSizeRef.current);
    const next = region === null ? null : (selectedRegion === region ? null : region);
    setSelectedRegion(next);
    updateURL(sortBy, next);
  }

  function handleSetSort(value) {
    hasFiltered.current = true;
    setVisibleCount(batchSizeRef.current);
    setSortBy(value);
    updateURL(value, selectedRegion);
  }

  const filtered = useMemo(() => {
    const withoutClosed = initialScholarships.filter(s => getStatus(s) !== 'closed');

    const afterSearch = query.trim() === ''
      ? withoutClosed
      : withoutClosed.filter(s => {
          const q = query.toLowerCase();
          return (
            s.title.toLowerCase().includes(q) ||
            (s.audience && s.audience.toLowerCase().includes(q)) ||
            (s.category && s.category.toLowerCase().includes(q))
          );
        });

    const afterRegion = selectedRegion === null
      ? afterSearch
      : afterSearch.filter(REGION_MATCH[selectedRegion]);

    return [...afterRegion].sort((a, b) => {
      if (sortBy === 'closest_due') return new Date(a.deadline) - new Date(b.deadline);
      const amtA = parseInt(a.amount.replace(/[$,]/g, '')) || 0;
      const amtB = parseInt(b.amount.replace(/[$,]/g, '')) || 0;
      if (sortBy === 'highest_pay') return amtB - amtA;
      if (sortBy === 'lowest_pay')  return amtA - amtB;
      // 'featured': active by deadline asc, future last
      const sa = getStatus(a), sb = getStatus(b);
      const ORDER = { active: 0, future: 1 };
      if ((ORDER[sa] ?? 2) !== (ORDER[sb] ?? 2)) return (ORDER[sa] ?? 2) - (ORDER[sb] ?? 2);
      if (sa === 'active') return new Date(a.deadline) - new Date(b.deadline);
      return 0;
    });
  }, [initialScholarships, selectedRegion, sortBy]);

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
    selectedRegion,
    setRegion:        toggleRegion,
    sheetOpen,
    setSheetOpen,
    query,
    setQuery:         (q) => { hasFiltered.current = true; setVisibleCount(batchSizeRef.current); setQuery(q); },
    hasActiveFilters: sortBy !== 'featured' || selectedRegion !== null || query.trim() !== '',
    regionKey:        selectedRegion ?? '',
    sentinelRef,
    savedIds,
    handleToggleSave,
    isFiltered:       hasFiltered.current,
  };
}
