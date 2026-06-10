import { useMemo, useEffect } from 'react';
import { usePrograms, getProgramStatus as getStatus } from '../hooks/useItems.ts';
import { ProgramCard } from './ItemCard.tsx';
import Pagination from './Pagination.tsx';
import { FilterButton, CategoryChips, FilterSheet } from './FilterSheet.tsx';
import type { ProgramWithMeta } from '../hooks/useItems.ts';
import { PROGRAM_BADGES } from '../lib/badges.ts';
import ErrorBoundary from './ErrorBoundary.tsx';

interface Props {
  items: ProgramWithMeta[];
}

function ProgramList({ items }: Props) {
  const {
    filtered, visibleItems, page, totalPages, handlePageChange,
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

      {/* Desktop: count */}
      <div className="hidden md:flex mb-5 items-center justify-between gap-4">
        <p className="text-sm text-faint shrink-0">{filtered.length} program{filtered.length !== 1 ? 's' : ''}</p>
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
      </FilterSheet>

      {/* Card grid */}
      <div key={`${categoryKey}-${page}`} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" style={{ alignItems: 'stretch' }}>
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
