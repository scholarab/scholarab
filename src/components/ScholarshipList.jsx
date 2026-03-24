import { useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { useScholarships, INITIAL_BATCH } from '../hooks/useScholarships.js';
import ScholarshipCard from './ScholarshipCard.jsx';
import { SPRING } from '../lib/utils.jsx';

const REGION_DOT_COLORS = {
  'Medicine Hat': '#f97316',
  'Alberta-wide':  '#22d3a5',
  'National':      '#3b82f6',
};

const REGION_PILLS = [
  { value: null,           label: 'All',          iconKey: null },
  { value: 'Medicine Hat', label: 'Medicine Hat',  iconKey: 'Medicine Hat' },
  { value: 'Alberta-wide', label: 'Alberta',       iconKey: 'Alberta-wide' },
  { value: 'National',     label: 'National',      iconKey: 'National' },
];

const SORT_OPTIONS = [
  { value: 'featured',    label: 'Featured' },
  { value: 'closest_due', label: 'Earliest Deadline' },
  { value: 'highest_pay', label: 'Highest Amount' },
  { value: 'lowest_pay',  label: 'Lowest Amount' },
];

export default function ScholarshipList({ initialScholarships }) {
  const {
    filtered,
    visibleCount,
    sortBy,
    setSort,
    selectedRegion,
    setRegion,
    sheetOpen,
    setSheetOpen,
    hasActiveFilters,
    regionKey,
    sentinelRef,
    savedIds,
    handleToggleSave,
    isFiltered,
  } = useScholarships(initialScholarships);

  const sheetBg  = 'bg-white dark:bg-[#141418]';
  const pillBase = 'flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 select-none border';
  const pillOn   = 'text-[#22d3a5]';
  const pillOff  = 'bg-white text-gray-600 border-gray-200 dark:bg-white/[0.03] dark:text-white/45 dark:border-white/10';

  // ── Spring bottom sheet ─────────────────────────────────────
  const sheetRef  = useRef(null);
  const dragStart = useRef(null);

  useLayoutEffect(() => {
    if (sheetOpen && sheetRef.current) {
      sheetRef.current.animate(
        [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
        { duration: 280, easing: SPRING, fill: 'forwards' }
      );
    }
  }, [sheetOpen]);

  function closeSheet() {
    if (!sheetRef.current) { setSheetOpen(false); return; }
    const from = sheetRef.current.style.transform || 'translateY(0)';
    sheetRef.current.style.transform = '';
    const anim = sheetRef.current.animate(
      [{ transform: from }, { transform: 'translateY(110%)' }],
      { duration: 280, easing: 'ease-in', fill: 'forwards' }
    );
    anim.onfinish = () => setSheetOpen(false);
  }

  function onDragStart(e) {
    dragStart.current = { y: e.clientY, t: Date.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onDragMove(e) {
    if (dragStart.current === null || !sheetRef.current) return;
    const dy = Math.max(0, e.clientY - dragStart.current.y);
    sheetRef.current.style.transform = `translateY(${dy}px)`;
  }

  function onDragEnd(e) {
    if (dragStart.current === null) return;
    const dy = Math.max(0, e.clientY - dragStart.current.y);
    const elapsed = Date.now() - dragStart.current.t;
    const velocity = dy / Math.max(elapsed, 1) * 1000; // px/s
    dragStart.current = null;
    if (!sheetRef.current) return;
    // Close if dragged far enough OR flicked fast (velocity > 400px/s)
    if (dy > 80 || velocity > 400) {
      closeSheet();
    } else {
      const anim = sheetRef.current.animate(
        [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }],
        { duration: 220, easing: SPRING, fill: 'forwards' }
      );
      anim.onfinish = () => { if (sheetRef.current) sheetRef.current.style.transform = ''; };
    }
  }

  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  return (
    <div>
      {/* ── MOBILE: Filter button row ── */}
      <div className="md:hidden mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-400 dark:text-white/25 flex-shrink-0">
          <span
            key={filtered.length}
            style={{ display: 'inline-block', animation: 'countPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            {filtered.length} scholarship{filtered.length !== 1 ? 's' : ''}
          </span>
        </p>
        <button
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          aria-label="Open sort options"
          className="relative flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors"
          style={{ borderColor: hasActiveFilters ? 'rgba(34,211,165,0.45)' : 'rgba(128,128,128,0.25)', color: hasActiveFilters ? '#22d3a5' : 'rgba(128,128,128,0.7)', background: hasActiveFilters ? 'rgba(34,211,165,0.07)' : 'transparent' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 3h12M2 8h8M2 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M13 6v7M11 11l2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Sort
          {hasActiveFilters && (
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3a5', position: 'absolute', top: 4, right: 4 }} />
          )}
        </button>
      </div>

      {/* ── Region pills row (mobile + desktop) ── */}
      <div className="flex chips-row mb-5 gap-2 overflow-x-auto" style={{ flexWrap: 'nowrap' }}>
        {REGION_PILLS.map(({ value, label, iconKey }) => {
          const selected = selectedRegion === value;
          return (
            <button key={label} onClick={() => setRegion(value)}
              aria-pressed={selected}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 select-none ${
                selected
                  ? 'text-[#22d3a5]'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400 dark:bg-white/[0.03] dark:text-white/45 dark:border-white/10 dark:hover:border-white/20'
              }`}
              style={selected ? { background: 'rgba(34,211,165,0.1)', border: '0.5px solid rgba(34,211,165,0.3)' } : undefined}>
              {iconKey && <span style={{ width: 7, height: 7, borderRadius: '50%', background: REGION_DOT_COLORS[value], display: 'inline-block', marginRight: 4, flexShrink: 0 }} />}
              {label}
            </button>
          );
        })}
      </div>

      {/* ── DESKTOP: Count + sort row ── */}
      <div className="hidden md:flex mb-5 items-center justify-between gap-4">
        <p className="text-sm text-gray-400 dark:text-white/25 flex-shrink-0">
          <span
            key={filtered.length}
            style={{ display: 'inline-block', animation: 'countPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            {filtered.length} scholarship{filtered.length !== 1 ? 's' : ''}
          </span>
        </p>
        <div className="flex items-center gap-1.5">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSort(value)}
              aria-pressed={sortBy === value}
              className={`sort-pill whitespace-nowrap flex-shrink-0${sortBy === value ? ' active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MOBILE: Bottom sheet ── */}
      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={closeSheet}
          />
          <div
            ref={sheetRef}
            className={`fixed left-0 right-0 z-50 md:hidden rounded-t-2xl ${sheetBg} flex flex-col`}
            style={{ bottom: 64, boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', maxHeight: 'calc(85vh - 64px)', willChange: 'transform' }}
          >
            {/* Drag handle */}
            <div
              className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-black/[0.06] dark:border-white/[0.07] flex-shrink-0"
              style={{ touchAction: 'none', cursor: 'grab' }}
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
            >
              <span className="font-semibold text-gray-900 dark:text-white text-base">Sort</span>
              <button onClick={closeSheet} aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                onPointerDown={e => e.stopPropagation()}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="px-5 pt-5 pb-2">
              <div className="flex flex-wrap" style={{ gap: 8 }}>
                {SORT_OPTIONS.map(({ value, label }) => {
                  const selected = sortBy === value;
                  return (
                    <button key={value}
                      onClick={() => setSort(value)}
                      aria-pressed={selected}
                      className={`${pillBase} ${selected ? pillOn : pillOff}`}
                      style={selected ? { background: 'rgba(34,211,165,0.1)', borderColor: 'rgba(34,211,165,0.35)' } : undefined}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-shrink-0 px-5 py-4 border-t border-black/[0.06] dark:border-white/[0.07]" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              <button
                onClick={closeSheet}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: '#22d3a5', color: '#0a0a0f' }}
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}

      {/* Card grid */}
      <div key={`${regionKey}-${sortBy}`}
        className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ alignItems: 'stretch' }}>
        {filtered.slice(0, visibleCount).map((s, i) => (
          <ScholarshipCard
            key={s.id}
            scholarship={s}
            index={i}
            isSaved={savedSet.has(s.id)}
            onToggleSave={() => handleToggleSave(s.id)}
            isFiltered={isFiltered}
            isInitial={!isFiltered && i < INITIAL_BATCH}
          />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      {visibleCount < filtered.length && (
        <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <p className="text-center py-16 text-gray-400 dark:text-white/25">
          {selectedRegion !== null
            ? 'No scholarships match your filters.'
            : 'No scholarships to show.'}
        </p>
      )}
    </div>
  );
}
