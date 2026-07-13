import { useEffect, useMemo } from 'react';
import { usePrograms } from '../hooks/useItems.ts';
import type { ProgramWithMeta } from '../hooks/useItems.ts';
import { generateSlug } from '../lib/utils.ts';
import { sendEvent } from '../lib/events.ts';
import ErrorBoundary from './ErrorBoundary.tsx';

const SORT_CHIPS = [
  { value: 'closest_due', label: 'Earliest deadline' },
  { value: 'paid_first',  label: 'Paid first' },
  { value: 'name',        label: 'A–Z' },
] as const;

const GRADE_CHIPS = [9, 10, 11, 12];

interface Props {
  items: ProgramWithMeta[];
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" className={`sabl-chip${on ? ' on' : ''}`} onClick={onClick} aria-pressed={on}>
      {children}
    </button>
  );
}

function DueChip({ p }: { p: ProgramWithMeta }) {
  if (p.deadline === 'Ongoing') return <span className="sabl-mono sabl-due-chip ongoing">ONGOING — JOIN ANYTIME</span>;
  if (!p.deadline || p.deadline === 'TBA') return <span className="sabl-mono sabl-due-chip neutral">DEADLINE TBA</span>;
  const label = new Date(p.deadline + 'T00:00:00')
    .toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();
  return <span className="sabl-mono sabl-due-chip dated">DUE {label}</span>;
}

function ProgramList({ items }: Props) {
  const {
    filtered,
    sortBy, setSort,
    selectedCategory, setCategory, clearFilters,
    gradeFilter, setGradeFilter,
    searchQuery, setSearchQuery,
    savedIds, handleToggleSave,
  } = usePrograms(items);

  // Same content-gap signal as the scholarships directory
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3 || filtered.length > 0) return;
    const t = setTimeout(() => sendEvent('search_empty', undefined, undefined, q), 1000);
    return () => clearTimeout(t);
  }, [searchQuery, filtered.length]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of items) if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [items]);

  const paidCount = useMemo(() => filtered.filter(p => p.paid).length, [filtered]);

  return (
    <div className="sabl-page">
      {/* Title row */}
      <div className="sabl-title-row">
        <div>
          <h1 className="sabl-h1">Research programs</h1>
          <p className="sabl-desc">
            University-run summer programs, labs, and competitions open to Alberta high school students. Some even pay you.
          </p>
        </div>
        <div className="sabl-stat">
          <div className="sabl-stat-value tnum">{paidCount}</div>
          <div className="sabl-mono sabl-stat-label">PAID POSITIONS IN THIS LIST</div>
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
            placeholder="Search programs, universities, fields…"
            aria-label="Search programs by name, university, or field"
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
          <span className="sabl-mono sabl-row-label">FIELD</span>
          <Chip on={selectedCategory === 'all'} onClick={() => setCategory('all')}>All</Chip>
          {categories.map(c => (
            <Chip key={c} on={selectedCategory === c} onClick={() => setCategory(c)}>{c}</Chip>
          ))}
        </div>
        <div className="sabl-filter-row">
          <span className="sabl-mono sabl-row-label">GRADE</span>
          <Chip on={gradeFilter === null} onClick={() => setGradeFilter(null)}>All</Chip>
          {GRADE_CHIPS.map(g => (
            <Chip key={g} on={gradeFilter === g} onClick={() => setGradeFilter(g)}>{`Gr ${g}`}</Chip>
          ))}
        </div>
      </div>

      <div className="sabl-mono sabl-result-line">
        {filtered.length} OF {items.length} PROGRAMS SHOWN — EVERY ONE CHECKED BY HAND
      </div>

      {/* Results */}
      {filtered.length > 0 ? (
        <div className="sabl-grid">
          {filtered.map(p => {
            const saved = savedIds.includes(p.id);
            const slug = p._slug ?? generateSlug(p.name);
            const meta = [p.duration, p.grades, p.location].filter(Boolean) as string[];
            return (
              <div key={p.id} className="sabl-card">
                <div className="sabl-card-top">
                  <span className="sabl-mono sabl-tag">{(p.category ?? 'PROGRAM').toUpperCase()}</span>
                  {p.paid && <span className="sabl-mono sabl-paid">$ PAID</span>}
                </div>
                <a href={`/programs/${slug}`} className="sabl-name">{p.name}</a>
                {p.provider && <div className="sabl-org">{p.provider}</div>}
                {meta.length > 0 && (
                  <div className="sabl-meta-row">
                    {meta.map(m => <span key={m} className="sabl-meta">{m}</span>)}
                  </div>
                )}
                {p.description && <div className="sabl-blurb">{p.description}</div>}
                <div className="sabl-card-foot">
                  <DueChip p={p} />
                  <div className="sabl-card-actions">
                    <button
                      type="button"
                      className={`sabl-save${saved ? ' on' : ''}`}
                      onClick={e => handleToggleSave(p.id, e.currentTarget)}
                      aria-label={saved ? `Remove ${p.name} from saved` : `Save ${p.name}`}
                      aria-pressed={saved}
                    >
                      {saved ? '★' : '☆'}
                    </button>
                    <a href={`/programs/${slug}`} className="sabl-apply">Details →</a>
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

export default function ProgramListWithBoundary(props: Props) {
  return (
    <ErrorBoundary>
      <ProgramList {...props} />
    </ErrorBoundary>
  );
}
