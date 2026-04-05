import { useState, useRef, useEffect, useMemo } from 'react';
import { getSaved, toggleSaved, getSavedPrograms, toggleSavedProgram } from '../lib/tracker.ts';
import { formatDeadline, showToast } from '../lib/utils.ts';
import { getStatus } from '../hooks/useScholarships.ts';
import type { ScholarshipWithMeta } from '../hooks/useScholarships.ts';
import type { ProgramWithMeta } from '../hooks/usePrograms.ts';

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
  background: 'rgba(34,211,165,0.12)',
  backdropFilter: 'blur(16px) saturate(2)',
  WebkitBackdropFilter: 'blur(16px) saturate(2)',
  border: '0.5px solid rgba(34,211,165,0.4)',
  boxShadow: 'inset 0 1px 0 rgba(34,211,165,0.15), 0 1px 6px rgba(34,211,165,0.12)',
  color: '#22d3a5', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', transition: 'color 0.15s, background 0.15s, border-color 0.15s, box-shadow 0.15s',
  WebkitTapHighlightColor: 'transparent',
};

const BOUNCE_KEYFRAMES = [
  { transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(0.9)' },
  { transform: 'scale(1.05)' }, { transform: 'scale(1)' },
];

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
    const el = cardRef.current;
    if (!el) { onUnsave(); return; }
    el.animate(
      [{ transform: 'scale(1)', opacity: '1' }, { transform: 'scale(0.95)', opacity: '0' }],
      { duration: 200, easing: 'ease-out', fill: 'forwards' }
    ).onfinish = onUnsave;
  }

  return (
    <div
      ref={cardRef}
      className={`card p-5 flex flex-col gap-3 h-full ${isClosed ? '' : 'card-interactive'}`}
      style={{ opacity: isClosed ? 0.45 : isFuture ? 0.75 : undefined }}
    >
      <div className="flex items-start gap-2">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">{s.title}</h3>
      </div>
      <p className="font-bold text-lg leading-none" style={{ color: '#22d3a5' }}>{s.amount}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {s.deadline && (
          <span className="text-xs text-gray-400 dark:text-white/35">{formatDeadline(s.deadline)}</span>
        )}
        {s.region && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 border border-gray-200 dark:bg-white/[0.07] dark:text-white/50 dark:border-white/10">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: REGION_DOT_COLORS[s.region] || '#888', display: 'inline-block', flexShrink: 0 }} />
            {s.region}
          </span>
        )}
      </div>
      <div className="mt-auto" style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
        {isClosed ? (
          <button disabled className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-white/20">
            Closed
          </button>
        ) : isFuture ? (
          <button disabled className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold cursor-not-allowed bg-blue-50 text-blue-400 dark:bg-blue-500/[0.08] dark:text-blue-400">
            Opening Soon
          </button>
        ) : (
          <a
            href={s.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
            className="flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ background: '#22d3a5', color: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
    const el = cardRef.current;
    if (!el) { onUnsave(); return; }
    el.animate(
      [{ transform: 'scale(1)', opacity: '1' }, { transform: 'scale(0.95)', opacity: '0' }],
      { duration: 200, easing: 'ease-out', fill: 'forwards' }
    ).onfinish = onUnsave;
  }

  return (
    <div ref={cardRef} className="card card-interactive p-5 flex flex-col gap-3 h-full">
      <div className="flex items-start gap-2">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">{p.name}</h3>
      </div>
      {p.category && (
        <span className="self-start text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 border border-gray-200 dark:bg-white/[0.07] dark:text-white/50 dark:border-white/10">
          {p.category}
        </span>
      )}
      {p.deadline && p.deadline !== 'TBA' && p.deadline !== 'Ongoing' && (
        <span className="text-xs text-gray-400 dark:text-white/35">{formatDeadline(p.deadline)}</span>
      )}
      <div className="mt-auto" style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
        <a
          href={p.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
          className="flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold transition-opacity hover:opacity-85"
          style={{ background: '#22d3a5', color: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
    <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-gray-300 dark:border-white/20 text-sm text-gray-600 dark:text-white/50">
      <span>None saved yet.</span>
      <a
        href={href}
        className="text-xs font-semibold text-[#22d3a5] hover:opacity-75 transition-opacity"
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
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-600 dark:text-white/40 mb-4">Scholarships</h2>
        {savedScholarships.length === 0 ? (
          <SectionEmptyState href="/scholarships" label="Find scholarships" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {savedScholarships.map((s, i) => (
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
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-600 dark:text-white/40 mb-4">Research Programs</h2>
        {savedPrograms.length === 0 ? (
          <SectionEmptyState href="/programs" label="Find programs" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {savedPrograms.map((p, i) => (
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
