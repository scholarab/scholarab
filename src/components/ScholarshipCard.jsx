import { useRef, useEffect } from 'react';
import { track } from '@vercel/analytics';
import { getToday, generateSlug, formatDeadline, showToast } from '../lib/utils.jsx';
import { getStatus } from '../hooks/useScholarships.js';
import { SCHOLARSHIP_BADGES as CATEGORY_BADGE, DEFAULT_BADGE } from '../lib/badges.js';
import { observeCard, unobserveCard } from '../lib/cardObserver.js';

export default function ScholarshipCard({ scholarship, index, isSaved, onToggleSave, isFiltered, isInitial }) {
  const status       = getStatus(scholarship);
  const isClosed     = status === 'closed';
  const daysLeft     = status === 'active'
    ? Math.ceil((new Date(scholarship.deadline + 'T00:00:00') - getToday()) / 86400000)
    : null;
  const deadlineSoon = daysLeft !== null && daysLeft <= 30;
  const accentColor  = (CATEGORY_BADGE[scholarship.category] || DEFAULT_BADGE).color;
  const isUpcoming   = status === 'future';
  const amountColor  = isClosed ? 'text-gray-300 dark:text-white/20' : 'text-[#22d3a5]';
  const slug         = generateSlug(scholarship.title);
  const cardRef = useRef(null);
  const bmkRef  = useRef(null);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const delay = `${Math.min(index ?? 0, 6) * 0.03}s`;
    // Initial above-fold cards: data is already in the bundle, no shimmer needed.
    // On first load just appear; on filter re-mount animate immediately.
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
        height: '100%',
        minHeight: 280,
        opacity: isClosed ? 0.45 : isUpcoming ? 0.75 : undefined,
        borderTop: `2px solid ${accentColor}`,
        '--card-glow': `${accentColor}66`,
      }}
    >
      {/* TOP SECTION */}
      <div style={{ flexGrow: 1 }}>
        {/* Category badge + bookmark */}
        <div className="flex items-start justify-between gap-2 mb-3">
          {scholarship.category ? (() => { const badge = CATEGORY_BADGE[scholarship.category] || DEFAULT_BADGE; return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
              <span style={{ fontSize: 16 }}>{badge.emoji}</span>
              {scholarship.category}
            </span>
          ); })() : <span />}
        </div>

        {/* Title + audience */}
        <h2 className={`font-bold text-base leading-snug mb-2 ${isClosed ? 'text-gray-400 dark:text-white/25' : 'text-gray-900 dark:text-white'}`}>
          <a href={`/scholarships/${slug}`} className="card-nav-link">{scholarship.title}</a>
        </h2>
        <p className="text-sm line-clamp-2 mb-2 text-gray-500 dark:text-white/45">
          {scholarship.audience}
        </p>

        {/* Amount + deadline */}
        <div className="pt-4 grid grid-cols-2 gap-2 border-t border-gray-100 dark:border-white/[0.06]">
          <div>
            <p className={`${amountColor}`} style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>
              {scholarship.amount}
            </p>
          </div>
          <div className="text-right flex flex-col items-end overflow-hidden">
            {status === 'future' && (
              <span style={{ fontSize: 9, fontWeight: 600, marginBottom: 2 }} className="text-blue-400 dark:text-blue-400 uppercase tracking-wide">Opens</span>
            )}
            <p style={{
              fontSize: 12,
              fontWeight: 700,
              color: isClosed ? undefined : status === 'future' ? undefined : deadlineSoon ? '#f87171' : undefined,
            }} className={isClosed ? 'text-gray-300 dark:text-white/20' : status === 'future' ? 'text-blue-500 dark:text-blue-400' : deadlineSoon ? '' : 'text-gray-600 dark:text-white/50'}>
              {status === 'future' ? (formatDeadline(scholarship.open_date) || 'TBA') : formatDeadline(scholarship.deadline)}
            </p>
            {status === 'active' && daysLeft !== null && daysLeft <= 60 && (
              <span style={{ fontSize: 9, marginTop: 2, color: daysLeft <= 30 ? '#f87171' : 'rgba(128,128,128,0.45)' }}>
                {daysLeft === 0 ? 'Ends today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION — Apply Now + Bookmark */}
      <div style={{ paddingTop: 16, position: 'relative', zIndex: 1, display: 'flex', gap: 8 }}>
        {isClosed ? (
          <button disabled className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-white/20">
            Closed
          </button>
        ) : status === 'future' ? (
          <button disabled className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold cursor-not-allowed bg-blue-50 text-blue-400 dark:bg-blue-500/[0.08] dark:text-blue-400">
            Opening Soon
          </button>
        ) : (
          <a href={scholarship.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
            onClick={() => track('apply_now', { id: scholarship.id, title: scholarship.title })}
            className="btn-teal flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ background: '#22d3a5', color: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Apply Now
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
            showToast(isSaved ? 'Removed from saved' : 'Saved ✓');
            onToggleSave();
          }}
          aria-label={isSaved ? 'Remove bookmark' : 'Save scholarship'}
          style={{
            width: 44,
            flexShrink: 0,
            alignSelf: 'stretch',
            borderRadius: 10,
            background: isSaved ? 'rgba(34,211,165,0.1)' : 'rgba(128,128,128,0.06)',
            border: `1px solid ${isSaved ? 'rgba(34,211,165,0.35)' : 'rgba(128,128,128,0.18)'}`,
            color: isSaved ? '#22d3a5' : 'rgba(128,128,128,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            transition: 'color 0.15s, background 0.15s, border-color 0.15s',
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
