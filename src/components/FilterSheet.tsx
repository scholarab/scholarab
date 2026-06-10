import type { ReactNode } from 'react';
import { Drawer } from 'vaul';
import type { BadgeStyle } from '../lib/badges';

// ── FilterButton ──────────────────────────────────────────────────────────────

interface FilterButtonProps {
  count: number;
  label: string;
  hasActiveFilters: boolean;
  open: boolean;
  onOpen: () => void;
}

export function FilterButton({ count, label, hasActiveFilters, open, onOpen }: FilterButtonProps) {
  return (
    <div className="md:hidden mb-5 flex items-center justify-between gap-3">
      <p className="text-sm text-faint shrink-0">
        {count} {label}{count !== 1 ? 's' : ''}
      </p>
      <button
        onClick={onOpen}
        aria-expanded={open}
        aria-label="Open filters"
        className="relative shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors"
        style={{ borderColor: hasActiveFilters ? 'var(--brand-border)' : 'var(--border-medium)', color: hasActiveFilters ? 'var(--brand)' : 'var(--text-secondary)', background: hasActiveFilters ? 'var(--brand-dim)' : 'transparent' }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 3h12M5 8h6M7 13h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Filter
        {hasActiveFilters && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', position: 'absolute', top: 4, right: 4 }} />}
      </button>
    </div>
  );
}

// ── CategoryChips ─────────────────────────────────────────────────────────────

interface CategoryChipsProps {
  categories: string[];
  selected: string;
  onSelect: (cat: string) => void;
  badges: Record<string, BadgeStyle>;
  mobile: boolean;
}

export function CategoryChips({ categories, selected, onSelect, badges, mobile }: CategoryChipsProps) {
  const btnCls = `shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 ${mobile ? 'py-1.5' : 'py-1'} text-xs font-medium cursor-pointer transition-all duration-150 active:scale-95 select-none border`;
  return (
    <>
      <button onClick={() => onSelect('all')} aria-pressed={selected === 'all'}
        className={btnCls}
        style={selected === 'all'
          ? { background: 'var(--brand-dim)', borderColor: 'var(--brand-border)', color: 'var(--brand)' }
          : { background: 'var(--bg-subtle)', borderColor: 'var(--border-card)', color: 'var(--text-secondary)' }}>
        All
      </button>
      {categories.map(cat => {
        const badge = badges[cat];
        const sel = selected === cat;
        return (
          <button key={cat} onClick={() => onSelect(sel ? 'all' : cat)} aria-pressed={sel}
            className={sel ? `${btnCls} badge-chip` : btnCls}
            style={sel
              ? { background: badge ? badge.bg : 'var(--brand-dim)', borderColor: badge ? badge.border : 'var(--brand-border)', color: badge ? badge.color : 'var(--brand)' }
              : { background: 'var(--bg-subtle)', borderColor: 'var(--border-card)', color: 'var(--text-secondary)' }}>
            {badge?.emoji && <span aria-hidden="true">{badge.emoji}</span>}
            {cat}
          </button>
        );
      })}
    </>
  );
}

// ── FilterSheet ───────────────────────────────────────────────────────────────

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function FilterSheet({ open, onOpenChange, children }: FilterSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 md:hidden bg-black/45 backdrop-blur-xs" />
        <Drawer.Content
          aria-label="Filter and sort options"
          className="fixed left-0 right-0 z-50 md:hidden rounded-t-2xl flex flex-col outline-hidden"
          style={{ bottom: 64, backgroundColor: 'var(--bg-card)', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', maxHeight: 'calc(85vh - 64px)' }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-subtle shrink-0">
            <span className="font-semibold text-primary text-base">Filter & Sort</span>
            <button onClick={() => onOpenChange(false)} aria-label="Close"
              className="w-8 h-8 flex items-center justify-center rounded-full text-secondary hover:bg-subtle transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">
            {children}
          </div>
          <div className="shrink-0 px-5 py-4 border-t border-subtle"
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
            <button onClick={() => onOpenChange(false)}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--brand)', color: 'var(--bg-page)' }}>Done</button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
