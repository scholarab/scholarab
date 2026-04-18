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

  const statusLabel = isClosed ? 'Closed' : isUpcoming ? 'Coming Soon' : deadlineSoon ? 'Closing Soon' : 'Active';
  const statusColor = isClosed ? 'var(--text-faint)' : isUpcoming ? '#3b82f6' : deadlineSoon ? '#f5b14a' : 'var(--brand)';
  const statusDotBg = isClosed ? 'rgba(255,255,255,0.2)' : isUpcoming ? '#3b82f6' : deadlineSoon ? '#f5b14a' : 'var(--brand)';

  const deadlineLabel = status === 'future' ? 'Opens' : 'Deadline';
  const deadlineValue = status === 'future' ? (formatDeadline(scholarship.openDate) || 'TBA') : formatDeadline(scholarship.deadline);
  const deadlineColor = isClosed ? undefined : status === 'future' ? '#3b82f6' : deadlineSoon ? '#f5b14a' : undefined;

  return (
    <div
      ref={cardRef}
      className={`${isInitial ? '' : 'card-before-reveal '}card card-interactive h-full`}
      style={{
        opacity: isClosed ? 0.5 : isUpcoming ? 0.8 : undefined,
        paddingLeft: 22, paddingRight: 18, paddingTop: 18, paddingBottom: 18,
        position: 'relative',
      }}
    >
      {/* Full-card link overlay */}
      <a
        href={`/scholarships/${slug}`}
        aria-label={`View details for ${scholarship.title}`}
        style={{ position: 'absolute', inset: 0, zIndex: 0, borderRadius: 16 }}
      />

      {/* Left status bar */}
      <div className={statusBarClass} />

      {/* Card body — above the link overlay */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Header: status chip + bookmark */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: statusColor }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: statusDotBg, flexShrink: 0,
              animation: status === 'active' ? 'statusPulse 2s ease-in-out infinite' : 'none',
              boxShadow: status === 'active' ? `0 0 6px ${statusDotBg}` : 'none',
            }} />
            {statusLabel}
          </span>
          <button
            ref={saveBtnRef}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isSaved) showConfetti(saveBtnRef.current);
              showToast(isSaved ? 'Removed from saved' : 'Saved ✓');
              onToggleSave();
            }}
            aria-label={isSaved ? 'Remove from saved' : 'Save scholarship'}
            style={{
              position: 'relative', zIndex: 2,
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              border: `1px solid ${isSaved ? 'rgba(var(--brand-rgb),0.4)' : 'var(--border-strong)'}`,
              background: isSaved ? 'var(--brand-dim)' : 'transparent',
              color: isSaved ? 'var(--brand)' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 150ms',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>

        {/* Title + org */}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 5, color: isClosed ? 'var(--text-faint)' : 'var(--text-primary)' }}>
            {scholarship.title}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 0 }}>
            {scholarship.audience}
          </p>
        </div>

        {/* Amount + deadline — dominant data */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3, color: 'var(--text-faint)' }}>Award</p>
            <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', color: isClosed ? 'var(--text-faint)' : 'var(--brand)' }}>
              {scholarship.amount}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3, color: 'var(--text-faint)' }}>{deadlineLabel}</p>
            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', color: isClosed ? 'var(--text-faint)' : deadlineColor || 'var(--text-secondary)' }}>
              {deadlineValue}
            </p>
            {status === 'active' && daysLeft !== null && daysLeft <= 60 && (
              <span style={{ fontSize: 10, marginTop: 3, display: 'block', fontWeight: 600, color: daysLeft <= 7 ? '#ef5a5a' : daysLeft <= 30 ? '#f5b14a' : 'var(--text-faint)' }}>
                {daysLeft === 0 ? 'Ends today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
              </span>
            )}
          </div>
        </div>

        {/* Category tag */}
        {scholarship.category && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
              <span style={{ fontSize: 12 }}>{badge.emoji}</span>
              {scholarship.category}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ScholarshipCard);
