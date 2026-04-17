import { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { getSaved, toggleSaved, getSavedPrograms, toggleSavedProgram } from '../lib/tracker.ts';
import { formatDeadline, showToast } from '../lib/utils.ts';
import { getStatus } from '../hooks/useScholarships.ts';
import type { ScholarshipWithMeta } from '../hooks/useScholarships.ts';
import type { ProgramWithMeta } from '../hooks/usePrograms.ts';

const DeadlineCalendar = lazy(() => import('./DeadlineCalendar.tsx'));

interface SavedListProps {
  initialScholarships: ScholarshipWithMeta[];
  initialPrograms: ProgramWithMeta[];
}

const REGION_DOT_COLORS: Record<string, string> = {
  'Medicine Hat': '#f97316',
  'Alberta':      '#22d3a5',
  'Alberta-wide': '#22d3a5',
  'National':     '#3b82f6',
};

const BOOKMARK_BTN_STYLE: React.CSSProperties = {
  width: 44, flexShrink: 0, alignSelf: 'stretch', borderRadius: 10,
  background: 'var(--brand-dim)',
  backdropFilter: 'blur(16px) saturate(2)',
  WebkitBackdropFilter: 'blur(16px) saturate(2)',
  border: '0.5px solid var(--brand-border)',
  color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', transition: 'color 0.15s, background 0.15s, border-color 0.15s, box-shadow 0.15s',
  WebkitTapHighlightColor: 'transparent',
};

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
  onWillRemove?: () => void;
  children: (triggerRemove: () => void) => React.ReactNode;
}

function RemovableItem({ onRemove, onWillRemove, children }: RemovableItemProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  function remove() {
    const el = wrapperRef.current;
    if (!el) { onRemove(); return; }
    onWillRemove?.();
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

interface ScholarshipCardProps {
  s: ScholarshipWithMeta;
  onUnsave: () => void;
}

function ScholarshipCard({ s, onUnsave }: ScholarshipCardProps) {
  const status   = getStatus(s);
  const isClosed = status === 'closed';
  const isFuture = status === 'future';
  const cardRef  = useRef<HTMLDivElement>(null);
  const bmkRef   = useRef<HTMLButtonElement>(null);

  function handleUnsave() {
    animateCardRemove(cardRef.current, onUnsave);
  }

  return (
    <div
      ref={cardRef}
      className={`card p-5 flex flex-col gap-3 h-full ${isClosed ? '' : 'card-interactive'}`}
      style={{ opacity: isClosed ? 0.45 : isFuture ? 0.75 : undefined }}
    >
      <div className="flex items-start gap-2">
        <h3 className="font-semibold text-sm text-primary leading-snug">{s.title}</h3>
      </div>
      <p className="font-bold text-lg leading-none text-brand">{s.amount}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {s.deadline && (
          <span className="text-xs text-tertiary">{formatDeadline(s.deadline)}</span>
        )}
        {s.region && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-subtle text-secondary border border-card">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: REGION_DOT_COLORS[s.region] || '#888', display: 'inline-block', flexShrink: 0 }} />
            {s.region}
          </span>
        )}
      </div>
      <div className="mt-auto" style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
        {isClosed ? (
          <button disabled className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold cursor-not-allowed bg-subtle text-faint">
            Closed
          </button>
        ) : isFuture ? (
          <button disabled className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold cursor-not-allowed bg-blue-500/[0.08] text-blue-400">
            Opening Soon
          </button>
        ) : (
          <a
            href={s.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
            className="flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ background: 'var(--brand)', color: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Apply Now
          </a>
        )}
        <button
          ref={bmkRef}
          onClick={() => {
            bmkRef.current?.animate(BOUNCE_KEYFRAMES, { duration: 380, easing: 'ease-out' });
            navigator.vibrate?.(12);
            showToast('Removed from saved');
            handleUnsave();
          }}
          aria-label="Remove bookmark"
          style={BOOKMARK_BTN_STYLE}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

interface ProgramCardProps {
  p: ProgramWithMeta;
  onUnsave: () => void;
}

function ProgramCard({ p, onUnsave }: ProgramCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const bmkRef  = useRef<HTMLButtonElement>(null);

  function handleUnsave() {
    animateCardRemove(cardRef.current, onUnsave);
  }

  return (
    <div ref={cardRef} className="card card-interactive p-5 flex flex-col gap-3 h-full">
      <div className="flex items-start gap-2">
        <h3 className="font-semibold text-sm text-primary leading-snug">{p.name}</h3>
      </div>
      {p.category && (
        <span className="self-start text-xs font-medium px-2 py-0.5 rounded-md bg-subtle text-secondary border border-card">
          {p.category}
        </span>
      )}
      {p.deadline && p.deadline !== 'TBA' && p.deadline !== 'Ongoing' && (
        <span className="text-xs text-tertiary">{formatDeadline(p.deadline)}</span>
      )}
      <div className="mt-auto" style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
        <a
          href={p.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
          className="flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold transition-opacity hover:opacity-85"
          style={{ background: 'var(--brand)', color: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          Learn More
        </a>
        <button
          ref={bmkRef}
          onClick={() => {
            bmkRef.current?.animate(BOUNCE_KEYFRAMES, { duration: 380, easing: 'ease-out' });
            navigator.vibrate?.(12);
            showToast('Removed from saved');
            handleUnsave();
          }}
          aria-label="Remove bookmark"
          style={BOOKMARK_BTN_STYLE}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}


function SectionEmptyState({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-medium text-sm text-secondary">
      <span>None saved yet.</span>
      <a
        href={href}
        className="text-xs font-semibold text-brand hover:opacity-75 transition-opacity"
      >
        {label} →
      </a>
    </div>
  );
}

export default function SavedList({ initialScholarships, initialPrograms }: SavedListProps) {
  const [savedScholarshipIds, setSavedScholarshipIds] = useState<number[]>([]);
  const [savedProgramIds, setSavedProgramIds] = useState<number[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedScholarshipIds([...getSaved()]);
    setSavedProgramIds([...getSavedPrograms()]);

    // Sync state when another tab saves/removes items
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

  const hasDeadlines = useMemo(() =>
    savedScholarships.some(s => s.deadline && s.deadline !== 'TBA') ||
    savedPrograms.some(p => p.deadline && p.deadline !== 'TBA' && p.deadline !== 'Ongoing'),
    [savedScholarships, savedPrograms]
  );

  function unsaveScholarship(id: number) {
    const next = toggleSaved(id);
    setSavedScholarshipIds([...next]);
  }

  function unsaveProgram(id: number) {
    const next = toggleSavedProgram(id);
    setSavedProgramIds([...next]);
  }

  return (
    <div className="saved-list space-y-10">
      {hasDeadlines && (
        <Suspense fallback={
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="h-3 w-32 rounded-full bg-subtle animate-pulse" />
              <div className="h-7 w-28 rounded-lg bg-subtle animate-pulse" />
            </div>
            <div className="flex items-center justify-between mb-5">
              <div className="w-8 h-8 rounded-full bg-subtle animate-pulse" />
              <div className="h-3 w-24 rounded-full bg-subtle animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-subtle animate-pulse" />
            </div>
            <div className="grid grid-cols-7 mb-1">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="h-3 mx-auto w-5 rounded-full bg-subtle animate-pulse" />
              ))}
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
      )}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-tertiary mb-4">Scholarships</h2>
        {savedScholarships.length === 0 ? (
          <SectionEmptyState href="/scholarships" label="Find scholarships" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {savedScholarships.map((s) => (
              <RemovableItem
                key={s.id}
                onRemove={() => unsaveScholarship(s.id)}
              >
                {(triggerRemove) => (
                  <ScholarshipCard s={s} onUnsave={triggerRemove} />
                )}
              </RemovableItem>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-tertiary mb-4">Research Programs</h2>
        {savedPrograms.length === 0 ? (
          <SectionEmptyState href="/programs" label="Find programs" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {savedPrograms.map((p) => (
              <RemovableItem
                key={p.id}
                onRemove={() => unsaveProgram(p.id)}
              >
                {(triggerRemove) => (
                  <ProgramCard p={p} onUnsave={triggerRemove} />
                )}
              </RemovableItem>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
