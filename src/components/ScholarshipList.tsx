import { useMemo, useEffect } from 'react';
import { useScholarships } from '../hooks/useScholarships.ts';
import ScholarshipCard from './ScholarshipCard.tsx';
import Pagination from './Pagination.tsx';
import { FilterButton, CategoryChips, FilterSheet } from './FilterSheet.tsx';
import type { ScholarshipWithMeta, StatusFilter } from '../hooks/useScholarships.ts';
import { SCHOLARSHIP_BADGES } from '../lib/badges.ts';

const REGION_PILLS = [
  { value: null,           label: 'All',         dot: undefined,   color: undefined,   bg: undefined,                    border: undefined },
  { value: 'Medicine Hat', label: 'Medicine Hat', dot: '#f97316',   color: '#f97316',   bg: 'rgba(249,115,22,0.15)',       border: 'rgba(249,115,22,0.35)' },
  { value: 'Alberta-wide', label: 'Alberta',      dot: '#22d3a5',   color: '#22d3a5',   bg: 'rgba(34,211,165,0.15)',       border: 'rgba(34,211,165,0.35)' },
  { value: 'National',     label: 'National',     dot: '#3b82f6',   color: '#60a5fa',   bg: 'rgba(59,130,246,0.15)',       border: 'rgba(59,130,246,0.35)' },
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
  { value: 'opening', label: 'Coming',  dot: '#3b82f6' },
];

export default function ScholarshipList({ items }: Props) {
  const {
    filtered, visibleItems, page, totalPages, handlePageChange,
    sortBy, setSort, selectedRegion, setRegion,
    selectedCategory, setCategory,
    statusFilter, setStatusFilter,
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
            {REGION_PILLS.map(({ value, label, dot, color, bg, border }) => {
              const sel = selectedRegion === value;
              const selStyle = sel
                ? color
                  ? { background: bg, border: `0.5px solid ${border}`, color }
                  : { background: 'var(--brand-dim)', border: '0.5px solid var(--brand-border)', color: 'var(--brand)' }
                : undefined;
              return (
                <button key={label} onClick={() => setRegion(value)} aria-pressed={sel}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 select-none ${sel ? '' : 'bg-subtle text-secondary border border-card hover:border-medium'}`}
                  style={selStyle}>
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
        <div style={{ display: 'inline-flex', padding: 3, borderRadius: 10, border: '1px solid var(--border-card)', background: 'var(--bg-card)', flexShrink: 0 }}>
          {SORT_OPTIONS.map(({ value, label }) => {
            const active = sortBy === value;
            const icon = active ? (value === 'closest_due' ? '◆' : value === 'highest_pay' ? '↑' : '↓') : null;
            return (
              <button key={value} onClick={() => setSort(value as 'closest_due' | 'highest_pay' | 'lowest_pay')} aria-pressed={active}
                style={{
                  padding: '5px 11px', fontSize: 12, fontWeight: active ? 600 : 500,
                  letterSpacing: '-0.01em', fontFamily: 'inherit',
                  border: 'none', borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: active ? 'var(--bg-subtle)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  transition: 'all 180ms',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                {icon && <span style={{ color: 'var(--brand)', fontSize: 10 }}>{icon}</span>}
                {label}
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
              <CategoryChips categories={categories} selected={selectedCategory} onSelect={setCategory} badges={SCHOLARSHIP_BADGES} mobile={true} />
            </div>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-tertiary uppercase tracking-widest mb-3">Region</p>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            {REGION_PILLS.map(({ value, label, dot, color, bg, border }) => {
              const sel = selectedRegion === value;
              const selStyle = sel
                ? color
                  ? { background: bg, borderColor: border, color }
                  : { background: 'var(--brand-dim)', borderColor: 'var(--brand-border)', color: 'var(--brand)' }
                : undefined;
              return (
                <button key={label} onClick={() => setRegion(value)} aria-pressed={sel}
                  className={`${pillBase} ${sel ? '' : pillOff}`}
                  style={selStyle}>
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
