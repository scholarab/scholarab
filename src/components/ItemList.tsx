import { useMemo } from 'react';
import { Drawer } from 'vaul';
import { useScholarships } from '../hooks/useScholarships.ts';
import { usePrograms } from '../hooks/usePrograms.ts';
import ScholarshipCard from './ScholarshipCard.tsx';
import ProgramCard from './ProgramCard.tsx';
import Pagination from './Pagination.tsx';
import type { ScholarshipWithMeta } from '../hooks/useScholarships.ts';
import type { ProgramWithMeta } from '../hooks/usePrograms.ts';

type Props =
  | { mode: 'scholarship'; items: ScholarshipWithMeta[] }
  | { mode: 'program';     items: ProgramWithMeta[] };

const REGION_PILLS = [
  { value: null,           label: 'All',         dot: undefined },
  { value: 'Medicine Hat', label: 'Medicine Hat', dot: '#f97316' },
  { value: 'Alberta-wide', label: 'Alberta',      dot: '#22d3a5' },
  { value: 'National',     label: 'National',     dot: '#3b82f6' },
] as const;

const SCHOLARSHIP_SORT = [
  { value: 'featured',    label: 'Featured' },
  { value: 'closest_due', label: 'Earliest Deadline' },
  { value: 'highest_pay', label: 'Highest Amount' },
  { value: 'lowest_pay',  label: 'Lowest Amount' },
] as const;

const PROGRAM_SORT = [
  { value: 'featured',    label: 'Featured' },
  { value: 'closest_due', label: 'Earliest Deadline' },
] as const;

const sheetBg  = 'bg-white dark:bg-[#141418]';
const pillBase = 'flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 select-none border';
const pillOn   = 'text-[#22d3a5]';
const pillOff  = 'bg-white text-gray-600 border-gray-200 dark:bg-white/[0.03] dark:text-white/45 dark:border-white/10';
const chipCls  = (selected: boolean) => `flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 select-none ${selected ? 'text-[#22d3a5]' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400 dark:bg-white/[0.03] dark:text-white/45 dark:border-white/10 dark:hover:border-white/20'}`;
const chipStyle = (selected: boolean) => selected ? { background: 'rgba(34,211,165,0.1)', border: '0.5px solid rgba(34,211,165,0.3)' } : undefined;

export default function ItemList(props: Props) {
  const isScholarship = props.mode === 'scholarship';

  // Both hooks always called — React rules; unused one gets empty array
  const sch = useScholarships(isScholarship ? props.items as ScholarshipWithMeta[] : []);
  const prg = usePrograms(!isScholarship ? props.items as ProgramWithMeta[] : []);

  const { filtered, visibleItems, page, totalPages, handlePageChange,
          sortBy, setSort, sheetOpen, setSheetOpen, hasActiveFilters, savedIds, handleToggleSave }
    = isScholarship ? sch : prg;

  const savedSet   = useMemo(() => new Set(savedIds), [savedIds]);
  const label      = isScholarship ? 'scholarship' : 'program';
  const sortOpts   = isScholarship ? SCHOLARSHIP_SORT : PROGRAM_SORT;
  const filterKey  = isScholarship ? sch.regionKey : prg.categoryKey;

  const categories = useMemo(
    () => !isScholarship ? ['all', ...[...new Set((props.items as ProgramWithMeta[]).map(p => p.category))].sort()] : [],
    [isScholarship, props.items]
  );

  return (
    <div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {filtered.length} {label}{filtered.length !== 1 ? 's' : ''} shown
      </span>

      {/* Mobile: count + sort button */}
      <div className="md:hidden mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-400 dark:text-white/25 flex-shrink-0">
          {filtered.length} {label}{filtered.length !== 1 ? 's' : ''}
        </p>
        <button onClick={() => setSheetOpen(true)} aria-expanded={sheetOpen} aria-label="Open sort options"
          className="relative flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors"
          style={{ borderColor: hasActiveFilters ? 'rgba(34,211,165,0.45)' : 'rgba(128,128,128,0.25)', color: hasActiveFilters ? '#22d3a5' : 'rgba(128,128,128,0.7)', background: hasActiveFilters ? 'rgba(34,211,165,0.07)' : 'transparent' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 3h12M2 8h8M2 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M13 6v7M11 11l2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Sort
          {hasActiveFilters && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3a5', position: 'absolute', top: 4, right: 4 }} />}
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex chips-row mb-5 gap-2 overflow-x-auto" style={{ flexWrap: 'nowrap' }}>
        {isScholarship
          ? REGION_PILLS.map(({ value, label: lbl, dot }) => {
              const sel = sch.selectedRegion === value;
              return (
                <button key={lbl} onClick={() => sch.setRegion(value)} aria-pressed={sel}
                  className={chipCls(sel)} style={chipStyle(sel)}>
                  {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, display: 'inline-block', marginRight: 4, flexShrink: 0 }} />}
                  {lbl}
                </button>
              );
            })
          : categories.map(cat => {
              const sel = prg.selectedCategory === cat;
              return (
                <button key={cat} onClick={() => prg.setCategory(cat)} aria-pressed={sel}
                  className={chipCls(sel)} style={chipStyle(sel)}>
                  {cat === 'all' ? 'All' : cat}
                </button>
              );
            })
        }
      </div>

      {/* Desktop: count + sort pills */}
      <div className="hidden md:flex mb-5 items-center justify-between gap-4">
        <p className="text-sm text-gray-400 dark:text-white/25 flex-shrink-0">
          {filtered.length} {label}{filtered.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-1.5">
          {sortOpts.map(({ value, label: lbl }) => (
            <button key={value} onClick={() => setSort(value as any)} aria-pressed={sortBy === value}
              className={`sort-pill whitespace-nowrap flex-shrink-0${sortBy === value ? ' active' : ''}`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <Drawer.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 md:hidden bg-black/[0.45]" />
          <Drawer.Content aria-label="Sort options"
            className={`fixed left-0 right-0 z-50 md:hidden rounded-t-2xl ${sheetBg} flex flex-col outline-none`}
            style={{ bottom: 64, boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', maxHeight: 'calc(85vh - 64px)' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-black/[0.06] dark:border-white/[0.07] flex-shrink-0">
              <span className="font-semibold text-gray-900 dark:text-white text-base">Sort</span>
              <button onClick={() => setSheetOpen(false)} aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="px-5 pt-5 pb-2">
              <div className="flex flex-wrap" style={{ gap: 8 }}>
                {sortOpts.map(({ value, label: lbl }) => {
                  const sel = sortBy === value;
                  return (
                    <button key={value} onClick={() => setSort(value as any)} aria-pressed={sel}
                      className={`${pillBase} ${sel ? pillOn : pillOff}`}
                      style={sel ? { background: 'rgba(34,211,165,0.1)', borderColor: 'rgba(34,211,165,0.35)' } : undefined}>
                      {lbl}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-shrink-0 px-5 py-4 border-t border-black/[0.06] dark:border-white/[0.07]"
              style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              <button onClick={() => setSheetOpen(false)}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: '#22d3a5', color: '#0a0a0f' }}>Done</button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Card grid */}
      <div key={`${filterKey}-${sortBy}-${page}`} className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ alignItems: 'stretch' }}>
        {isScholarship
          ? (visibleItems as ScholarshipWithMeta[]).map(s => (
              <ScholarshipCard key={s.id} scholarship={s} isSaved={savedSet.has(s.id)} onToggleSave={() => handleToggleSave(s.id)} />
            ))
          : (visibleItems as ProgramWithMeta[]).map(p => (
              <ProgramCard key={p.id} program={p} isSaved={savedSet.has(p.id)} onToggleSave={() => handleToggleSave(p.id)} />
            ))
        }
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />

      {filtered.length === 0 && (
        <p className="text-center py-16 text-gray-400 dark:text-white/25">
          {(isScholarship ? sch.selectedRegion !== null : prg.selectedCategory !== 'all')
            ? `No ${label}s match your filters.`
            : `No ${label}s to show.`}
        </p>
      )}
    </div>
  );
}
