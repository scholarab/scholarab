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
  const isUpcoming   = status === 'future';
  const daysLeft     = status === 'active'
    ? Math.ceil((new Date(scholarship.deadline! + 'T00:00:00').getTime() - getToday().getTime()) / 86400000)
    : null;
  const deadlineSoon = daysLeft !== null && daysLeft <= 30;
  const badge        = CATEGORY_BADGE[scholarship.category ?? ''] || DEFAULT_BADGE;
  const slug         = scholarship._slug ?? generateSlug(scholarship.title);
  const cardRef      = useRef<HTMLDivElement>(null);
  const saveBtnRef   = useRef<HTMLButtonElement>(null);
  useCardEntrance(cardRef, index, isInitial, isFiltered);

  const deadlineLabel = isUpcoming ? 'Opens' : 'Deadline';
  const deadlineValue = isUpcoming ? (formatDeadline(scholarship.openDate) || 'TBA') : formatDeadline(scholarship.deadline);
  const deadlineColor = isClosed ? 'text-faint' : deadlineSoon ? '' : 'text-tertiary';

  return (
    <div
      ref={cardRef}
      className={`${isInitial ? '' : 'card-before-reveal '}card p-5 flex flex-col justify-between`}
      style={{ minHeight: 280, opacity: isClosed ? 0.45 : isUpcoming ? 0.8 : undefined, borderTop: `2px solid ${badge.color}` }}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="badge-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
            <span style={{ fontSize: 16 }}>{badge.emoji}</span>
            {scholarship.category}
          </span>
        </div>

        <h2 className={`font-bold text-base leading-snug mb-1 ${isClosed ? 'text-faint' : 'text-primary'}`}>
          {scholarship.title}
        </h2>
        <p className="text-xs mb-3 text-tertiary">{scholarship.audience}</p>

        {scholarship.amount && (
          <p className="mb-2" style={{ fontSize: 20, fontWeight: 800, color: isClosed ? 'var(--text-faint)' : 'var(--brand)', letterSpacing: '-0.03em' }}>
            {scholarship.amount}
          </p>
        )}

        <div className="pt-4 grid grid-cols-2 gap-2 border-t border-subtle">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] mb-1 text-tertiary">Eligibility</p>
            <p className="text-xs leading-snug text-secondary">{scholarship.audience}</p>
          </div>
          <div className="text-right flex flex-col items-end overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] mb-1 text-tertiary">{deadlineLabel}</p>
            <p className={`text-sm font-medium ${deadlineColor}`} style={deadlineSoon && !isClosed ? { color: daysLeft !== null && daysLeft <= 7 ? 'var(--color-urgent)' : 'var(--color-warning)' } : undefined}>
              {deadlineValue}
            </p>
            {status === 'active' && daysLeft !== null && daysLeft <= 60 && (
              <span style={{ fontSize: 10, marginTop: 2, fontWeight: 600, color: daysLeft <= 7 ? 'var(--color-urgent)' : daysLeft <= 30 ? 'var(--color-warning)' : 'var(--text-faint)' }}>
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
        {!isClosed && !isUpcoming && scholarship.url && (
          <a href={scholarship.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
            aria-label={`Apply for ${scholarship.title} (opens in new tab)`}
            className="btn-teal flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ background: 'var(--brand)', color: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Apply Now
          </a>
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
