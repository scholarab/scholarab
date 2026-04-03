import { useState, useRef, useEffect, useMemo } from 'react';
import { getSaved, toggleSaved, getSavedPrograms, toggleSavedProgram } from '../lib/tracker.js';
import { formatDeadline } from '../lib/utils.jsx';
import { getStatus } from '../hooks/useScholarships.js';

const REGION_DOT_COLORS = {
  'Medicine Hat': '#f97316',
  'Alberta':      '#22d3a5',
  'Alberta-wide': '#22d3a5',
  'National':     '#3b82f6',
};

function RemovableItem({ onRemove, onWillRemove, children }) {
  const wrapperRef = useRef(null);

  function remove() {
    const el = wrapperRef.current;
    if (!el) { onRemove(); return; }
    onWillRemove?.();
    el.style.overflow = 'hidden';
    el.style.transformOrigin = 'top';
    el.animate(
      [{ transform: 'scaleY(1)', opacity: 1 }, { transform: 'scaleY(0)', opacity: 0 }],
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

function ScholarshipCard({ s, index, onUnsave, isInitial }) {
  const status   = getStatus(s);
  const isClosed = status === 'closed';
  const isFuture = status === 'future';
  const cardRef  = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (isInitial) return;
    const delay = `${Math.min(index ?? 0, 6) * 0.03}s`;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.style.setProperty('--card-delay', delay);
        el.classList.remove('card-before-reveal');
        el.classList.add('card-entrance');
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [index, isInitial]);

  function handleUnsave() {
    const el = cardRef.current;
    if (!el) { onUnsave(); return; }
    el.animate(
      [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.95)', opacity: 0 }],
      { duration: 200, easing: 'ease-out', fill: 'forwards' }
    ).onfinish = onUnsave;
  }

  return (
    <div
      ref={cardRef}
      className={`${isInitial ? '' : 'card-before-reveal '}card p-5 flex flex-col gap-3 h-full ${isClosed ? '' : 'card-interactive'}`}
      style={{ opacity: isClosed ? 0.45 : isFuture ? 0.75 : undefined }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">{s.title}</h3>
        <button
          onClick={handleUnsave}
          className="text-[#22d3a5] flex-shrink-0 transition-opacity hover:opacity-60"
          aria-label="Remove bookmark"
          style={{ lineHeight: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
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
      {isClosed ? (
        <button disabled className="mt-auto w-full py-2.5 rounded-[10px] text-sm font-semibold cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-white/20">
          Closed
        </button>
      ) : isFuture ? (
        <button disabled className="mt-auto w-full py-2.5 rounded-[10px] text-sm font-semibold cursor-not-allowed bg-blue-50 text-blue-400 dark:bg-blue-500/[0.08] dark:text-blue-400">
          Opening Soon
        </button>
      ) : (
        <a
          href={s.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
          className="mt-auto block w-full text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold transition-opacity hover:opacity-85"
          style={{ background: '#22d3a5', color: '#0a0a0f' }}
        >
          Apply Now
        </a>
      )}
    </div>
  );
}

function ProgramCard({ p, index, onUnsave, isInitial }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (isInitial) return;
    const delay = `${Math.min(index ?? 0, 6) * 0.03}s`;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.style.setProperty('--card-delay', delay);
        el.classList.remove('card-before-reveal');
        el.classList.add('card-entrance');
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [index, isInitial]);

  function handleUnsave() {
    const el = cardRef.current;
    if (!el) { onUnsave(); return; }
    el.animate(
      [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.95)', opacity: 0 }],
      { duration: 200, easing: 'ease-out', fill: 'forwards' }
    ).onfinish = onUnsave;
  }

  return (
    <div ref={cardRef} className={`${isInitial ? '' : 'card-before-reveal '}card card-interactive p-5 flex flex-col gap-3 h-full`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">{p.name}</h3>
        <button
          onClick={handleUnsave}
          className="text-[#22d3a5] flex-shrink-0 transition-opacity hover:opacity-60"
          aria-label="Remove bookmark"
          style={{ lineHeight: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>
      {p.category && (
        <span className="self-start text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 border border-gray-200 dark:bg-white/[0.07] dark:text-white/50 dark:border-white/10">
          {p.category}
        </span>
      )}
      {p.deadline && p.deadline !== 'TBA' && p.deadline !== 'Ongoing' && (
        <span className="text-xs text-gray-400 dark:text-white/35">{formatDeadline(p.deadline)}</span>
      )}
      <a
        href={p.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
        className="mt-auto block w-full text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold transition-opacity hover:opacity-85"
        style={{ background: '#22d3a5', color: '#0a0a0f' }}
      >
        Learn More
      </a>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <span className="empty-bounce text-4xl mb-4 block">🔖</span>
      <p className="text-sm text-gray-400 dark:text-white/30 mb-6">Nothing saved yet. Bookmark scholarships and programs you want to apply for.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="/scholarships"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-85"
          style={{ background: '#22d3a5', color: '#0a0a0f' }}
        >
          Browse Scholarships
        </a>
        <a
          href="/programs"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 hover:border-[#22d3a5] hover:text-[#22d3a5] dark:hover:border-[#22d3a5] dark:hover:text-[#22d3a5] transition-colors"
        >
          Browse Programs
        </a>
      </div>
    </div>
  );
}

function SectionEmptyState({ href, label }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-dashed border-gray-200 dark:border-white/[0.08] text-sm text-gray-400 dark:text-white/30">
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

export default function SavedList({ initialScholarships, initialPrograms }) {
  const [savedScholarshipIds, setSavedScholarshipIds] = useState([]);
  const [savedProgramIds, setSavedProgramIds] = useState([]);
  const [globalExiting, setGlobalExiting] = useState(false);

  useEffect(() => {
    setSavedScholarshipIds([...getSaved()]);
    setSavedProgramIds([...getSavedPrograms()]);
  }, []);

  const savedScholarships = useMemo(() => {
    const idSet = new Set(savedScholarshipIds);
    return initialScholarships.filter(s => idSet.has(s.id));
  }, [initialScholarships, savedScholarshipIds]);

  const savedPrograms = useMemo(() => {
    const idSet = new Set(savedProgramIds);
    return initialPrograms.filter(p => idSet.has(p.id));
  }, [initialPrograms, savedProgramIds]);
  const totalSaved        = savedScholarships.length + savedPrograms.length;
  const isEmpty           = totalSaved === 0;

  useEffect(() => {
    if (!window.matchMedia('(max-width: 768px)').matches) return;
    document.body.style.overflowY = totalSaved > 4 ? '' : 'hidden';
    return () => { document.body.style.overflowY = ''; };
  }, [totalSaved]);

  function unsaveScholarship(id) {
    const next = toggleSaved(id);
    setSavedScholarshipIds([...next]);
    setGlobalExiting(false);
  }

  function unsaveProgram(id) {
    const next = toggleSavedProgram(id);
    setSavedProgramIds([...next]);
    setGlobalExiting(false);
  }

  if (isEmpty && !globalExiting) {
    return <EmptyState />;
  }

  return (
    <div className="relative">
      <style>{`
        @keyframes savedlist-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {!isEmpty && (
        <div className="saved-list space-y-10">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-4">Scholarships</h2>
            {savedScholarships.length === 0 ? (
              <SectionEmptyState href="/scholarships" label="Find scholarships" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {savedScholarships.map((s, i) => (
                  <RemovableItem
                    key={s.id}
                    onRemove={() => unsaveScholarship(s.id)}
                    onWillRemove={totalSaved === 1 ? () => setGlobalExiting(true) : undefined}
                  >
                    {(triggerRemove) => (
                      <ScholarshipCard s={s} index={i} onUnsave={triggerRemove} isInitial={i < 6} />
                    )}
                  </RemovableItem>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-4">Research Programs</h2>
            {savedPrograms.length === 0 ? (
              <SectionEmptyState href="/programs" label="Find programs" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {savedPrograms.map((p, i) => (
                  <RemovableItem
                    key={p.id}
                    onRemove={() => unsaveProgram(p.id)}
                    onWillRemove={totalSaved === 1 ? () => setGlobalExiting(true) : undefined}
                  >
                    {(triggerRemove) => (
                      <ProgramCard p={p} index={i} onUnsave={triggerRemove} isInitial={i < 6} />
                    )}
                  </RemovableItem>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {globalExiting && (
        <div style={{ animation: 'savedlist-fadein 350ms ease 150ms both' }}>
          <EmptyState />
        </div>
      )}
    </div>
  );
}
