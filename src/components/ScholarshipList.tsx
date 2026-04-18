import { useMemo, useEffect, useState } from 'react';
import { useScholarships } from '../hooks/useScholarships.ts';
import ScholarshipCard from './ScholarshipCard.tsx';
import Pagination from './Pagination.tsx';
import { FilterButton, CategoryChips, FilterSheet } from './FilterSheet.tsx';
import type { ScholarshipWithMeta, StatusFilter } from '../hooks/useScholarships.ts';
import { SCHOLARSHIP_BADGES } from '../lib/badges.ts';

const REGION_PILLS = [
  { value: null,           label: 'All',         dot: undefined },
  { value: 'Medicine Hat', label: 'Medicine Hat', dot: '#f97316' },
  { value: 'Alberta-wide', label: 'Alberta',      dot: '#22d3a5' },
  { value: 'National',     label: 'National',     dot: '#3b82f6' },
] as const;

const SORT_OPTIONS = [
  { value: 'closest_due', label: 'Earliest Deadline' },
  { value: 'highest_pay', label: 'Highest Amount' },
  { value: 'lowest_pay',  label: 'Lowest Amount' },
] as const;

const pillBase  = 'flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 select-none border';
const pillOn    = 'text-brand border-brand-border bg-brand-dim';
const pillOff   = 'bg-subtle text-secondary border-card';
const chipCls   = (sel: boolean) => `flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 select-none ${sel ? 'text-brand' : 'bg-subtle text-secondary border border-card hover:border-medium'}`;
const chipStyle = (sel: boolean) => sel ? { background: 'var(--brand-dim)', border: '0.5px solid var(--brand-border)' } : undefined;

interface Props {
  items: ScholarshipWithMeta[];
}

const STATUS_CHIPS: { value: StatusFilter; label: string; dot?: string }[] = [
  { value: 'all',     label: 'All' },
  { value: 'active',  label: 'Active',  dot: '#22d3a5' },
  { value: 'closing', label: 'Closing', dot: '#f5b14a' },
  { value: 'closed',  label: 'Closed',  dot: '#ef5a5a' },
];

export default function ScholarshipList({ items }: Props) {
  const [searchFocused, setSearchFocused] = useState(false);
  const {
    filtered, visibleItems, page, totalPages, handlePageChange,
    sortBy, setSort, selectedRegion, setRegion,
    selectedCategory, setCategory,
    statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    sheetOpen, setSheetOpen, hasActiveFilters,
    savedIds, handleToggleSave, isFiltered,
    regionKey, categoryKey,
  } = useScholarships(items);

  useEffect(() => {
    const close = () => setSheetOpen(false);
    document.addEventListener('astro:before-preparation', close);
    return () => document.removeEventListener('astro:before-preparation', close);
  }, [setSheetOpen]);

  const savedSet   = useMemo(() => new Set(savedIds), [savedIds]);
  const categories = useMemo(
    () => [...new Set(items.map(s => s.category).filter(Boolean) as string[])].sort(),
    [items]
  );

  return (
    <div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {filtered.length} scholarship{filtered.length !== 1 ? 's' : ''} shown
      </span>

      {/* Search — desktop only */}
      <div className="hidden md:block mb-4">
        <div style={{ position: 'relative', borderRadius: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
            height: 42,
            background: 'var(--bg-card)',
            border: `1px solid ${searchFocused ? 'var(--brand-border)' : 'var(--border-card)'}`,
            borderRadius: 12,
            transition: 'border-color 200ms',
            boxShadow: searchFocused ? '0 0 0 3px rgba(34,211,165,0.12)' : 'none',
            position: 'relative', overflow: 'hidden',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={searchFocused ? 'var(--brand)' : 'var(--text-tertiary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, transition: 'stroke 200ms' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search by name or organization…"
              style={{
                flex: 1, border: 'none', background: 'transparent',
                color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit',
                outline: 'none', letterSpacing: '-0.01em',
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} aria-label="Clear search"
                style={{ width: 22, height: 22, borderRadius: 11, border: 'none', background: 'var(--bg-subtle)', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 4L4 12M4 4l8 8"/></svg>
              </button>
            )}
            {searchFocused && (
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
                background: `linear-gradient(180deg, transparent, var(--brand), transparent)`,
                animation: 'scanLine 1.8s ease-in-out infinite',
                boxShadow: '0 0 6px var(--brand)',
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Category chips — desktop only */}
      {categories.length > 0 && (
        <div className="hidden md:block">
          <div className="chips-row-wrap mb-4">
            <div className="flex chips-row gap-1.5 overflow-x-auto" style={{ flexWrap: 'nowrap' }}>
              <CategoryChips categories={categories} selected={selectedCategory} onSelect={setCategory} badges={SCHOLARSHIP_BADGES} mobile={false} />
            </div>
          </div>
        </div>
      )}

      {/* Mobile: count + filter button */}
      <FilterButton count={filtered.length} label="scholarship" hasActiveFilters={hasActiveFilters} open={sheetOpen} onOpen={() => setSheetOpen(true)} />

      {/* Region pills — desktop only */}
      <div className="hidden md:block">
        <div className="chips-row-wrap mb-5">
          <div className="flex chips-row gap-2 overflow-x-auto" style={{ flexWrap: 'nowrap' }}>
            {REGION_PILLS.map(({ value, label, dot }) => {
              const sel = selectedRegion === value;
              return (
                <button key={label} onClick={() => setRegion(value)} aria-pressed={sel}
                  className={chipCls(sel)} style={chipStyle(sel)}>
                  {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, display: 'inline-block', marginRight: 4, flexShrink: 0 }} />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop: count + status chips + sort pills */}
      <div className="hidden md:flex mb-5 items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          <p className="text-sm text-faint flex-shrink-0">
            {filtered.length} scholarship{filtered.length !== 1 ? 's' : ''}
            {hasActiveFilters && (
              <button
                onClick={() => { setCategory('all'); setRegion(null); setStatusFilter('all'); setSort('closest_due'); setSearchQuery(''); }}
                className="ml-2 text-brand underline underline-offset-2"
                style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Clear filters
              </button>
            )}
          </p>
          <div className="flex items-center gap-1">
            {STATUS_CHIPS.map(({ value, label, dot }) => {
              const active = statusFilter === value;
              return (
                <button key={value} onClick={() => setStatusFilter(value)} aria-pressed={active}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 border"
                  style={{
                    background: active ? (dot ? `${dot}18` : 'var(--bg-subtle)') : 'transparent',
                    borderColor: active ? (dot ? `${dot}44` : 'var(--border-card)') : 'transparent',
                    color: active ? (dot || 'var(--text-primary)') : 'var(--text-tertiary)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>
                  {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0, boxShadow: active ? `0 0 5px ${dot}` : 'none' }} />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button key={value} onClick={() => setSort(value as 'closest_due' | 'highest_pay' | 'lowest_pay')} aria-pressed={sortBy === value}
              className={`sort-pill whitespace-nowrap flex-shrink-0${sortBy === value ? ' active' : ''}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <FilterSheet open={sheetOpen} onOpenChange={setSheetOpen}>
        {categories.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-tertiary uppercase tracking-widest mb-3">Category</p>
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              <CategoryChips categories={categories} selected={selectedCategory} onSelect={setCategory} badges={SCHOLARSHIP_BADGES} mobile={true} />
            </div>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-tertiary uppercase tracking-widest mb-3">Region</p>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            {REGION_PILLS.map(({ value, label, dot }) => {
              const sel = selectedRegion === value;
              return (
                <button key={label} onClick={() => setRegion(value)} aria-pressed={sel}
                  className={`${pillBase} ${sel ? pillOn : pillOff}`}
                  style={sel ? { background: 'var(--brand-dim)', borderColor: 'var(--brand-border)' } : undefined}>
                  {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-tertiary uppercase tracking-widest mb-3">Sort</p>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            {SORT_OPTIONS.map(({ value, label }) => {
              const sel = sortBy === value;
              return (
                <button key={value} onClick={() => setSort(value as 'closest_due' | 'highest_pay' | 'lowest_pay')} aria-pressed={sel}
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
      <div key={`${regionKey}-${categoryKey}-${sortBy}-${page}`} className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ alignItems: 'stretch' }}>
        {visibleItems.map((s, i) => (
          <ScholarshipCard key={s.id} scholarship={s} index={i} isSaved={savedSet.has(s.id)} onToggleSave={() => handleToggleSave(s.id)} isFiltered={isFiltered} isInitial={!isFiltered && page === 1 && i < 16} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />

      {filtered.length === 0 && (
        <p className="text-center py-16 text-faint">No scholarships match your filters.</p>
      )}
    </div>
  );
}
