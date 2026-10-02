// "What's next" on a listing page: two or three open listings a student can
// move on to, each with the reason it was picked.
//
// Half or more of arrivals land on one listing page from Google, average
// 2.2 pages, and only 1-9% scroll to "More like this" at the bottom
// (private/flow-plan, 2026-10-01). These sit just under the listing's own
// What you'll need, so the next step is on the screen that ends this one.
//
// Not balanced across the corpus like "More like this" (lib/related.ts):
// that rail exists to give every page inbound links, and its picks are loose
// on purpose. Here the best match is the point, and a reason the student can
// read ("Also Calgary", "Same work: essay") is what makes it a next step
// rather than a list. No data-loader import, so it stays testable alone.

import type { ApplyKind, ToApply } from './to-apply';

export interface NextPick<T> { item: T; why: string }

export interface NextOptions<T> {
  /** Open now: a next step is never a listing you can't apply to yet. */
  isOpen: (item: T) => boolean;
  /** Whoever can apply to `self` can plausibly apply to `other`: no narrower place, field or group. */
  fits?: (self: T, other: T) => boolean;
  /** Deadlines this close count as the same time, so `prefer` decides between them. */
  bucketMs?: number;
  /** Among the same time, which first (a bigger award, say). */
  prefer?: (a: T, b: T) => number;
  /** Deadline in ms; Infinity when there is none. */
  deadlineMs: (item: T) => number;
  /** Reasons in the order they are tried. Each gives a label, or null when the pair doesn't share it. */
  reasons: ((self: T, other: T) => string | null)[];
  /** A fallback reason for a pick that shares nothing but timing. */
  fallback?: string;
  /** Which listings the fallback may offer. Sharing nothing but timing, a pick has to be good on its own. */
  fallbackOk?: (item: T) => boolean;
  /** At most this many fallback picks, so the same few strong listings don't fill every page. */
  fallbackMax?: number;
  /** ...unless that would leave fewer picks than this. */
  atLeast?: number;
  exclude?: ReadonlySet<T>;
  n?: number;
}

/**
 * One pick per reason, closest deadline to this listing's first, then the
 * fallback by the same rule until there are `n`. A listing is picked once.
 */
export function whatsNext<T>(self: T, items: readonly T[], o: NextOptions<T>): NextPick<T>[] {
  const n = o.n ?? 3;
  const mine = o.deadlineMs(self);
  const pool = items.filter(it => it !== self && !o.exclude?.has(it) && o.isOpen(it) && (o.fits ? o.fits(self, it) : true));
  // Around the same time as this one; with no deadline here, soonest first.
  const gap = (it: T) => {
    const d = o.deadlineMs(it);
    if (d === Infinity) return Infinity;
    return mine === Infinity ? d : Math.abs(d - mine);
  };
  const bucket = (it: T) => { const g = gap(it); return o.bucketMs && g !== Infinity ? Math.floor(g / o.bucketMs) : g; };
  const byGap = [...pool].sort((a, b) => bucket(a) - bucket(b) || (o.prefer ? o.prefer(a, b) : 0) || gap(a) - gap(b));
  const picks: NextPick<T>[] = [];
  const taken = new Set<T>();
  for (const reason of o.reasons) {
    if (picks.length >= n) break;
    for (const it of byGap) {
      if (taken.has(it)) continue;
      const why = reason(self, it);
      if (why) { picks.push({ item: it, why }); taken.add(it); break; }
    }
  }
  if (o.fallback) {
    const stop = Math.min(n, Math.max(picks.length + (o.fallbackMax ?? n), o.atLeast ?? 0));
    for (const it of byGap) {
      if (picks.length >= stop) break;
      if (!taken.has(it) && (o.fallbackOk ? o.fallbackOk(it) : true)) { picks.push({ item: it, why: o.fallback }); taken.add(it); }
    }
  }
  return picks;
}

// ── Same work ────────────────────────────────────────────────────────────────

/** The kinds that are real work. A form, an account and "other" come with every award. */
const WORK: ApplyKind[] = ['essay', 'reference', 'transcript', 'video', 'interview', 'financial', 'acceptance'];
const WORK_WORD: Partial<Record<ApplyKind, string>> = {
  essay: 'essay', reference: 'reference letter', transcript: 'transcript', video: 'video',
  interview: 'interview', financial: 'financial form', acceptance: 'proof of acceptance',
};

/** A key two listings share when they ask for the same work: 'none', or the work kinds in a fixed order. */
export function workKey(t: ToApply | null | undefined): string | null {
  if (!t?.items.length) return null;
  if (t.items.some(i => i.kind === 'none')) return 'none';
  const kinds = WORK.filter(k => t.items.some(i => i.kind === k));
  return kinds.length ? kinds.join('+') : null;
}

/** "Also no application", "Same work: essay, reference letter". */
export function workLabel(key: string): string {
  if (key === 'none') return 'Also no application';
  return `Same work: ${key.split('+').map(k => WORK_WORD[k as ApplyKind] ?? k).join(', ')}`;
}
