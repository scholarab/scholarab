/**
 * The counts the deadlines-by-month guide quotes, computed from the catalogue
 * at build time. They were typed in by hand once (644 dated deadlines, 259 in
 * May) and went stale as listings were added: by 2026-09-19 the data held 703
 * and 265. A guide that states a number next to a calendar that states a
 * different one reads as a site that is not checking itself.
 *
 * Deadlines still ahead of `fromIso` (YYYY-MM-DD) count, which is the rule
 * /deadlines files scholarships by. Until 2026-09-23 every dated scholarship
 * counted, passed ones too, so the guide said 1008 dated deadlines while the
 * calendar it links to listed 990 (critique 2026-09-23). Two honest numbers
 * that disagree read as a site that is not checking itself.
 */
export interface DeadlineStats {
  total: number;
  /** Index 0 = January. */
  byMonth: number[];
  /** Awards on one MM-DD date. */
  onDay(mmdd: string): number;
  /** Awards on one MM-DD date whose URL is on this host. */
  onDayFrom(mmdd: string, host: string): number;
  /** Awards on one MM-DD date for students headed to this school. A host
   *  count read 0 for Keyano once its files moved to a CDN. */
  onDayFor(mmdd: string, institution: string): number;
  /** The busiest MM-DD dates, most awards first. */
  topDays(n: number): Array<{ mmdd: string; count: number }>;
  sum(...months: number[]): number;
}

export function deadlineStats(
  listings: Array<{ deadline?: string | null; url?: string | null; eligibility?: { targetInstitutions?: string[] } | null }>,
  fromIso: string,
): DeadlineStats {
  type Dated = { deadline: string; url?: string | null; eligibility?: { targetInstitutions?: string[] } | null };
  const dated = listings.filter((s): s is Dated => !!s.deadline && s.deadline >= fromIso);
  const perDay = new Map<string, number>();
  for (const s of dated) perDay.set(s.deadline.slice(5), (perDay.get(s.deadline.slice(5)) ?? 0) + 1);
  const byMonth = Array.from({ length: 12 }, (_, m) =>
    dated.filter(s => Number(s.deadline.slice(5, 7)) === m + 1).length);
  const host = (u?: string | null) => { try { return new URL(u ?? '').hostname.replace(/^www\./, ''); } catch { return ''; } };
  return {
    total: dated.length,
    byMonth,
    onDay: mmdd => dated.filter(s => s.deadline.slice(5) === mmdd).length,
    onDayFrom: (mmdd, h) => dated.filter(s => s.deadline.slice(5) === mmdd && host(s.url) === h.replace(/^www\./, '')).length,
    onDayFor: (mmdd, inst) => dated.filter(s => s.deadline.slice(5) === mmdd && (s.eligibility?.targetInstitutions ?? []).includes(inst)).length,
    topDays: n => [...perDay].map(([mmdd, count]) => ({ mmdd, count }))
      .sort((a, b) => b.count - a.count || a.mmdd.localeCompare(b.mmdd)).slice(0, n),
    sum: (...months) => months.reduce((n, m) => n + byMonth[m - 1]!, 0),
  };
}
