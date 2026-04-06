import { memo } from 'react';
import { track } from '@vercel/analytics';
import { getToday, generateSlug, formatDeadline, showToast } from '../lib/utils.ts';
import { getStatus } from '../hooks/useScholarships.ts';
import { SCHOLARSHIP_BADGES as CATEGORY_BADGE, DEFAULT_BADGE } from '../lib/badges.ts';
import type { ScholarshipWithMeta } from '../hooks/useScholarships.ts';

interface ScholarshipCardProps {
  scholarship: ScholarshipWithMeta;
  isSaved: boolean;
  onToggleSave: () => void;
}

function ScholarshipCard({ scholarship, isSaved, onToggleSave }: ScholarshipCardProps) {
  const status       = getStatus(scholarship);
  const isClosed     = status === 'closed';
  const daysLeft     = status === 'active'
    ? Math.ceil((new Date(scholarship.deadline! + 'T00:00:00').getTime() - getToday().getTime()) / 86400000)
    : null;
  const deadlineSoon = daysLeft !== null && daysLeft <= 30;
  const badge        = CATEGORY_BADGE[scholarship.category ?? ''] || DEFAULT_BADGE;
  const isUpcoming   = status === 'future';
  const amountColor  = isClosed ? 'text-gray-300 dark:text-white/20' : 'text-[#22d3a5]';
  const slug         = scholarship._slug ?? generateSlug(scholarship.title);

  return (
    <div
      className="card p-5 flex flex-col justify-between h-full"
      style={{ minHeight: 280, opacity: isClosed ? 0.45 : isUpcoming ? 0.75 : undefined, borderTop: `2px solid ${badge.color}` }}
    >
      <div className="grow">
        <div className="flex items-start justify-between gap-2 mb-3">
          {scholarship.category ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
              <span style={{ fontSize: 16 }}>{badge.emoji}</span>
              {scholarship.category}
            </span>
          ) : <span />}
        </div>

        <h2 className={`font-bold text-base leading-snug mb-2 ${isClosed ? 'text-gray-400 dark:text-white/25' : 'text-gray-900 dark:text-white'}`}>
          {scholarship.title}
        </h2>
        <p className="text-sm line-clamp-2 mb-2 text-gray-500 dark:text-white/45">
          {scholarship.audience}
        </p>

        <div className="pt-4 grid grid-cols-2 gap-2 border-t border-gray-100 dark:border-white/[0.06]">
          <div>
            <p className={`${amountColor}`} style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>
              {scholarship.amount}
            </p>
          </div>
          <div className="text-right flex flex-col items-end overflow-hidden">
            {status === 'future' && (
              <span style={{ fontSize: 9, fontWeight: 600, marginBottom: 2 }} className="text-blue-400 uppercase tracking-wide">Opens</span>
            )}
            <p style={{
              fontSize: 12, fontWeight: 700,
              color: isClosed ? undefined : status === 'future' ? undefined : deadlineSoon ? '#f87171' : undefined,
            }} className={isClosed ? 'text-gray-300 dark:text-white/20' : status === 'future' ? 'text-blue-500 dark:text-blue-400' : deadlineSoon ? '' : 'text-gray-600 dark:text-white/50'}>
              {status === 'future' ? (formatDeadline(scholarship.openDate) || 'TBA') : formatDeadline(scholarship.deadline)}
            </p>
            {status === 'active' && daysLeft !== null && daysLeft <= 60 && (
              <span style={{ fontSize: 9, marginTop: 2, color: daysLeft <= 30 ? '#f87171' : 'rgba(128,128,128,0.45)' }}>
                {daysLeft === 0 ? 'Ends today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 flex gap-2">
        <a href={`/scholarships/${slug}`}
          className="flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold flex items-center justify-center border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-white/[0.18] dark:text-white/60 dark:hover:border-white/30 dark:hover:text-white/80 transition-colors">
          View Details
        </a>
        {status === 'active' && (
          <a href={scholarship.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
            aria-label={`Apply to ${scholarship.title} (opens in new tab)`}
            onClick={() => track('apply_now', { id: scholarship.id, title: scholarship.title })}
            className="btn-teal flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ background: '#22d3a5', color: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Apply Now
          </a>
        )}
        {status === 'future' && (
          <button disabled className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold cursor-not-allowed bg-blue-50 text-blue-400 dark:bg-blue-500/[0.08] dark:text-blue-400">
            Opening Soon
          </button>
        )}
        <button
          onClick={() => { showToast(isSaved ? 'Removed from saved' : 'Saved ✓'); onToggleSave(); }}
          aria-label={isSaved ? 'Remove from saved' : 'Save scholarship'}
          className={`flex items-center justify-center flex-shrink-0 rounded-[10px] cursor-pointer transition-all duration-150 ${isSaved ? 'text-[#22d3a5] border border-[#22d3a5]/40' : 'text-gray-400 border border-gray-200 dark:border-white/[0.18] dark:text-white/50'}`}
          style={{ width: 44, background: isSaved ? 'rgba(34,211,165,0.12)' : undefined }}
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
