import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { track } from '@vercel/analytics';
import { getSaved, toggleSaved } from '../lib/tracker.js';
import { getToday } from '../lib/utils.jsx';

export function getStatus(s) {
  const todayMs = getToday().getTime();
  // Use build-time precomputed ms values when available — avoids Date construction per call
  const openMs  = s._open_ms     ?? new Date((s.openDate || s.open_date || '1970-01-01') + 'T00:00:00').getTime();
  const deadMs  = s._deadline_ms ?? new Date(s.deadline    + 'T00:00:00').getTime();
  if (todayMs < openMs) return 'future';
  if (todayMs > deadMs) return 'closed';
  return 'active';
}

export const PAGE_SIZE = 16;

const PROVINCIAL_REGIONS = new Set(['Alberta', 'Alberta-wide', 'Calgary', 'Edmonton', 'Lethbridge', 'Medicine Hat']);

const REGION_MATCH = {
  'Alberta-wide': s => PROVINCIAL_REGIONS.has(s.region),
  'Medicine Hat': s => s.region === 'Medicine Hat',
  'National':     s => s.region === 'National',
};

function getInitialParams() {
  if (typeof window === 'undefined') return { sort: 'featured', region: null, page: 1 };
  const params    = new URLSearchParams(window.location.search);
  const rawSort   = params.get('sort') || 'featured';
  const sort      = ['featured', 'closest_due', 'highest_pay', 'lowest_pay'].includes(rawSort) ? rawSort : 'featured';
  const rawRegion = params.get('region');
  const region    = rawRegion && REGION_MATCH[rawRegion] ? rawRegion : null;
  const rawPage   = parseInt(params.get('page') || '1', 10);
  const page      = rawPage >= 1 ? rawPage : 1;
  return { sort, region, page };
}

function updateURL(sort, region, page) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  if (sort && sort !== 'featured') params.set('sort', sort);
  if (region)                      params.set('region', region);
  if (page && page > 1)            params.set('page', String(page));
  const qs     = params.toString();
  const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', newUrl);
}

export function useScholarships(initialScholarships) {
  const [sortBy,         setSortBy        ] = useState('featured');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [page,           setPage          ] = useState(1);
  const [sheetOpen,      setSheetOpen     ] = useState(false);
  const [savedIds,       setSavedIds      ] = useState([]);
  const hasFiltered = useRef(false);

  useEffect(() => {
    const p = getInitialParams();
    setSortBy(p.sort);
    setSelectedRegion(p.region);
    setPage(p.page);
    setSavedIds([...getSaved()]);
  }, [initialScholarships]);

  const handleToggleSave = useCallback((id) => {
    const newSaved = toggleSaved(id);
    setSavedIds([...newSaved]);
    track('save_toggle', { id, saved: newSaved.includes(id) });
  }, []);

  const toggleRegion = useCallback((region) => {
    hasFiltered.current = true;
    const next = region === null ? null : (selectedRegion === region ? null : region);
    setSelectedRegion(next);
    setPage(1);
    updateURL(sortBy, next, 1);
    if (next) track('filter_region', { region: next });
  }, [selectedRegion, sortBy]);

  const handleSetSort = useCallback((value) => {
    hasFiltered.current = true;
    setSortBy(value);
    setPage(1);
    updateURL(value, selectedRegion, 1);
    track('filter_sort', { sort: value, page: 'scholarships' });
  }, [selectedRegion]);

  const handlePageChange = useCallback((newPage) => {
    hasFiltered.current = true;
    setPage(newPage);
    updateURL(sortBy, selectedRegion, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [sortBy, selectedRegion]);

  // statusCache depends on today's date — must stay runtime
  const statusCache = useMemo(() => {
    const m = new Map();
    for (const s of initialScholarships) m.set(s.id, getStatus(s));
    return m;
  }, [initialScholarships]);

  const withoutClosed = useMemo(
    () => initialScholarships.filter(s => statusCache.get(s.id) !== 'closed'),
    [initialScholarships, statusCache]
  );

  const filtered = useMemo(() => {
    const afterRegion = selectedRegion === null
      ? withoutClosed
      : withoutClosed.filter(REGION_MATCH[selectedRegion]);

    return [...afterRegion].sort((a, b) => {
      // Use build-time precomputed values; fall back to 0 if absent
      if (sortBy === 'closest_due') return (a._deadline_ms ?? 0) - (b._deadline_ms ?? 0);
      if (sortBy === 'highest_pay') return (b._amount_cents ?? 0) - (a._amount_cents ?? 0);
      if (sortBy === 'lowest_pay')  return (a._amount_cents ?? 0) - (b._amount_cents ?? 0);
      const sa = statusCache.get(a.id), sb = statusCache.get(b.id);
      const ORDER = { active: 0, future: 1 };
      if ((ORDER[sa] ?? 2) !== (ORDER[sb] ?? 2)) return (ORDER[sa] ?? 2) - (ORDER[sb] ?? 2);
      if (sa === 'active') return (a._deadline_ms ?? 0) - (b._deadline_ms ?? 0);
      return 0;
    });
  }, [withoutClosed, selectedRegion, sortBy, statusCache]);

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
    hasActiveFilters: sortBy !== 'featured' || selectedRegion !== null,
    regionKey:        selectedRegion ?? '',
    savedIds,
    handleToggleSave,
    isFiltered:       hasFiltered.current,
  };
}
