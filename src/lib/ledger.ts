// The figures and the month chart across the top of both directories. The
// server renders them from the default list; the page script repaints them from
// the visible list on every filter change, through the same functions, so the
// two passes cannot disagree.
import { programLedger, scholarshipLedger } from './list-core.ts';
import type { MonthBucket, ProgramWithMeta, ScholarshipWithMeta } from './list-core.ts';

export interface Fig { key: string; value: string; label: string; money?: boolean }
export type MonthFormat = 'money' | 'count';

const money = (n: number) => '$' + n.toLocaleString('en-CA');
const day = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
const inDays = (days: number) => (days === 0 ? 'today' : days === 1 ? '1 day left' : `${days} days left`);

/** A figure with an empty value is hidden, not printed as $0. */
export function scholarshipFigs(visible: ScholarshipWithMeta[]): Fig[] {
  const l = scholarshipLedger(visible);
  const next = l.next;
  return [
    { key: 'open', value: l.open ? money(l.open) : '', label: 'Open to apply now', money: true },
    l.openCount
      ? { key: 'count', value: l.openCount.toLocaleString('en-CA'), label: l.openCount === 1 ? 'Award open' : 'Awards open' }
      : { key: 'count', value: visible.length.toLocaleString('en-CA'), label: visible.length === 1 ? 'Listing' : 'Listings' },
    {
      key: 'next',
      value: next ? day(next.iso) : '',
      label: !next ? '' : next.kind === 'deadline'
        ? `Next deadline, ${inDays(next.days)}`
        : next.days === 0 ? 'Next opening, today' : `Next opening, in ${next.days} ${next.days === 1 ? 'day' : 'days'}`,
    },
    { key: 'soon', value: l.soon ? money(l.soon) : '', label: l.open ? 'Opening later this cycle' : 'Opening in a later cycle', money: !l.open },
  ];
}

export function programFigs(visible: ProgramWithMeta[]): Fig[] {
  const l = programLedger(visible);
  return [
    { key: 'open', value: l.openCount.toLocaleString('en-CA'), label: l.openCount === 1 ? 'Program taking applications' : 'Programs taking applications' },
    { key: 'paid', value: l.paid.toLocaleString('en-CA'), label: l.paid === 1 ? 'Pays you to take part' : 'Pay you to take part', money: true },
    { key: 'next', value: l.next ? day(l.next.iso) : '', label: l.next ? `Next deadline, ${inDays(l.next.days)}` : '' },
    { key: 'tba', value: l.tba ? l.tba.toLocaleString('en-CA') : '', label: 'Ongoing or date to come' },
  ];
}

/** "$76k", "$2.5k", "$900": short enough to sit on a bar at phone width. */
export function shortMoney(n: number): string {
  if (n < 1000) return `$${Math.round(n)}`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  return `$${n >= 10000 ? Math.round(n / 1000) : (n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}

/** What one bar prints, what it says to a screen reader, and how tall it is. */
export function monthBars(months: MonthBucket[], format: MonthFormat) {
  const max = Math.max(0, ...months.map(m => m.total));
  return months.map((m, i) => ({
    ...m,
    now: i === 0,
    value: format === 'money' ? shortMoney(m.total) : String(m.total),
    sub: format === 'money' ? `${m.count} due` : '',
    spoken: format === 'money'
      ? `${m.name}: ${money(m.total)} due across ${m.count} ${m.count === 1 ? 'award' : 'awards'}`
      : `${m.name}: ${m.total} ${m.total === 1 ? 'program closes' : 'programs close'}`,
    height: max ? Math.round((m.total / max) * 100) : 0,
  }));
}

/** Repaints the server's markup in place: the figures, then the twelve bars. */
export function paintLedger(root: HTMLElement, figs: Fig[], months: MonthBucket[], format: MonthFormat): void {
  for (const f of figs) {
    const cell = root.querySelector<HTMLElement>(`[data-fig="${f.key}"]`);
    if (!cell) continue;
    cell.hidden = f.value === '';
    cell.querySelector('[data-fig-value]')!.textContent = f.value;
    cell.querySelector('[data-fig-label]')!.textContent = f.label;
    cell.querySelector('[data-fig-value]')!.classList.toggle('is-money', !!f.money);
  }
  const bars = monthBars(months, format);
  const items = root.querySelectorAll<HTMLElement>('[data-month]');
  bars.forEach((b, i) => {
    const li = items[i];
    if (!li) return;
    li.className = `sabl-month${b.now ? ' is-now' : ''}${b.total ? '' : ' is-zero'}`;
    li.style.setProperty('--h', `${b.height}%`);
    li.querySelector('[data-month-v]')!.textContent = b.value;
    li.querySelector('[data-month-m]')!.textContent = b.label;
    const sub = li.querySelector<HTMLElement>('[data-month-n]');
    if (sub) sub.textContent = b.sub;
    li.querySelector('[data-month-sr]')!.textContent = b.spoken;
  });
  const empty = root.querySelector<HTMLElement>('[data-months-empty]');
  if (empty) empty.hidden = bars.some(b => b.total > 0);
}
