import { useState, useMemo } from 'react';
import type { ScholarshipWithMeta, ProgramWithMeta } from '../hooks/useItems.ts';

type DeadlineItem = { title: string; url: string; amount?: string; type: 'scholarship' | 'program' };

function buildICS(scholarships: ScholarshipWithMeta[], programs: ProgramWithMeta[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ScholarAB//scholarab.ca//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

  for (const s of scholarships) {
    if (!s.deadline || s.deadline === 'TBA') continue;
    const dateStr = s.deadline.replace(/-/g, '');
    const end = new Date(s.deadline + 'T00:00:00');
    end.setDate(end.getDate() + 1);
    const endStr = end.toISOString().slice(0, 10).replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:scholarab-sch-${s.id}@scholarab.ca`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${endStr}`,
      `SUMMARY:Deadline: ${s.title}`,
      `DESCRIPTION:${s.title}: ${s.amount}\\nApply at: ${s.url}`,
      `URL:${s.url}`,
      'END:VEVENT',
    );
  }

  for (const p of programs) {
    if (!p.deadline || p.deadline === 'TBA' || p.deadline === 'Ongoing') continue;
    const dateStr = p.deadline.replace(/-/g, '');
    const end = new Date(p.deadline + 'T00:00:00');
    end.setDate(end.getDate() + 1);
    const endStr = end.toISOString().slice(0, 10).replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:scholarab-prg-${p.id}@scholarab.ca`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${endStr}`,
      `SUMMARY:Deadline: ${p.name}`,
      `DESCRIPTION:${p.name}\\nLearn more: ${p.url}`,
      `URL:${p.url}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadICS(scholarships: ScholarshipWithMeta[], programs: ProgramWithMeta[]) {
  const content = buildICS(scholarships, programs);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'scholarab-deadlines.ics';
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  scholarships: ScholarshipWithMeta[];
  programs: ProgramWithMeta[];
}

export default function DeadlineCalendar({ scholarships, programs }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const deadlineMap = useMemo(() => {
    const map = new Map<string, DeadlineItem[]>();
    for (const s of scholarships) {
      if (!s.deadline || s.deadline === 'TBA') continue;
      const items = map.get(s.deadline) ?? [];
      items.push({ title: s.title, url: s.url, amount: s.amount, type: 'scholarship' });
      map.set(s.deadline, items);
    }
    for (const p of programs) {
      if (!p.deadline || p.deadline === 'TBA' || p.deadline === 'Ongoing') continue;
      const items = map.get(p.deadline) ?? [];
      items.push({ title: p.name, url: p.url, type: 'program' });
      map.set(p.deadline, items);
    }
    return map;
  }, [scholarships, programs]);

  const year = month.getFullYear();
  const mon  = month.getMonth();

  const cells = useMemo(() => {
    const firstDow = new Date(year, mon, 1).getDay();
    const days = new Date(year, mon + 1, 0).getDate();
    const arr: (number | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= days; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, mon]);

  const todayStr = useMemo(() =>
    `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`,
    [today]
  );

  function dayStr(d: number) {
    return `${year}-${String(mon+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  const selectedItems: DeadlineItem[] = selectedDay ? (deadlineMap.get(selectedDay) ?? []) : [];
  const monthLabel = month.toLocaleString('en-CA', { month: 'long', year: 'numeric' });
  const monthHasDeadline = cells.some(d => d !== null && deadlineMap.has(dayStr(d)));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-tertiary">Deadline Calendar</h2>
        <button
          onClick={() => downloadICS(scholarships, programs)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-secondary hover:text-primary"
          style={{ background: 'var(--bg-subtle)', border: '0.5px solid var(--border-card)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Add to Calendar
        </button>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => { setMonth(new Date(year, mon - 1, 1)); setSelectedDay(null); }}
            className="w-8 h-8 flex items-center justify-center rounded-full text-secondary hover:bg-subtle transition-colors"
            aria-label="Previous month"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 12L6 8l4-4"/></svg>
          </button>
          <span className="text-sm font-semibold text-primary">{monthLabel}</span>
          <button
            onClick={() => { setMonth(new Date(year, mon + 1, 1)); setSelectedDay(null); }}
            className="w-8 h-8 flex items-center justify-center rounded-full text-secondary hover:bg-subtle transition-colors"
            aria-label="Next month"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 12l4-4-4-4"/></svg>
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-tertiary py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const ds = dayStr(d);
            const items = deadlineMap.get(ds);
            const isToday    = ds === todayStr;
            const isSelected = ds === selectedDay;
            const isPast     = new Date(ds + 'T00:00:00') < today;
            return (
              <button
                key={i}
                onClick={() => items && setSelectedDay(isSelected ? null : ds)}
                className="flex flex-col items-center gap-0.5 py-1 rounded-lg transition-colors"
                style={{
                  cursor: items ? 'pointer' : 'default',
                  background: isSelected ? 'var(--brand-dim)' : isToday ? 'var(--bg-subtle)' : undefined,
                  outline: isToday ? '1px solid var(--brand-border)' : undefined,
                }}
                aria-label={items ? `${ds}: ${items.length} deadline${items.length > 1 ? 's' : ''}` : undefined}
              >
                <span className="text-xs font-medium"
                  style={{ color: isSelected ? 'var(--brand)' : isPast ? 'var(--text-faint)' : 'var(--text-primary)' }}>
                  {d}
                </span>
                {items && (
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--brand)',
                    opacity: isPast ? 0.4 : 1,
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {selectedDay && selectedItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-subtle space-y-2">
            <p className="text-xs font-semibold text-tertiary uppercase tracking-widest mb-3">
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            {selectedItems.map((item, i) => (
              <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-subtle"
                style={{ border: '0.5px solid var(--border-card)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{item.title}</p>
                  <p className="text-xs text-tertiary mt-0.5">{item.type === 'scholarship' ? item.amount : 'Research Program'}</p>
                </div>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 12l4-4-4-4"/></svg>
              </a>
            ))}
          </div>
        )}

        {!monthHasDeadline && (
          <p className="text-center text-xs text-tertiary mt-4">No deadlines this month</p>
        )}
      </div>
    </div>
  );
}
