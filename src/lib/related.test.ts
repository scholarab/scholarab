import { describe, it, expect } from 'vitest';
import { balancedRelated, inboundCounts } from './related.ts';
import scholarshipData from '../data/scholarships.json';
import programData from '../data/research-programs.json';

type Item = { id: number; category?: string | null; region?: string | null; deadline?: string | null; active?: boolean };

const ms = (d: string | null | undefined) => (d ? new Date(d + 'T00:00:00').getTime() : Number.MAX_SAFE_INTEGER);

/** The shape [type]/[slug].astro uses for scholarships, minus the open-date bonus. */
const opts = {
  score: (a: Item, b: Item) =>
    (b.category && b.category === a.category ? 2 : 0) + (b.region && b.region === a.region ? 1 : 0),
  qualifies: (score: number) => score > 1,
  prefer: (a: Item, b: Item) => ms(a.deadline) - ms(b.deadline),
};

const make = (n: number, cat: (i: number) => string): Item[] =>
  Array.from({ length: n }, (_, i) => ({ id: i, category: cat(i), region: 'Alberta', deadline: null }));

describe('balancedRelated', () => {
  it('gives every page the full number of slots', () => {
    const items = make(20, i => `c${i % 3}`);
    for (const row of balancedRelated(items, opts)) expect(row).toHaveLength(4);
  });

  it('never links an item to itself', () => {
    const items = make(20, i => `c${i % 3}`);
    balancedRelated(items, opts).forEach((row, i) => expect(row).not.toContain(items[i]));
  });

  it('never repeats a neighbour within one page', () => {
    const items = make(20, i => `c${i % 3}`);
    for (const row of balancedRelated(items, opts)) expect(new Set(row).size).toBe(row.length);
  });

  it('gives every item the inbound floor', () => {
    // This is the whole point of the change. The old selector left most of a
    // uniform corpus with zero inbound links because every page picked the
    // same first four.
    const items = make(40, () => 'same');
    const counts = inboundCounts(items, balancedRelated(items, opts));
    for (const it of items) expect(counts.get(it)!, `item ${it.id}`).toBeGreaterThanOrEqual(3);
  });

  it('still prefers a real category match over a filler', () => {
    // One item shares self's category; it must be picked even though the
    // balancing prefers under-linked candidates.
    const items: Item[] = [
      { id: 0, category: 'Arts', region: 'Alberta', deadline: null },
      { id: 1, category: 'Arts', region: 'Alberta', deadline: null },
      ...make(10, () => 'STEM').map((x, i) => ({ ...x, id: i + 2 })),
    ];
    const picks = balancedRelated(items, opts);
    expect(picks[0]).toContain(items[1]);
  });

  it('never links to an ineligible item, but still lets it link out', () => {
    const items = make(15, i => `c${i % 2}`).map((x, i) => ({ ...x, active: i !== 0 }));
    const picks = balancedRelated(items, { ...opts, eligible: (x: Item) => x.active !== false });
    for (const row of picks) expect(row).not.toContain(items[0]);
    expect(picks[0]).toHaveLength(4);
  });

  it('degrades rather than hanging when the corpus is too small for the floor', () => {
    const items = make(3, () => 'same');
    const picks = balancedRelated(items, opts);
    // Only two possible neighbours each; it returns what exists and stops.
    for (const row of picks) expect(row.length).toBeLessThanOrEqual(2);
  });

  it('is deterministic across runs', () => {
    const items = make(30, i => `c${i % 4}`);
    const a = balancedRelated(items, opts).map(r => r.map(x => x.id));
    const b = balancedRelated(items, opts).map(r => r.map(x => x.id));
    expect(a).toEqual(b);
  });
});

describe('the real corpus', () => {
  const scholarships = scholarshipData as Item[];
  const programs = programData as Item[];

  it('leaves no scholarship under-linked by its peers', () => {
    const counts = inboundCounts(scholarships, balancedRelated(scholarships, opts));
    const starved = scholarships.filter(s => counts.get(s)! < 3);
    expect(starved.map(s => s.id)).toEqual([]);
  });

  it('leaves no listed program under-linked by its peers', () => {
    // The section this whole change exists for: 68 of these had zero.
    const picks = balancedRelated(programs, { ...opts, eligible: (p: Item) => p.active !== false });
    const counts = inboundCounts(programs, picks);
    const starved = programs.filter(p => p.active !== false && counts.get(p)! < 3);
    expect(starved.map(p => p.id)).toEqual([]);
  });
});
