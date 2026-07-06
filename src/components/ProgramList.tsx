import { useMemo, useEffect } from 'react';
import { usePrograms, getProgramStatus as getStatus } from '../hooks/useItems.ts';
import { ProgramCard } from './ItemCard.tsx';
import Pagination from './Pagination.tsx';
import { FilterButton, CategoryChips, FilterSheet } from './FilterSheet.tsx';
import type { ProgramWithMeta, ProgramSort } from '../hooks/useItems.ts';
import { PROGRAM_BADGES } from '../lib/badges.ts';
import ErrorBoundary from './ErrorBoundary.tsx';

interface Props {
  items: ProgramWithMeta[];
}

const SORT_OPTIONS: { value: ProgramSort; label: string }[] = [
  { value: 'closest_due', label: 'Earliest Deadline' },
  { value: 'paid_first',  label: 'Paid First' },
  { value: 'name',        label: 'A–Z' },
];

const pillBase = 'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 select-none border';
const pillOn   = 'text-brand border-brand-border bg-brand-dim';
const pillOff  = 'bg-subtle text-secondary border-card';

function ProgramList({ items }: Props) {
  const {
    filtered, visibleItems, page, totalPages, handlePageChange,
    sortBy, setSort,
    selectedCategory, setCategory, clearFilters,
    sheetOpen, setSheetOpen, hasActiveFilters,
    savedIds, handleToggleSave, isFiltered, categoryKey,
  } = usePrograms(items);

  useEffect(() => {
    const close = () => setSheetOpen(false);
    document.addEventListener('astro:before-preparation', close);
    return () => document.removeEventListener('astro:before-preparation', close);
  }, [setSheetOpen]);

  const savedSet   = useMemo(() => new Set(savedIds), [savedIds]);
  const categories = useMemo(
    () => [...new Set(items.filter(p => getStatus(p) !== 'closed').map(p => p.category).filter((c): c is string => c !== null))].sort(),
    [items]
  );

  return (
    <div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {filtered.length} program{filtered.length !== 1 ? 's' : ''} shown
      </span>

      {/* Category chips — desktop only */}
      <div className="hidden md:block">
        <div className="chips-row-wrap mb-4">
          <div className="flex chips-row gap-1.5" style={{ flexWrap: 'wrap' }}>
            <CategoryChips categories={categories} selected={selectedCategory} onSelect={setCategory} badges={PROGRAM_BADGES} mobile={false} />
          </div>
        </div>
      </div>

      {/* Mobile: count + filter button */}
      <FilterButton count={filtered.length} label="program" hasActiveFilters={hasActiveFilters} open={sheetOpen} onOpen={() => setSheetOpen(true)} />

      {/* Desktop: count + sort pills */}
      <div className="hidden md:flex mb-5 items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-faint shrink-0">{filtered.length} program{filtered.length !== 1 ? 's' : ''}</p>
        <div style={{ display: 'inline-flex', padding: 3, borderRadius: 10, border: '1px solid var(--border-card)', background: 'var(--bg-card)', flexShrink: 0 }}>
          {SORT_OPTIONS.map(({ value, label }) => {
            const active = sortBy === value;
            const icon = active ? (value === 'closest_due' ? '◆' : value === 'paid_first' ? '🪙' : '↓') : null;
            return (
              <button key={value} onClick={() => setSort(value)} aria-pressed={active}
                style={{
                  padding: '5px 11px', fontSize: 12, fontWeight: active ? 600 : 500,
                  letterSpacing: '-0.01em', fontFamily: 'inherit',
                  border: 'none', borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: active ? 'var(--bg-subtle)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  transition: 'all 180ms',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  position: 'relative',
                }}>
                {icon && <span style={{ color: 'var(--brand)', fontSize: 10 }}>{icon}</span>}
                {label}
                {active && <span style={{ position: 'absolute', left: 11, right: 11, bottom: 2, height: 1, background: 'var(--brand)', borderRadius: 1 }} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <FilterSheet open={sheetOpen} onOpenChange={setSheetOpen}>
        {categories.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-tertiary uppercase tracking-widest mb-3">Category</p>
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              <CategoryChips categories={categories} selected={selectedCategory} onSelect={setCategory} badges={PROGRAM_BADGES} mobile={true} />
            </div>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-tertiary uppercase tracking-widest mb-3">Sort</p>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            {SORT_OPTIONS.map(({ value, label }) => {
              const sel = sortBy === value;
              return (
                <button key={value} onClick={() => setSort(value)} aria-pressed={sel}
                  className={`${pillBase} ${sel ? pillOn : pillOff}`}
                  style={sel ? { background: 'var(--brand-dim)', borderColor: 'var(--brand-border)' } : undefined}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </FilterSheet>

      {/* Card grid */}
      <div key={`${categoryKey}-${sortBy}-${page}`} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" style={{ alignItems: 'stretch' }}>
        {visibleItems.map((p, i) => (
          <ProgramCard key={p.id} program={p} index={i} isSaved={savedSet.has(p.id)} onToggleSave={() => handleToggleSave(p.id)} isFiltered={isFiltered} isInitial={!isFiltered && page === 1 && i < 16} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />

      {filtered.length === 0 && (
        <div className="empty-state">
          <span className="ico" aria-hidden="true">🔬</span>
          <p className="font-semibold text-primary mb-2">No programs match your filters</p>
          <p className="text-sm text-secondary mb-6">Try a different category.</p>
          {hasActiveFilters && (
            <button className="empty-clear" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProgramListWithBoundary(props: Props) {
  return <ErrorBoundary><ProgramList {...props} /></ErrorBoundary>;
}
