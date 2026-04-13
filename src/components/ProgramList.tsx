import { useMemo, useEffect } from 'react';
import { Drawer } from 'vaul';
import { usePrograms } from '../hooks/usePrograms.ts';
import ProgramCard from './ProgramCard.tsx';
import Pagination from './Pagination.tsx';
import type { ProgramWithMeta } from '../hooks/usePrograms.ts';
import { PROGRAM_BADGES } from '../lib/badges.ts';

const pillBase  = 'flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 select-none border';
const pillOn    = 'text-brand border-brand-border bg-brand-dim';
const pillOff   = 'bg-subtle text-secondary border-card';
const chipCls   = (sel: boolean) => `flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 select-none ${sel ? 'text-brand' : 'bg-subtle text-secondary border border-card hover:border-medium'}`;
const chipStyle = (sel: boolean) => sel ? { background: 'var(--brand-dim)', border: '0.5px solid var(--brand-border)' } : undefined;

interface Props {
  items: ProgramWithMeta[];
}

export default function ProgramList({ items }: Props) {
  const {
    filtered, visibleItems, page, totalPages, handlePageChange,
    selectedCategory, setCategory,
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
    () => ['all', ...[...new Set(items.map(p => p.category).filter((c): c is string => c !== null))].sort()],
    [items]
  );

  const renderCategoryChips = (mobile: boolean) => categories.map(cat => {
    const badge = cat !== 'all' ? PROGRAM_BADGES[cat] : undefined;
    const sel = selectedCategory === cat;
    if (mobile) {
      return (
        <button key={cat} onClick={() => setCategory(cat)} aria-pressed={sel}
          className={`${pillBase} ${sel ? pillOn : pillOff}`}
          style={sel ? { background: 'var(--brand-dim)', borderColor: 'var(--brand-border)' } : undefined}>
          {badge?.emoji && <span aria-hidden="true">{badge.emoji}</span>}
          {cat === 'all' ? 'All' : cat}
        </button>
      );
    }
    return (
      <button key={cat} onClick={() => setCategory(cat)} aria-pressed={sel}
        className={chipCls(sel)} style={chipStyle(sel)}>
        {badge?.emoji && <span aria-hidden="true">{badge.emoji}</span>}
        {cat === 'all' ? 'All' : cat}
      </button>
    );
  });

  return (
    <div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {filtered.length} program{filtered.length !== 1 ? 's' : ''} shown
      </span>

      {/* Category chips — desktop only */}
      <div className="hidden md:block">
        <div className="chips-row-wrap mb-5">
          <div className="flex chips-row gap-2 overflow-x-auto" style={{ flexWrap: 'nowrap' }}>
            {renderCategoryChips(false)}
          </div>
        </div>
      </div>

      {/* Mobile: count + filter button */}
      <div className="md:hidden mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-faint flex-shrink-0">
          {filtered.length} program{filtered.length !== 1 ? 's' : ''}
        </p>
        <button onClick={() => setSheetOpen(true)} aria-expanded={sheetOpen} aria-label="Open filters"
          className="relative flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors"
          style={{ borderColor: hasActiveFilters ? 'var(--brand-border)' : 'var(--border-medium)', color: hasActiveFilters ? 'var(--brand)' : 'var(--text-secondary)', background: hasActiveFilters ? 'var(--brand-dim)' : 'transparent' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 3h12M5 8h6M7 13h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Filter
          {hasActiveFilters && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', position: 'absolute', top: 4, right: 4 }} />}
        </button>
      </div>

      {/* Desktop: count */}
      <div className="hidden md:flex mb-5">
        <p className="text-sm text-faint">{filtered.length} program{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Mobile bottom sheet */}
      <Drawer.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 md:hidden bg-black/[0.45] backdrop-blur-sm" />
          <Drawer.Content aria-label="Filter and sort options"
            className="fixed left-0 right-0 z-50 md:hidden rounded-t-2xl flex flex-col outline-none"
            style={{ bottom: 64, backgroundColor: 'var(--bg-card)', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', maxHeight: 'calc(85vh - 64px)' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-subtle flex-shrink-0">
              <span className="font-semibold text-primary text-base">Filter & Sort</span>
              <button onClick={() => setSheetOpen(false)} aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-full text-secondary hover:bg-subtle transition-colors">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">
              {categories.length > 1 && (
                <div>
                  <p className="text-xs font-semibold text-tertiary uppercase tracking-widest mb-3">Category</p>
                  <div className="flex flex-wrap" style={{ gap: 8 }}>
                    {renderCategoryChips(true)}
                  </div>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 px-5 py-4 border-t border-subtle"
              style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              <button onClick={() => setSheetOpen(false)}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'var(--brand)', color: '#0a0a0f' }}>Done</button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Card grid */}
      <div key={`${categoryKey}-${page}`} className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ alignItems: 'stretch' }}>
        {visibleItems.map((p, i) => (
          <ProgramCard key={p.id} program={p} index={i} isSaved={savedSet.has(p.id)} onToggleSave={() => handleToggleSave(p.id)} isFiltered={isFiltered} isInitial={!isFiltered && page === 1 && i < 16} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />

      {filtered.length === 0 && (
        <p className="text-center py-16 text-faint">No programs match your filters.</p>
      )}
    </div>
  );
}
