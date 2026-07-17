import { useEffect, useMemo } from 'react';
import { useScholarships, getScholarshipStatus } from '../hooks/useItems.ts';
import type { ScholarshipWithMeta, StatusFilter } from '../hooks/useItems.ts';
import { generateSlug, parseAmount } from '../lib/utils.ts';
import { categoryEmoji } from '../lib/category-emoji.ts';
import { sendEvent } from '../lib/events.ts';
import ErrorBoundary from './ErrorBoundary.tsx';

// Region keys must line up with REGION_MATCH in useItems
const REGION_CHIPS = [
  { value: null,           label: 'All' },
  { value: 'Medicine Hat', label: 'Medicine Hat' },
  { value: 'Alberta-wide', label: 'Alberta' },
  { value: 'National',     label: 'National' },
] as const;

const SORT_CHIPS = [
  { value: 'closest_due', label: 'Earliest deadline' },
  { value: 'highest_pay', label: 'Highest $' },
  { value: 'lowest_pay',  label: 'Lowest $' },
] as const;

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: 'all',     label: 'All' },
  { value: 'active',  label: 'Open' },
  { value: 'opening', label: 'Opening soon' },
  { value: 'closed',  label: 'Closed' },
];

interface Props {
  items: ScholarshipWithMeta[];
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" className={`sabl-chip${on ? ' on' : ''}`} onClick={onClick} aria-pressed={on}>
      {children}
    </button>
  );
}

function shortDate(iso: string): string {
  return new Date(iso + 'T00:00:00')
    .toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    .toUpperCase();
}

function DaysChip({ s }: { s: ScholarshipWithMeta }) {
  const status = getScholarshipStatus(s);
  if (status === 'closed') return <span className="sabl-days neutral">CLOSED</span>;
  if (status === 'future') {
    return <span className="sabl-days neutral">{s.openDate ? `OPENS ${shortDate(s.openDate)}` : 'OPENING SOON'}</span>;
  }
  if (!s.deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.round((new Date(s.deadline + 'T00:00:00').getTime() - today.getTime()) / 86400000));
  const label = days === 0 ? 'DUE TODAY' : `${days} ${days === 1 ? 'DAY' : 'DAYS'} LEFT`;
  return <span className={`sabl-days${days <= 7 ? ' urgent' : ''}`}>{label}</span>;
}

function ScholarshipList({ items }: Props) {
  const {
    filtered,
    sortBy, setSort,
    selectedRegion, setRegion,
    selectedCategory, setCategory, clearFilters,
    statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    savedIds, handleToggleSave,
  } = useScholarships(items);

  // A search that settles on zero results for a second is a content gap worth
  // knowing about. The timeout cancels while the user is still typing. Only a
  // query that matches nothing in the FULL directory counts — zero results
  // caused by an active category/region/status filter is not a content gap.
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3 || filtered.length > 0) return;
    const ql = q.toLowerCase();
    const matchesAnywhere = items.some(s =>
      s.title?.toLowerCase().includes(ql) ||
      s.audience?.toLowerCase().includes(ql) ||
      s.category?.toLowerCase().includes(ql)
    );
    if (matchesAnywhere) return;
    const t = setTimeout(() => sendEvent('search_empty', undefined, undefined, q), 1000);
    return () => clearTimeout(t);
  }, [searchQuery, filtered.length, items]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of items) if (s.category) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [items]);

  // "$X open across these listings" — active money only, follows the filters
  const totalOpen = useMemo(
    () => filtered.reduce((sum, s) => sum + (getScholarshipStatus(s) === 'active' ? (s._amount ?? parseAmount(s.amount)) : 0), 0),
    [filtered],
  );

  return (
    <div className="sabl-page">
      {/* Title row */}
      <div className="sabl-title-row">
        <div>
          <h1 className="sabl-h1">Scholarships</h1>
          <p className="sabl-desc">
            Open scholarships for Alberta high school students, verified by hand and updated weekly. If it's listed here, it's real and it's open.
          </p>
        </div>
        <div className="sabl-stat">
          <div className="sabl-stat-value tnum">${totalOpen.toLocaleString('en-CA')}</div>
          <div className="sabl-mono sabl-stat-label">OPEN ACROSS THESE LISTINGS</div>
        </div>
      </div>

      {/* Toolbar: search + sort */}
      <div className="sabl-toolbar">
        <div className="sabl-search">
          <span className="sabl-search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or keyword…"
            aria-label="Search scholarships by name or keyword"
          />
        </div>
        <div className="sabl-sort">
          <span className="sabl-mono sabl-row-label">SORT</span>
          {SORT_CHIPS.map(s => (
            <Chip key={s.value} on={sortBy === s.value} onClick={() => setSort(s.value)}>{s.label}</Chip>
          ))}
        </div>
      </div>

      {/* Filter rows */}
      <div className="sabl-filters">
        <div className="sabl-filter-row">
          <span className="sabl-mono sabl-row-label">TRACK</span>
          <Chip on={selectedCategory === 'all'} onClick={() => setCategory('all')}>All</Chip>
          {categories.map(c => (
            <Chip key={c} on={selectedCategory === c} onClick={() => setCategory(c)}>{c}</Chip>
          ))}
        </div>
        <div className="sabl-filter-row">
          <span className="sabl-mono sabl-row-label">REGION</span>
          {REGION_CHIPS.map(r => (
            <Chip
              key={r.label}
              on={selectedRegion === r.value}
              onClick={() => setRegion(r.value as Parameters<typeof setRegion>[0])}
            >{r.label}</Chip>
          ))}
        </div>
        <div className="sabl-filter-row">
          <span className="sabl-mono sabl-row-label">STATUS</span>
          {STATUS_CHIPS.map(s => (
            <Chip key={s.value} on={statusFilter === s.value} onClick={() => setStatusFilter(s.value)}>{s.label}</Chip>
          ))}
        </div>
      </div>

      <div className="sabl-mono sabl-result-line">
        {filtered.length} OF {items.length} LISTINGS SHOWN · EVERY ONE CHECKED BY HAND
      </div>

      {/* Results */}
      {filtered.length > 0 ? (
        <div className="sabl-grid">
          {filtered.map(s => {
            const status = getScholarshipStatus(s);
            const saved = savedIds.includes(s.id);
            return (
              <div key={s.id} className="sabl-card">
                <div className="sabl-card-top">
                  <span className="sabl-mono sabl-tag">
                    {categoryEmoji(s.category) && <span className="sabl-tag-emoji" aria-hidden="true">{categoryEmoji(s.category)} </span>}
                    {(s.category ?? 'GENERAL').toUpperCase()}
                  </span>
                  <DaysChip s={s} />
                </div>
                <a href={`/scholarships/${s._slug ?? generateSlug(s.title)}`} className="sabl-name">{s.title}</a>
                <div className="sabl-amount">{s.amount}</div>
                {s.audience && <div className="sabl-blurb">{s.audience}</div>}
                <div className="sabl-card-foot">
                  <span className="sabl-due">
                    {s.deadline ? `DUE ${shortDate(s.deadline)}` : 'NO FIXED DEADLINE'}
                  </span>
                  <div className="sabl-card-actions">
                    <button
                      type="button"
                      className={`sabl-save${saved ? ' on' : ''}`}
                      onClick={e => handleToggleSave(s.id, e.currentTarget)}
                      aria-label={saved ? `Remove ${s.title} from saved` : `Save ${s.title}`}
                      aria-pressed={saved}
                    >
                      {saved ? '★' : '☆'}
                    </button>
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                        className="sabl-apply"
                        onClick={() => sendEvent('apply_click', 'scholarship', s.id)}
                      >
                        {status === 'active' ? 'Apply →' : 'Visit →'}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="sabl-empty">
          <div className="sabl-empty-title">Nothing matches that.</div>
          <div className="sabl-empty-sub">Try clearing a filter or searching something broader.</div>
          <button type="button" className="sabl-empty-btn" onClick={clearFilters}>Clear all filters</button>
        </div>
      )}
    </div>
  );
}

export default function ScholarshipListWithBoundary(props: Props) {
  return (
    <ErrorBoundary>
      <ScholarshipList {...props} />
    </ErrorBoundary>
  );
}
