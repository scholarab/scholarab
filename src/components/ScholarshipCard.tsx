import { memo, useRef } from 'react';
import { getToday, generateSlug, formatDeadline, showToast, showConfetti } from '../lib/utils.ts';
import { getStatus } from '../hooks/useScholarships.ts';
import { SCHOLARSHIP_BADGES as CATEGORY_BADGE, DEFAULT_BADGE } from '../lib/badges.ts';
import { useCardEntrance } from '../hooks/useCardEntrance.ts';
import type { ScholarshipWithMeta } from '../hooks/useScholarships.ts';

interface ScholarshipCardProps {
  scholarship: ScholarshipWithMeta;
  index: number;
  isSaved: boolean;
  onToggleSave: () => void;
  isFiltered: boolean;
  isInitial: boolean;
}

function ScholarshipCard({ scholarship, index, isSaved, onToggleSave, isFiltered, isInitial }: ScholarshipCardProps) {
  const status       = getStatus(scholarship);
  const isClosed     = status === 'closed';
  const daysLeft     = status === 'active'
    ? Math.ceil((new Date(scholarship.deadline! + 'T00:00:00').getTime() - getToday().getTime()) / 86400000)
    : null;
  const deadlineSoon = daysLeft !== null && daysLeft <= 30;
  const badge        = CATEGORY_BADGE[scholarship.category ?? ''] || DEFAULT_BADGE;
  const isUpcoming   = status === 'future';
  const slug         = scholarship._slug ?? generateSlug(scholarship.title);
  const cardRef      = useRef<HTMLDivElement>(null);
  const saveBtnRef   = useRef<HTMLButtonElement>(null);
  useCardEntrance(cardRef, index, isInitial, isFiltered);

  const statusBarClass = isClosed ? 'status-bar status-bar-closed' : isUpcoming ? 'status-bar' : deadlineSoon ? 'status-bar status-bar-closing' : 'status-bar status-bar-active';
  const statusDotClass = isClosed ? 'status-dot status-dot-closed' : isUpcoming ? 'status-dot' : deadlineSoon ? 'status-dot status-dot-closing' : 'status-dot status-dot-active';

  const statusLabel = isClosed ? 'Closed' : isUpcoming ? 'Coming Soon' : deadlineSoon ? 'Closing Soon' : 'Active';
  const statusColor = isClosed ? 'var(--text-faint)' : isUpcoming ? '#3b82f6' : deadlineSoon ? '#f5b14a' : 'var(--brand)';

  return (
    <div
      ref={cardRef}
      className={`${isInitial ? '' : 'card-before-reveal '}card card-interactive flex flex-col justify-between h-full`}
      style={{
        minHeight: 280,
        opacity: isClosed ? 0.5 : isUpcoming ? 0.8 : undefined,
        paddingLeft: 22, paddingRight: 20, paddingTop: 18, paddingBottom: 18,
      }}
    >
      {/* Left status bar */}
      <div className={statusBarClass} />

      <div className="grow">
        {/* Status row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: statusColor }}>
            <span className={statusDotClass} />
            {statusLabel}
          </span>
          {scholarship.category && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
              <span style={{ fontSize: 13 }}>{badge.emoji}</span>
              {scholarship.category}
            </span>
          )}
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 6 }} className={isClosed ? 'text-faint' : 'text-primary'}>
          {scholarship.title}
        </h2>
        <p className="text-sm mb-3 text-secondary" style={{ lineHeight: 1.45 }}>
          {scholarship.audience}
        </p>

        {/* Amount + deadline — dominant data */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-subtle">
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }} className="text-faint">Award</p>
            <p style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }} className={isClosed ? 'text-faint' : 'text-brand'}>
              {scholarship.amount}
            </p>
          </div>
          <div className="text-right flex flex-col items-end">
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }} className="text-faint">
              {status === 'future' ? 'Opens' : 'Deadline'}
            </p>
            <p style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums',
              color: isClosed ? undefined : status === 'future' ? '#3b82f6' : deadlineSoon ? '#f5b14a' : undefined,
            }} className={isClosed ? 'text-faint' : status === 'future' ? '' : deadlineSoon ? '' : 'text-secondary'}>
              {status === 'future' ? (formatDeadline(scholarship.openDate) || 'TBA') : formatDeadline(scholarship.deadline)}
            </p>
            {status === 'active' && daysLeft !== null && daysLeft <= 60 && (
              <span style={{ fontSize: 10, marginTop: 3, fontWeight: 600, color: daysLeft <= 7 ? '#ef5a5a' : daysLeft <= 30 ? '#f5b14a' : 'var(--text-faint)' }}>
                {daysLeft === 0 ? 'Ends today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 flex gap-2">
        <a href={`/scholarships/${slug}`}
          aria-label={`View details for ${scholarship.title}`}
          className="flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold flex items-center justify-center border border-strong text-secondary hover:border-medium hover:text-primary transition-colors">
          View Details
        </a>
        {status === 'active' && (
          <a href={scholarship.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
            aria-label={`Apply to ${scholarship.title} (opens in new tab)`}
            className="btn-teal flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold"
            style={{ background: 'var(--brand)', color: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Apply Now
          </a>
        )}
        {status === 'future' && (
          <button disabled className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold cursor-not-allowed bg-blue-500/[0.08] text-blue-400">
            Opening Soon
          </button>
        )}
        <button
          ref={saveBtnRef}
          onClick={() => { if (!isSaved) showConfetti(saveBtnRef.current); showToast(isSaved ? 'Removed from saved' : 'Saved ✓'); onToggleSave(); }}
          aria-label={isSaved ? 'Remove from saved' : 'Save scholarship'}
          className={`flex items-center justify-center flex-shrink-0 rounded-[10px] cursor-pointer transition-all duration-150 ${isSaved ? 'text-brand border border-[rgba(var(--brand-rgb),0.4)]' : 'text-secondary border border-strong'}`}
          style={{ width: 44, background: isSaved ? 'var(--brand-dim)' : undefined }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default memo(ScholarshipCard);
