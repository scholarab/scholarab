// ICS export for the saved-page deadline calendar. Pure string building;
// the download wrapper is the only DOM-touching part.

export interface ICSScholarship {
  id: number;
  title: string;
  amount?: string | null;
  url: string;
  deadline: string | null;
}

export interface ICSProgram {
  id: number;
  name: string;
  url: string;
  deadline: string | null;
}

// RFC 5545 §3.3.11: backslash, semicolon, and comma must be escaped in text
// values, newlines become \n; otherwise a comma in a title truncates the
// field in strict calendar clients.
function escapeICSText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// RFC 5545 3.1: no content line may exceed 75 octets. Longer ones are folded
// by breaking them and starting the continuation with a single space, which
// the parser strips again. Lenient clients cope with an unfolded long line;
// strict ones truncate the property or drop the event, and DESCRIPTION here
// carries a title, an amount and a URL, so it clears 75 routinely.
//
// Measured in octets, not characters: an accented letter in a title is two
// bytes and a folded line that counted characters would still be over.
function foldICSLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const out: string[] = [];
  let chunk = '';
  let chunkBytes = 0;
  // First line gets 75 octets, continuations 74, since the leading space they
  // are written with counts toward the limit too.
  let budget = 75;
  // Iterated by code point rather than by index, so a fold never lands in the
  // middle of a surrogate pair and splits an emoji into two invalid halves.
  for (const ch of line) {
    const size = new TextEncoder().encode(ch).length;
    if (chunkBytes + size > budget) {
      out.push(chunk);
      chunk = '';
      chunkBytes = 0;
      budget = 74;
    }
    chunk += ch;
    chunkBytes += size;
  }
  if (chunk) out.push(chunk);
  return out[0] + out.slice(1).map(c => `\r\n ${c}`).join('');
}

// Format a Date's LOCAL calendar day as YYYYMMDD. toISOString() converts to
// UTC first, which shifts local midnight to the previous day for visitors
// east of Greenwich and would make DTEND equal DTSTART.
function localDateStr(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export function buildICS(scholarships: ICSScholarship[], programs: ICSProgram[]): string {
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
    const endStr = localDateStr(end);
    const amountPart = s.amount ? `: ${escapeICSText(s.amount)}` : '';
    lines.push(
      'BEGIN:VEVENT',
      `UID:scholarab-sch-${s.id}@scholarab.ca`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${endStr}`,
      `SUMMARY:Deadline: ${escapeICSText(s.title)}`,
      `DESCRIPTION:${escapeICSText(s.title)}${amountPart}\\nApply at: ${s.url}`,
      `URL:${s.url}`,
      'END:VEVENT',
    );
  }

  for (const p of programs) {
    if (!p.deadline || p.deadline === 'TBA' || p.deadline === 'Ongoing') continue;
    const dateStr = p.deadline.replace(/-/g, '');
    const end = new Date(p.deadline + 'T00:00:00');
    end.setDate(end.getDate() + 1);
    const endStr = localDateStr(end);
    lines.push(
      'BEGIN:VEVENT',
      `UID:scholarab-prg-${p.id}@scholarab.ca`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${endStr}`,
      `SUMMARY:Deadline: ${escapeICSText(p.name)}`,
      `DESCRIPTION:${escapeICSText(p.name)}\\nLearn more: ${p.url}`,
      `URL:${p.url}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldICSLine).join('\r\n');
}

export function downloadICS(scholarships: ICSScholarship[], programs: ICSProgram[]) {
  const content = buildICS(scholarships, programs);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'scholarab-deadlines.ics';
  a.click();
  URL.revokeObjectURL(url);
}
