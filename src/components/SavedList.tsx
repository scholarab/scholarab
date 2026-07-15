import { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { getSaved, toggleSaved, getSavedPrograms, toggleSavedProgram } from '../lib/tracker.ts';
import { showToast, getToday, prefersReducedMotion, generateSlug } from '../lib/utils.ts';
import { getScholarshipStatus as getStatus } from '../hooks/useItems.ts';
import type { ScholarshipWithMeta, ProgramWithMeta } from '../hooks/useItems.ts';
import { sendEvent } from '../lib/events.ts';
import { categoryEmoji } from '../lib/category-emoji.ts';
import ErrorBoundary from './ErrorBoundary.tsx';

const DeadlineCalendar = lazy(() => import('./DeadlineCalendar.tsx'));

interface SavedListProps {
  initialScholarships: ScholarshipWithMeta[];
  initialPrograms: ProgramWithMeta[];
}

const BOUNCE_KEYFRAMES = [
  { transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(0.9)' },
  { transform: 'scale(1.05)' }, { transform: 'scale(1)' },
];

/** Run onDone when the animation settles — including if it's cancelled (unmount, page swap). */
function animateThen(anim: Animation | undefined, onDone: () => void) {
  if (anim?.finished?.then) anim.finished.then(onDone, onDone);
  else onDone();
}

function animateCardRemove(el: HTMLElement | null, onDone: () => void) {
  if (!el) { onDone(); return; }
  if (el.dataset.removing) return;
  el.dataset.removing = 'true';
  if (prefersReducedMotion()) { onDone(); return; }
  const anim = el.animate(
    [{ transform: 'scale(1)', opacity: '1' }, { transform: 'scale(0.95)', opacity: '0' }],
    { duration: 200, easing: 'ease-out', fill: 'forwards' }
  );
  animateThen(anim, onDone);
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
    const finish = () => {
      el.style.height = '0';
      el.style.margin = '0';
      el.style.padding = '0';
      onRemove();
    };
    if (prefersReducedMotion()) { finish(); return; }
    el.style.overflow = 'hidden';
    el.style.transformOrigin = 'top';
    const anim = el.animate(
      [{ transform: 'scaleY(1)', opacity: '1' }, { transform: 'scaleY(0)', opacity: '0' }],
      { duration: 220, easing: 'ease-in', fill: 'forwards' }
    );
    animateThen(anim, finish);
  }

  // eslint-disable-next-line react-hooks/refs
  return <div ref={wrapperRef} className="h-full">{children(remove)}</div>;
}

/** Filled-star remove button shared by both card types. */
function RemoveButton({ cardRef, onUnsave, label }: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  onUnsave: () => void;
  label: string;
}) {
  const bmkRef = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={bmkRef}
      type="button"
      onClick={() => {
        if (cardRef.current?.dataset.removing) return;
        if (!prefersReducedMotion()) {
          bmkRef.current?.animate(BOUNCE_KEYFRAMES, { duration: 380, easing: 'ease-out' });
        }
        navigator.vibrate?.(12);
        showToast('Removed from saved');
        animateCardRemove(cardRef.current, onUnsave);
      }}
      aria-label={label}
      className="sabl-save on"
    >
      ★
    </button>
  );
}

function shortDate(iso: string): string {
  return new Date(iso + 'T00:00:00')
    .toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ScholarshipDaysChip({ s }: { s: ScholarshipWithMeta }) {
  const status = getStatus(s);
  if (status === 'closed') return <span className="sabl-days neutral">CLOSED</span>;
  if (status === 'future') {
    return <span className="sabl-days neutral">{s.openDate ? `OPENS ${shortDate(s.openDate).toUpperCase()}` : 'OPENING SOON'}</span>;
  }
  if (!s.deadline) return <span className="sabl-days neutral">ROLLING</span>;
  const days = Math.max(0, Math.round((new Date(s.deadline + 'T00:00:00').getTime() - getToday().getTime()) / 86400000));
  const label = days === 0 ? 'DUE TODAY' : `${days} ${days === 1 ? 'DAY' : 'DAYS'} LEFT`;
  return <span className={`sabl-days${days <= 7 ? ' urgent' : ''}`}>{label}</span>;
}

function ProgramDaysChip({ p }: { p: ProgramWithMeta }) {
  if (!p.deadline || p.deadline === 'TBA' || p.deadline === 'Ongoing') {
    return <span className="sabl-days neutral">ROLLING</span>;
  }
  const days = Math.max(0, Math.round((new Date(p.deadline + 'T00:00:00').getTime() - getToday().getTime()) / 86400000));
  const label = days === 0 ? 'DUE TODAY' : `${days} ${days === 1 ? 'DAY' : 'DAYS'} LEFT`;
  return <span className={`sabl-days${days <= 7 ? ' urgent' : ''}`}>{label}</span>;
}

function SavedScholarshipCard({ s, onUnsave }: { s: ScholarshipWithMeta; onUnsave: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const status = getStatus(s);
  return (
    <div ref={cardRef} className="sabl-card h-full">
      <div className="sabl-card-top">
        <span className="sabl-mono sabl-tag">
          {categoryEmoji(s.category) && <span className="sabl-tag-emoji" aria-hidden="true">{categoryEmoji(s.category)} </span>}
          {(s.category ?? 'GENERAL').toUpperCase()}
        </span>
        <ScholarshipDaysChip s={s} />
      </div>
      <a href={`/scholarships/${generateSlug(s.title)}`} className="sabl-name">{s.title}</a>
      <div className="sabl-amount">{s.amount}</div>
      {s.audience && <div className="sabl-blurb">{s.audience}</div>}
      <div className="sabl-card-foot">
        <span className="sabl-due">
          {s.deadline ? `DUE ${shortDate(s.deadline).toUpperCase()}` : 'NO FIXED DEADLINE'}
        </span>
        <div className="sabl-card-actions">
          <RemoveButton cardRef={cardRef} onUnsave={onUnsave} label="Remove bookmark" />
          {status === 'active' && s.url && (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="sabl-apply"
              onClick={() => sendEvent('apply_click', 'scholarship', s.id)}
            >Apply →</a>
          )}
        </div>
      </div>
    </div>
  );
}

function SavedProgramCard({ p, onUnsave }: { p: ProgramWithMeta; onUnsave: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={cardRef} className="sabl-card h-full">
      <div className="sabl-card-top">
        <span className="sabl-mono sabl-tag">{(p.category ?? 'PROGRAM').toUpperCase()}</span>
        <ProgramDaysChip p={p} />
      </div>
      <a href={`/programs/${generateSlug(p.name)}`} className="sabl-name">
        {p.emoji && <span className="sabl-name-emoji" aria-hidden="true">{p.emoji} </span>}
        {p.name}
      </a>
      {p.provider && <div className="sabl-org" style={{ margin: '10px 0 0' }}>{p.provider.toUpperCase()}</div>}
      {p.description && <div className="sabl-blurb" style={{ marginTop: 14 }}>{p.description}</div>}
      <div className="sabl-card-foot">
        <span className="sabl-due">
          {p.deadline && p.deadline !== 'TBA' && p.deadline !== 'Ongoing'
            ? `DUE ${shortDate(p.deadline).toUpperCase()}`
            : p.deadline === 'Ongoing' ? 'ROLLING INTAKE' : 'DEADLINE TBA'}
        </span>
        <div className="sabl-card-actions">
          <RemoveButton cardRef={cardRef} onUnsave={onUnsave} label="Remove bookmark" />
          <a href={`/programs/${generateSlug(p.name)}`} className="sabl-apply">Details →</a>
        </div>
      </div>
    </div>
  );
}

function SavedListSkeleton() {
  return (
    <div>
      <div style={{ height: 16, width: 130, borderRadius: 6, background: 'rgba(20,25,21,0.08)', marginBottom: 16 }} className="animate-pulse" />
      <div style={{ height: 64, width: 220, borderRadius: 10, background: 'rgba(20,25,21,0.08)', marginBottom: 20 }} className="animate-pulse" />
      <div style={{ height: 16, width: 260, borderRadius: 6, background: 'rgba(20,25,21,0.08)', marginBottom: 40 }} className="animate-pulse" />
      <div className="sabl-grid">
        {[0, 1, 2].map(i => (
          <div key={i} className="animate-pulse" style={{ height: 220, borderRadius: 16, background: 'rgba(20,25,21,0.06)' }} />
        ))}
      </div>
    </div>
  );
}

function SavedList({ initialScholarships, initialPrograms }: SavedListProps) {
  const [mounted, setMounted] = useState(false);
  const [savedScholarshipIds, setSavedScholarshipIds] = useState<number[]>([]);
  const [savedProgramIds, setSavedProgramIds] = useState<number[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
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
  const empty = totalCount === 0;

  if (!mounted) return <div className="sabl-page"><SavedListSkeleton /></div>;

  function unsaveScholarship(id: number) {
    const next = toggleSaved(id);
    setSavedScholarshipIds([...next]);
  }

  function unsaveProgram(id: number) {
    const next = toggleSavedProgram(id);
    setSavedProgramIds([...next]);
  }

  const countLine = empty
    ? '0 items bookmarked. Your shortlist lives here.'
    : `${totalCount} ${totalCount === 1 ? 'item' : 'items'} bookmarked: ${savedScholarships.length} scholarship${savedScholarships.length === 1 ? '' : 's'}, ${savedPrograms.length} program${savedPrograms.length === 1 ? '' : 's'}.`;

  return (
    <div className="sabl-page">
      {/* Title row */}
      <div className="sabl-title-row">
        <div>
          <h1 className="sabl-h1">Saved</h1>
          <p className="sabl-desc tnum">{countLine}</p>
        </div>
        <div className="sabs-toggle" role="group" aria-label="View">
          {(['list', 'calendar'] as const).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setView(k)}
              className={`sabs-toggle-btn${view === k ? ' on' : ''}`}
              aria-pressed={view === k}
            >
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {empty ? (
        <div className="sabl-empty" style={{ marginTop: 56 }}>
          <div className="sabl-mono sabs-empty-count">◦ 0 BOOKMARKS</div>
          <div className="sabl-empty-title">Nothing saved yet.</div>
          <div className="sabl-empty-sub" style={{ maxWidth: 420, margin: '0 auto 30px' }}>
            Bookmark scholarships and programs to track their deadlines in one place.
          </div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/scholarships" className="sabm-btn-accent">Browse scholarships</a>
            <a href="/programs" className="sabm-btn-outline" style={{ textDecoration: 'none', display: 'inline-block' }}>Browse programs</a>
          </div>
        </div>
      ) : view === 'calendar' ? (
        <Suspense fallback={
          <div className="sabs-cal-card" style={{ marginTop: 48 }}>
            <div className="animate-pulse" style={{ height: 34, width: 180, borderRadius: 8, background: 'rgba(20,25,21,0.08)', margin: '0 auto 26px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ height: 58, borderRadius: 12, background: 'rgba(20,25,21,0.05)', opacity: 0.4 + (i % 3) * 0.2 }} />
              ))}
            </div>
          </div>
        }>
          <DeadlineCalendar scholarships={savedScholarships} programs={savedPrograms} />
        </Suspense>
      ) : (
        <div style={{ marginTop: 48 }}>
          {savedScholarships.length > 0 && (
            <>
              <div className="sabs-section-head sabl-mono">
                <span className="sabs-dot" style={{ background: '#2FD3A0' }} aria-hidden="true" />
                <span>SCHOLARSHIPS · {savedScholarships.length}</span>
              </div>
              <div className="sabl-grid" style={{ marginBottom: 56, paddingTop: 0 }}>
                {savedScholarships.map(s => (
                  <RemovableItem key={s.id} onRemove={() => unsaveScholarship(s.id)}>
                    {(triggerRemove) => <SavedScholarshipCard s={s} onUnsave={triggerRemove} />}
                  </RemovableItem>
                ))}
              </div>
            </>
          )}

          {savedPrograms.length > 0 && (
            <>
              <div className="sabs-section-head sabl-mono">
                <span className="sabs-dot" style={{ background: '#B8541F' }} aria-hidden="true" />
                <span>RESEARCH PROGRAMS · {savedPrograms.length}</span>
              </div>
              <div className="sabl-grid" style={{ paddingTop: 0 }}>
                {savedPrograms.map(p => (
                  <RemovableItem key={p.id} onRemove={() => unsaveProgram(p.id)}>
                    {(triggerRemove) => <SavedProgramCard p={p} onUnsave={triggerRemove} />}
                  </RemovableItem>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SavedListWithBoundary(props: SavedListProps) {
  return <ErrorBoundary><SavedList {...props} /></ErrorBoundary>;
}
