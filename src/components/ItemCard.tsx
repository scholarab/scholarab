import { memo, useRef, useCallback } from 'react';
import { getToday, generateSlug, formatDeadline, showToast, showConfetti } from '../lib/utils.ts';
import { getScholarshipStatus, getProgramStatus } from '../hooks/useItems.ts';
import { SCHOLARSHIP_BADGES, PROGRAM_BADGES, DEFAULT_BADGE } from '../lib/badges.ts';
import { useCardEntrance } from '../hooks/useCardEntrance.ts';
import type { ScholarshipWithMeta, ProgramWithMeta } from '../hooks/useItems.ts';

function BookmarkSVG({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

// ── ScholarshipCard ────────────────────────────────────────────────────────────

interface ScholarshipCardProps {
  scholarship: ScholarshipWithMeta;
  index: number;
  isSaved: boolean;
  onToggleSave: () => void;
  isFiltered: boolean;
  isInitial: boolean;
}

function ScholarshipCardInner({ scholarship, index, isSaved, onToggleSave, isFiltered, isInitial }: ScholarshipCardProps) {
  const status       = getScholarshipStatus(scholarship);
  const isClosed     = status === 'closed';
  const isUpcoming   = status === 'future';
  const daysLeft     = status === 'active'
    ? Math.ceil((new Date(scholarship.deadline! + 'T00:00:00').getTime() - getToday().getTime()) / 86400000)
    : null;
  const deadlineSoon = daysLeft !== null && daysLeft <= 30;
  const badge        = SCHOLARSHIP_BADGES[scholarship.category ?? ''] || DEFAULT_BADGE;
  const slug         = scholarship._slug ?? generateSlug(scholarship.title);
  const cardRef      = useRef<HTMLDivElement>(null);
  const saveBtnRef   = useRef<HTMLButtonElement>(null);
  useCardEntrance(cardRef, index, isInitial, isFiltered);

  const deadlineLabel = isUpcoming ? 'Opens' : 'Deadline';
  const deadlineValue = isUpcoming ? (formatDeadline(scholarship.openDate) || 'TBA') : formatDeadline(scholarship.deadline);
  const deadlineColor = isClosed ? 'text-faint' : deadlineSoon ? '' : 'text-tertiary';

  const handleSave = useCallback(() => {
    if (!isSaved) {
      showConfetti(saveBtnRef.current);
      saveBtnRef.current?.classList.remove('pop');
      void saveBtnRef.current?.offsetWidth;
      saveBtnRef.current?.classList.add('pop');
    }
    showToast(isSaved ? 'Removed from saved' : 'Saved ✓');
    onToggleSave();
  }, [isSaved, onToggleSave]);

  return (
    <div
      ref={cardRef}
      className={`${isInitial ? '' : 'card-before-reveal '}card card-bloom card-interactive p-5 flex flex-col justify-between`}
      style={{ minHeight: 280, opacity: isClosed ? 0.45 : isUpcoming ? 0.8 : undefined, borderTop: `3px solid ${badge.color}`, '--bloom-color': badge.color } as React.CSSProperties}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="badge-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
            <span style={{ fontSize: 15 }}>{badge.emoji}</span>
            {scholarship.category}
          </span>
        </div>

        <h2 className={`font-bold text-base leading-snug mb-3 ${isClosed ? 'text-faint' : 'text-primary'}`}>
          {scholarship.title}
        </h2>

        {scholarship.amount && (
          <p className="mb-2" style={{ fontSize: 20, fontWeight: 800, color: isClosed ? 'var(--text-faint)' : 'var(--brand)', letterSpacing: '-0.03em' }}>
            {scholarship.amount}
          </p>
        )}

        <div className="pt-4 grid grid-cols-2 gap-2 border-t border-subtle">
          <div>
            <p className="meta-label">Eligibility</p>
            <p className="text-xs leading-snug text-secondary">{scholarship.audience}</p>
          </div>
          <div className="text-right flex flex-col items-end overflow-hidden">
            <p className="meta-label">{deadlineLabel}</p>
            <p className={`text-sm font-medium ${deadlineColor}`} style={deadlineSoon && !isClosed ? { color: daysLeft !== null && daysLeft <= 7 ? 'var(--color-urgent)' : 'var(--color-warning)' } : undefined}>
              {deadlineValue}
            </p>
            {status === 'active' && daysLeft !== null && daysLeft <= 60 && (() => {
              const color = daysLeft <= 7 ? 'var(--color-urgent)' : daysLeft <= 30 ? 'var(--color-warning)' : 'var(--text-faint)';
              const label = daysLeft === 0 ? 'Ends today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`;
              return (
                <span className="countdown" style={{ color }}>
                  {daysLeft <= 30 && <span className="cdot" style={{ background: color }} />}
                  {label}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="pt-4 flex gap-2">
        <a href={`/scholarships/${slug}`}
          aria-label={`View details for ${scholarship.title}`}
          className="flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold flex items-center justify-center border border-strong text-secondary hover:border-brand hover:text-primary transition-colors">
          View Details
        </a>
        {!isClosed && !isUpcoming && scholarship.url && (
          <a href={scholarship.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
            aria-label={`Apply for ${scholarship.title} (opens in new tab)`}
            className="btn-teal flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ background: 'var(--brand)', color: 'var(--text-on-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Apply Now
          </a>
        )}
        <button
          ref={saveBtnRef}
          onClick={handleSave}
          aria-label={isSaved ? 'Remove from saved' : 'Save scholarship'}
          className={`bmk-btn flex items-center justify-center shrink-0 rounded-[10px] cursor-pointer transition-all duration-150 ${isSaved ? 'text-brand border border-[rgba(var(--brand-rgb),0.4)]' : 'text-secondary border border-strong'}`}
          style={{ width: 44, background: isSaved ? 'var(--brand-dim)' : undefined }}
        >
          <BookmarkSVG filled={isSaved} />
        </button>
      </div>
    </div>
  );
}

export const ScholarshipCard = memo(ScholarshipCardInner);

// ── ProgramCard ────────────────────────────────────────────────────────────────

interface ProgramCardProps {
  program: ProgramWithMeta;
  index: number;
  isSaved: boolean;
  onToggleSave: () => void;
  isFiltered: boolean;
  isInitial: boolean;
}

function isWithin30Days(deadlineStr: string | null | undefined): boolean {
  if (!deadlineStr || deadlineStr === 'TBA' || deadlineStr === 'Ongoing') return false;
  const deadline = new Date(deadlineStr + 'T00:00:00');
  const diff = (deadline.getTime() - getToday().getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
}

export function ProgramCard({ program, index, isSaved, onToggleSave, isFiltered, isInitial }: ProgramCardProps) {
  const cardRef     = useRef<HTMLDivElement>(null);
  const saveBtnRef  = useRef<HTMLButtonElement>(null);
  useCardEntrance(cardRef, index, isInitial, isFiltered);
  const status      = getProgramStatus(program);
  const isClosed    = status === 'closed';
  const badge       = PROGRAM_BADGES[program.category ?? ''] || DEFAULT_BADGE;

  const deadlineUrgent = !isClosed && status !== 'tba' && isWithin30Days(program.deadline);
  const deadlineColor = isClosed
    ? 'text-faint'
    : status === 'tba'
    ? 'text-tertiary'
    : deadlineUrgent
    ? ''
    : 'text-tertiary';

  const handleSave = useCallback(() => {
    if (!isSaved) {
      showConfetti(saveBtnRef.current);
      saveBtnRef.current?.classList.remove('pop');
      void saveBtnRef.current?.offsetWidth;
      saveBtnRef.current?.classList.add('pop');
    }
    showToast(isSaved ? 'Removed from saved' : 'Saved ✓');
    onToggleSave();
  }, [isSaved, onToggleSave]);

  return (
    <div
      ref={cardRef}
      className={`${isInitial ? '' : 'card-before-reveal '}card card-bloom card-interactive p-5 flex flex-col justify-between`}
      style={{ minHeight: 320, opacity: isClosed ? 0.45 : undefined, borderTop: `3px solid ${badge.color}`, '--bloom-color': badge.color } as React.CSSProperties}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="badge-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
            <span style={{ fontSize: 15 }}>{badge.emoji}</span>
            {program.category}
          </span>
        </div>

        <h2 className={`font-bold text-base leading-snug mb-1 ${isClosed ? 'text-faint' : 'text-primary'}`}>
          {program.name}
        </h2>
        <p className="text-xs mb-2 text-tertiary">{program.provider}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
          <span className="text-xs text-secondary">📅 {program.duration}</span>
          <span className="text-xs text-secondary">🎓 {program.grades}</span>
          <span className="text-xs text-secondary">📍 {program.location}</span>
        </div>
        <p className="text-sm mb-2 text-secondary leading-relaxed">{program.description}</p>
        {program.paid && program.stipend && (
          <p className="mb-3">
            <span className="stipend-pill">
              <span style={{ fontSize: 13 }}>🪙</span>
              {program.stipend}
            </span>
          </p>
        )}

        <div className="pt-4 grid grid-cols-2 gap-2 border-t border-subtle">
          <div>
            <p className="meta-label">Eligibility</p>
            <p className="text-xs leading-snug text-secondary">{program.eligibility}</p>
          </div>
          <div className="text-right flex flex-col items-end overflow-hidden">
            <p className="meta-label">Deadline</p>
            <p className={`text-sm font-medium ${deadlineColor}`} style={deadlineUrgent ? { color: 'var(--color-urgent)' } : undefined}>
              {program.deadline === 'Ongoing' ? 'Ongoing' : formatDeadline(program.deadline)}
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4 flex gap-2">
        <a href={`/programs/${generateSlug(program.name)}`}
          aria-label={`View details for ${program.name}`}
          className="flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold flex items-center justify-center border border-strong text-secondary hover:border-brand hover:text-primary transition-colors">
          View Details
        </a>
        {!isClosed && (
          <a href={program.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
            aria-label={`Learn more about ${program.name} (opens in new tab)`}
            className="btn-teal flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ background: 'var(--brand)', color: 'var(--text-on-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Learn More
          </a>
        )}
        <button
          ref={saveBtnRef}
          onClick={handleSave}
          aria-label={isSaved ? 'Remove from saved' : 'Save program'}
          className={`bmk-btn flex items-center justify-center shrink-0 rounded-[10px] cursor-pointer transition-all duration-150 ${isSaved ? 'text-brand border border-[rgba(var(--brand-rgb),0.4)]' : 'text-secondary border border-strong'}`}
          style={{ width: 44, background: isSaved ? 'var(--brand-dim)' : undefined }}
        >
          <BookmarkSVG filled={isSaved} />
        </button>
      </div>
    </div>
  );
}
