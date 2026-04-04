import { useRef, useEffect } from 'react';
import { track } from '@vercel/analytics';
import { formatDeadline, generateSlug, showToast, showConfetti } from '../lib/utils.jsx';
import { getStatus } from '../hooks/usePrograms.js';
import { PROGRAM_BADGES as CATEGORY_BADGE, DEFAULT_BADGE } from '../lib/badges.js';
import { getToday } from '../lib/utils.jsx';
import { observeCard, unobserveCard } from '../lib/cardObserver.js';

function isWithin30Days(deadlineStr) {
  if (!deadlineStr || deadlineStr === 'TBA' || deadlineStr === 'Ongoing') return false;
  const deadline = new Date(deadlineStr + 'T00:00:00');
  const diff = (deadline - getToday()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
}

export default function ProgramCard({ program, index, isSaved, onToggleSave, isFiltered, isInitial }) {
  const status      = getStatus(program);
  const isClosed    = status === 'closed';
  const accentColor = (CATEGORY_BADGE[program.category] || DEFAULT_BADGE).color;

  const deadlineUrgent = !isClosed && status !== 'tba' && isWithin30Days(program.deadline);
  const deadlineColor = isClosed
    ? 'text-gray-300 dark:text-white/20'
    : status === 'tba'
    ? 'text-gray-400 dark:text-white/35'
    : deadlineUrgent
    ? ''
    : 'text-gray-500 dark:text-white/40';

  const cardRef = useRef(null);
  const bmkRef  = useRef(null);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const delay = `${Math.min(index ?? 0, 6) * 0.03}s`;
    if (isInitial) {
      if (isFiltered) {
        el.style.setProperty('--card-delay', delay);
        el.classList.add('card-entrance-filter');
      }
      return;
    }
    observeCard(el, () => {
      el.style.setProperty('--card-delay', delay);
      el.classList.remove('card-before-reveal');
      el.classList.add(isFiltered ? 'card-entrance-filter' : 'card-entrance');
    });
    return () => unobserveCard(el);
  }, [index, isFiltered, isInitial]);

  return (
    <div
      ref={cardRef}
      className={`${isInitial ? '' : 'card-before-reveal '}card ${isClosed ? '' : 'card-interactive'} p-5`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 320,
        opacity: isClosed ? 0.45 : undefined,
        borderTop: `2px solid ${accentColor}`,
        '--card-glow': `${accentColor}66`,
      }}
    >
      {/* TOP SECTION */}
      <div>
        {/* Category badge + bookmark */}
        <div className="flex items-start justify-between gap-2 mb-3">
          {(() => { const badge = CATEGORY_BADGE[program.category] || DEFAULT_BADGE; return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
              <span style={{ fontSize: 16 }}>{badge.emoji}</span>
              {program.category}
            </span>
          ); })()}
        </div>

        {/* Name + provider + meta + description + stipend */}
        <h2 className={`font-bold text-base leading-snug mb-1 ${isClosed ? 'text-gray-400 dark:text-white/25' : 'text-gray-900 dark:text-white'}`}>
          <a href={`/programs/${generateSlug(program.name)}`} className="card-nav-link">{program.name}</a>
        </h2>
        <p className="text-xs mb-2 text-gray-400 dark:text-white/30">{program.provider}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
          <span className="text-xs text-gray-400 dark:text-white/40">📅 {program.duration}</span>
          <span className="text-xs text-gray-400 dark:text-white/40">🎓 {program.grades}</span>
          <span className="text-xs text-gray-400 dark:text-white/40">📍 {program.location}</span>
        </div>
        <p className="text-sm mb-2 text-gray-500 dark:text-white/45">
          {program.description}
        </p>
        {program.paid && program.stipend && (
          <p className="mb-2" style={{ color: '#22d3a5', fontSize: 20, fontWeight: 800 }}>{program.stipend}</p>
        )}

        {/* Eligibility + deadline */}
        <div className="pt-4 grid grid-cols-2 gap-2 border-t border-gray-100 dark:border-white/[0.06]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1 text-gray-400 dark:text-white/30">
              Eligibility
            </p>
            <p className="text-xs leading-snug text-gray-500 dark:text-white/40">
              {program.eligibility}
            </p>
          </div>
          <div className="text-right flex flex-col items-end overflow-hidden">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1 text-gray-400 dark:text-white/30">
              Deadline
            </p>
            <p
              className={`text-sm font-medium ${deadlineColor}`}
              style={deadlineUrgent ? { color: '#f87171' } : undefined}
            >
              {program.deadline === 'Ongoing' ? 'Ongoing' : formatDeadline(program.deadline)}
            </p>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION — Learn More + Bookmark */}
      <div style={{ paddingTop: 16, position: 'relative', zIndex: 1, display: 'flex', gap: 8 }}>
        {isClosed ? (
          <button disabled className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-white/20">
            Closed
          </button>
        ) : (
          <a href={program.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
            onClick={() => track('learn_more', { id: program.id, name: program.name })}
            className="btn-teal flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ background: '#22d3a5', color: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Learn More
          </a>
        )}
        <button
          ref={bmkRef}
          onClick={() => {
            bmkRef.current?.animate(
              [{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(0.9)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }],
              { duration: 380, easing: 'ease-out' }
            );
            navigator.vibrate?.(12);
            if (!isSaved) showConfetti(bmkRef.current);
            showToast(isSaved ? 'Removed from saved' : 'Saved ✓');
            onToggleSave();
          }}
          aria-label={isSaved ? 'Remove bookmark' : 'Save program'}
          style={{
            width: 52,
            flexShrink: 0,
            alignSelf: 'stretch',
            borderRadius: 10,
            background: isSaved ? 'rgba(34,211,165,0.12)' : 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(16px) saturate(2)',
            WebkitBackdropFilter: 'blur(16px) saturate(2)',
            border: `0.5px solid ${isSaved ? 'rgba(34,211,165,0.4)' : 'rgba(255,255,255,0.18)'}`,
            boxShadow: isSaved
              ? 'inset 0 1px 0 rgba(34,211,165,0.15), 0 1px 6px rgba(34,211,165,0.12)'
              : 'inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 4px rgba(0,0,0,0.12)',
            color: isSaved ? '#22d3a5' : 'rgba(200,200,210,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            touchAction: 'manipulation',
            transition: 'color 0.15s, background 0.15s, border-color 0.15s, box-shadow 0.15s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
