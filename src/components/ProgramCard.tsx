import { useRef } from 'react';
import { track } from '@vercel/analytics';
import { formatDeadline, generateSlug, showToast, showConfetti, getToday } from '../lib/utils.ts';
import { getStatus } from '../hooks/usePrograms.ts';
import { PROGRAM_BADGES as CATEGORY_BADGE, DEFAULT_BADGE } from '../lib/badges.ts';
import { useCardEntrance } from '../hooks/useCardEntrance.ts';
import type { ProgramWithMeta } from '../hooks/usePrograms.ts';

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

export default function ProgramCard({ program, index, isSaved, onToggleSave, isFiltered, isInitial }: ProgramCardProps) {
  const cardRef     = useRef<HTMLDivElement>(null);
  const saveBtnRef  = useRef<HTMLButtonElement>(null);
  useCardEntrance(cardRef, index, isInitial, isFiltered);
  const status      = getStatus(program);
  const isClosed    = status === 'closed';
  const badge       = CATEGORY_BADGE[program.category ?? ''] || DEFAULT_BADGE;

  const deadlineUrgent = !isClosed && status !== 'tba' && isWithin30Days(program.deadline);
  const deadlineColor = isClosed
    ? 'text-white/20'
    : status === 'tba'
    ? 'text-white/35'
    : deadlineUrgent
    ? ''
    : 'text-white/40';

  return (
    <div
      ref={cardRef}
      className={`${isInitial ? '' : 'card-before-reveal '}card p-5 flex flex-col justify-between`}
      style={{ minHeight: 320, opacity: isClosed ? 0.45 : undefined, borderTop: `2px solid ${badge.color}` }}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
            <span style={{ fontSize: 16 }}>{badge.emoji}</span>
            {program.category}
          </span>
        </div>

        <h2 className={`font-bold text-base leading-snug mb-1 ${isClosed ? 'text-white/25' : 'text-white'}`}>
          {program.name}
        </h2>
        <p className="text-xs mb-2 text-white/30">{program.provider}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
          <span className="text-xs text-white/40">📅 {program.duration}</span>
          <span className="text-xs text-white/40">🎓 {program.grades}</span>
          <span className="text-xs text-white/40">📍 {program.location}</span>
        </div>
        <p className="text-sm mb-2 text-white/45">{program.description}</p>
        {program.paid && program.stipend && (
          <p className="mb-2" style={{ color: '#22d3a5', fontSize: 20, fontWeight: 800 }}>{program.stipend}</p>
        )}

        <div className="pt-4 grid grid-cols-2 gap-2 border-t border-white/[0.06]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1 text-white/30">Eligibility</p>
            <p className="text-xs leading-snug text-white/40">{program.eligibility}</p>
          </div>
          <div className="text-right flex flex-col items-end overflow-hidden">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1 text-white/30">Deadline</p>
            <p className={`text-sm font-medium ${deadlineColor}`} style={deadlineUrgent ? { color: '#f87171' } : undefined}>
              {program.deadline === 'Ongoing' ? 'Ongoing' : formatDeadline(program.deadline)}
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4 flex gap-2">
        <a href={`/programs/${generateSlug(program.name)}`}
          aria-label={`View details for ${program.name}`}
          className="flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold flex items-center justify-center border border-white/[0.18] text-white/60 hover:border-white/30 hover:text-white/80 transition-colors">
          View Details
        </a>
        {!isClosed && (
          <a href={program.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
            aria-label={`Learn more about ${program.name} (opens in new tab)`}
            onClick={() => track('learn_more', { id: program.id, name: program.name })}
            className="btn-teal flex-1 text-center py-2.5 px-4 rounded-[10px] text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ background: '#22d3a5', color: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Learn More
          </a>
        )}
        <button
          ref={saveBtnRef}
          onClick={() => { if (!isSaved) showConfetti(saveBtnRef.current); showToast(isSaved ? 'Removed from saved' : 'Saved ✓'); onToggleSave(); }}
          aria-label={isSaved ? 'Remove from saved' : 'Save program'}
          className={`flex items-center justify-center flex-shrink-0 rounded-[10px] cursor-pointer transition-all duration-150 ${isSaved ? 'text-[#22d3a5] border border-[#22d3a5]/40' : 'text-white/50 border border-white/[0.18]'}`}
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
