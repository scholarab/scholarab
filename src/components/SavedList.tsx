import { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { getSaved, toggleSaved, getSavedPrograms, toggleSavedProgram } from '../lib/tracker.ts';
import { formatDeadline, showToast, getToday } from '../lib/utils.ts';
import { getStatus } from '../hooks/useScholarships.ts';
import type { ScholarshipWithMeta } from '../hooks/useScholarships.ts';
import type { ProgramWithMeta } from '../hooks/usePrograms.ts';

const DeadlineCalendar = lazy(() => import('./DeadlineCalendar.tsx'));

interface SavedListProps {
  initialScholarships: ScholarshipWithMeta[];
  initialPrograms: ProgramWithMeta[];
}

const BOUNCE_KEYFRAMES = [
  { transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(0.9)' },
  { transform: 'scale(1.05)' }, { transform: 'scale(1)' },
];

function animateCardRemove(el: HTMLElement | null, onDone: () => void) {
  if (!el) { onDone(); return; }
  el.animate(
    [{ transform: 'scale(1)', opacity: '1' }, { transform: 'scale(0.95)', opacity: '0' }],
    { duration: 200, easing: 'ease-out', fill: 'forwards' }
  ).onfinish = onDone;
}

interface RemovableItemProps {
  onRemove: () => void;
  children: (triggerRemove: () => void) => React.ReactNode;
}

function RemovableItem({ onRemove, children }: RemovableItemProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  function remove() {
    const el = wrapperRef.current;
    if (!el) { onRemove(); return; }
    el.style.overflow = 'hidden';
    el.style.transformOrigin = 'top';
    el.animate(
      [{ transform: 'scaleY(1)', opacity: '1' }, { transform: 'scaleY(0)', opacity: '0' }],
      { duration: 220, easing: 'ease-in', fill: 'forwards' }
    ).onfinish = () => {
      el.style.height = '0';
      el.style.margin = '0';
      el.style.padding = '0';
      onRemove();
    };
  }

  // eslint-disable-next-line react-hooks/refs
  return <div ref={wrapperRef} className="h-full">{children(remove)}</div>;
}

interface SavedScholarshipCardProps {
  s: ScholarshipWithMeta;
  onUnsave: () => void;
}

function SavedScholarshipCard({ s, onUnsave }: SavedScholarshipCardProps) {
  const status = getStatus(s);
  const isClosed = status === 'closed';
  const isUpcoming = status === 'future';
  const cardRef = useRef<HTMLDivElement>(null);
  const bmkRef = useRef<HTMLButtonElement>(null);

  const today = getToday();
  const daysLeft = status === 'active' && s.deadline
    ? Math.ceil((new Date(s.deadline + 'T00:00:00').getTime() - today.getTime()) / 86400000)
    : null;
  const deadlineSoon = daysLeft !== null && daysLeft <= 30;

  const statusLabel = isClosed ? 'Closed' : isUpcoming ? 'Coming Soon' : deadlineSoon ? 'Closing Soon' : 'Active';
  const statusColor = isClosed
    ? 'var(--text-faint)'
    : isUpcoming
      ? '#3b82f6'
      : deadlineSoon
        ? 'var(--color-warning)'
        : 'var(--brand)';

  const deadlineLabel = isUpcoming ? 'Opens' : 'Deadline';
  const deadlineValue = isUpcoming
    ? (formatDeadline(s.openDate) || 'TBA')
    : formatDeadline(s.deadline);
  const deadlineColor = isClosed
    ? 'var(--text-faint)'
    : isUpcoming
      ? '#3b82f6'
      : deadlineSoon
        ? 'var(--color-warning)'
        : 'var(--text-secondary)';

  const statusBarBg = isClosed
    ? 'var(--text-faint)'
    : isUpcoming
      ? '#3b82f6'
      : deadlineSoon
        ? 'var(--color-warning)'
        : 'var(--brand)';

  return (
    <div
      ref={cardRef}
      className="card h-full"
      style={{
        opacity: isClosed ? 0.5 : isUpcoming ? 0.8 : undefined,
        paddingLeft: 22, paddingRight: 18, paddingTop: 18, paddingBottom: 18,
        position: 'relative',
      }}
    >
      {/* Left status bar */}
      <div style={{
        position: 'absolute', left: 0, top: 12, bottom: 12, width: 3,
        borderRadius: 2, background: statusBarBg,
        boxShadow: status === 'active' ? `0 0 8px ${statusBarBg}` : 'none',
      }} />

      {/* Card body */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header: status chip + bookmark */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
            textTransform: 'uppercase', color: statusColor,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: statusColor, flexShrink: 0,
              animation: status === 'active' ? 'statusPulse 2s ease-in-out infinite' : 'none',
              boxShadow: status === 'active' ? `0 0 6px ${statusColor}` : 'none',
            }} />
            {statusLabel}
          </span>
          <button
            ref={bmkRef}
            onClick={() => {
              bmkRef.current?.animate(BOUNCE_KEYFRAMES, { duration: 380, easing: 'ease-out' });
              navigator.vibrate?.(12);
              showToast('Removed from saved');
              animateCardRemove(cardRef.current, onUnsave);
            }}
            aria-label="Remove bookmark"
            style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              border: '1px solid rgba(var(--brand-rgb),0.4)',
              background: 'var(--brand-dim)',
              color: 'var(--brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 150ms',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>

        {/* Title + org */}
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em',
            lineHeight: 1.25, marginBottom: 4,
            color: isClosed ? 'var(--text-faint)' : 'var(--text-primary)',
          }}>
            {s.title}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 0 }}>
            {s.audience}
          </p>
        </div>

        {/* Amount + deadline */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
          marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)',
        }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3, color: 'var(--text-faint)' }}>Award</p>
            <p style={{
              fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em',
              lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
              color: isClosed ? 'var(--text-faint)' : 'var(--brand)',
            }}>
              {s.amount}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3, color: 'var(--text-faint)' }}>{deadlineLabel}</p>
            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', color: deadlineColor }}>
              {deadlineValue}
            </p>
            {status === 'active' && daysLeft !== null && daysLeft <= 60 && (
              <span style={{
                fontSize: 10, marginTop: 3, display: 'block', fontWeight: 600,
                color: daysLeft <= 7 ? 'var(--color-urgent)' : daysLeft <= 30 ? 'var(--color-warning)' : 'var(--text-faint)',
              }}>
                {daysLeft === 0 ? 'Ends today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
              </span>
            )}
          </div>
        </div>

        {/* Category tag */}
        {s.category && (
          <div style={{ marginTop: 12 }}>
            <span style={{
              display: 'inline-flex', padding: '3px 8px', borderRadius: 6,
              fontSize: 11, fontWeight: 600,
              background: 'var(--bg-subtle)', color: 'var(--text-secondary)',
              border: '0.5px solid var(--border-card)',
            }}>
              {s.category}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface SavedProgramCardProps {
  p: ProgramWithMeta;
  onUnsave: () => void;
}

function SavedProgramCard({ p, onUnsave }: SavedProgramCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const bmkRef = useRef<HTMLButtonElement>(null);

  return (
    <div ref={cardRef} className="card h-full" style={{ paddingLeft: 22, paddingRight: 18, paddingTop: 18, paddingBottom: 18, position: 'relative' }}>
      <div style={{
        position: 'absolute', left: 0, top: 12, bottom: 12, width: 3,
        borderRadius: 2, background: '#a78bfa',
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          {p.category && (
            <span style={{
              display: 'inline-flex', padding: '2px 8px', borderRadius: 6,
              fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              background: 'rgba(167,139,250,0.12)', color: '#a78bfa',
              border: '0.5px solid rgba(167,139,250,0.3)',
            }}>
              {p.category}
            </span>
          )}
          <button
            ref={bmkRef}
            onClick={() => {
              bmkRef.current?.animate(BOUNCE_KEYFRAMES, { duration: 380, easing: 'ease-out' });
              navigator.vibrate?.(12);
              showToast('Removed from saved');
              animateCardRemove(cardRef.current, onUnsave);
            }}
            aria-label="Remove bookmark"
            style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              border: '1px solid rgba(var(--brand-rgb),0.4)',
              background: 'var(--brand-dim)', color: 'var(--brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 150ms', marginLeft: 'auto',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 4, color: 'var(--text-primary)' }}>
            {p.name}
          </h3>
          {p.provider && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {p.provider}
            </p>
          )}
        </div>

        {(p.deadline && p.deadline !== 'TBA' && p.deadline !== 'Ongoing') && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3, color: 'var(--text-faint)' }}>Deadline</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatDeadline(p.deadline)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-medium text-sm text-secondary">
      <span>None saved yet.</span>
      <a href={href} className="text-xs font-semibold text-brand hover:opacity-75 transition-opacity">
        {label} →
      </a>
    </div>
  );
}

export default function SavedList({ initialScholarships, initialPrograms }: SavedListProps) {
  const [savedScholarshipIds, setSavedScholarshipIds] = useState<number[]>([]);
  const [savedProgramIds, setSavedProgramIds] = useState<number[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedScholarshipIds([...getSaved()]);
    setSavedProgramIds([...getSavedPrograms()]);

    function handleStorage(e: StorageEvent) {
      if (e.key === 'scholarab_saved')          setSavedScholarshipIds([...getSaved()]);
      if (e.key === 'scholarab_saved_programs') setSavedProgramIds([...getSavedPrograms()]);
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const savedScholarships = useMemo(() => {
    const idSet = new Set(savedScholarshipIds);
    return initialScholarships.filter(s => idSet.has(s.id));
  }, [initialScholarships, savedScholarshipIds]);

  const savedPrograms = useMemo(() => {
    const idSet = new Set(savedProgramIds);
    return initialPrograms.filter(p => idSet.has(p.id));
  }, [initialPrograms, savedProgramIds]);

  const totalCount = savedScholarships.length + savedPrograms.length;

  function unsaveScholarship(id: number) {
    const next = toggleSaved(id);
    setSavedScholarshipIds([...next]);
  }

  function unsaveProgram(id: number) {
    const next = toggleSavedProgram(id);
    setSavedProgramIds([...next]);
  }

  return (
    <div>
      {/* Page header */}
      <h1 style={{
        margin: '0 0 6px',
        fontSize: 'clamp(30px, 5vw, 52px)',
        fontWeight: 800, letterSpacing: '-0.04em',
        color: 'var(--text-primary)', lineHeight: 1,
      }}>
        Saved
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, fontVariantNumeric: 'tabular-nums' }}>
        {totalCount} {totalCount === 1 ? 'item' : 'items'} bookmarked
      </p>

      {/* View toggle */}
      <div style={{
        display: 'flex', gap: 4, padding: 3, borderRadius: 10,
        border: '1px solid var(--border-card)',
        width: 'fit-content', marginBottom: 28,
        background: 'var(--bg-subtle)',
      }}>
        {(['list', 'calendar'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className={view === k ? 'saved-view-toggle saved-view-toggle--active' : 'saved-view-toggle'}
            style={{
              padding: '6px 16px', fontSize: 13, fontWeight: 500,
              borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              color: view === k ? 'var(--text-primary)' : 'var(--text-secondary)',
              transition: 'all 200ms',
            }}
          >
            {k.charAt(0).toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>

      {view === 'calendar' ? (
        <Suspense fallback={
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="h-3 w-32 rounded-full bg-subtle animate-pulse" />
              <div className="h-7 w-28 rounded-lg bg-subtle animate-pulse" />
            </div>
            <div className="grid grid-cols-7 gap-y-3 mt-3">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-5 w-5 mx-auto rounded-full bg-subtle animate-pulse" style={{ opacity: 0.4 + (i % 3) * 0.2 }} />
              ))}
            </div>
          </div>
        }>
          <DeadlineCalendar scholarships={savedScholarships} programs={savedPrograms} />
        </Suspense>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-tertiary mb-4">Scholarships</h2>
            {savedScholarships.length === 0 ? (
              <EmptyState href="/scholarships" label="Find scholarships" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {savedScholarships.map((s) => (
                  <RemovableItem key={s.id} onRemove={() => unsaveScholarship(s.id)}>
                    {(triggerRemove) => (
                      <SavedScholarshipCard s={s} onUnsave={triggerRemove} />
                    )}
                  </RemovableItem>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-tertiary mb-4">Research Programs</h2>
            {savedPrograms.length === 0 ? (
              <EmptyState href="/programs" label="Find programs" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {savedPrograms.map((p) => (
                  <RemovableItem key={p.id} onRemove={() => unsaveProgram(p.id)}>
                    {(triggerRemove) => (
                      <SavedProgramCard p={p} onUnsave={triggerRemove} />
                    )}
                  </RemovableItem>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
