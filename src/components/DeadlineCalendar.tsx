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
  const [added, setAdded] = useState(false);

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
    // Always 6 weeks so the calendar height doesn't change month to month
    while (arr.length < 42) arr.push(null);
    return arr;
  }, [year, mon]);

  const todayStr = useMemo(() =>
    `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`,
    [today]
  );

  function dayStr(d: number) {
    return `${year}-${String(mon+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  const monthLabel = month.toLocaleString('en-CA', { month: 'long', year: 'numeric' });

  // Every deadline in the displayed month, in day order
  const monthDeadlines = useMemo(() => {
    const out: { date: string; item: DeadlineItem }[] = [];
    for (const d of cells) {
      if (d === null) continue;
      const ds = dayStr(d);
      for (const item of deadlineMap.get(ds) ?? []) out.push({ date: ds, item });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, deadlineMap, year, mon]);

  return (
    <div style={{ marginTop: 48 }}>
      {/* Toolbar */}
      <div className="sabs-cal-toolbar">
        <div className="sabs-section-head sabl-mono" style={{ borderTop: 'none', padding: 0 }}>
          <span className="sabs-dot" style={{ background: '#2FD3A0' }} aria-hidden="true" />
          <span>DEADLINE CALENDAR</span>
        </div>
        <button
          type="button"
          onClick={() => { downloadICS(scholarships, programs); setAdded(true); }}
          className="sabs-cal-add"
        >
          {added ? '✓ Added to calendar' : 'Add to calendar'}
        </button>
      </div>

      <div className="sabs-cal-card">
        <div className="sabs-cal-head">
          <button
            type="button"
            onClick={() => setMonth(new Date(year, mon - 1, 1))}
            className="sabs-cal-nav"
            aria-label="Previous month"
          >←</button>
          <div className="sabs-cal-month">{monthLabel}</div>
          <button
            type="button"
            onClick={() => setMonth(new Date(year, mon + 1, 1))}
            className="sabs-cal-nav"
            aria-label="Next month"
          >→</button>
        </div>

        <div className="sabs-cal-grid" style={{ marginBottom: 8 }}>
          {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
            <div key={d} className="sabl-mono sabs-cal-wd">{d}</div>
          ))}
        </div>

        <div className="sabs-cal-grid">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} className="sabs-cal-cell blank" />;
            const ds = dayStr(d);
            const items = deadlineMap.get(ds);
            const isToday = ds === todayStr;
            return (
              <div
                key={i}
                className={`sabs-cal-cell${items ? ' has-due' : ''}${isToday ? ' today' : ''}`}
                aria-label={items ? `${ds}: ${items.length} deadline${items.length > 1 ? 's' : ''}` : undefined}
              >
                <div className="sabs-cal-day">{d}</div>
                {items && (
                  <div className="sabl-mono sabs-cal-due">{items.length} DUE</div>
                )}
              </div>
            );
          })}
        </div>

        {monthDeadlines.length > 0 ? (
          <div className="sabs-cal-list">
            {monthDeadlines.map(({ date, item }, i) => (
              <div key={i} className="sabs-cal-row">
                <div className="sabl-mono sabs-cal-date">
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
                </div>
                <div>
                  <div className="sabs-cal-name">{item.title}</div>
                  <div className="sabl-mono sabs-cal-kind">
                    {item.type === 'scholarship' ? `SCHOLARSHIP${item.amount ? ' — ' + item.amount.toUpperCase() : ''}` : 'RESEARCH PROGRAM'}
                  </div>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="sabl-apply"
                  style={{ fontSize: 13.5 }}
                >Apply →</a>
              </div>
            ))}
          </div>
        ) : (
          <div className="sabl-mono sabs-cal-none">No deadlines this month.</div>
        )}
      </div>
    </div>
  );
}
