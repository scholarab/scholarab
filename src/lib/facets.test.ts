import { describe, it, expect } from 'vitest';
import {
  SCHOLARSHIP_FACETS,
  PROGRAM_FACETS,
  RESERVED_SCHOLARSHIP_SLUGS,
  RESERVED_PROGRAM_SLUGS,
  facetItems,
  facetMatches,
  facetForListing,
  MIN_FACET_ITEMS,
  SCHOLARSHIP_CATEGORIES,
  PROGRAM_CATEGORIES,
} from './facets.ts';
import { generateSlug } from './utils.ts';
import scholarships from '../data/scholarships.json';
import programs from '../data/research-programs.json';

type Listing = { title?: string; name?: string; region?: string | null; category?: string | null; alsoOpenTo?: string[]; active?: boolean };

const allScholarships = scholarships as Listing[];
const listedPrograms = (programs as Listing[]).filter(p => p.active !== false);

describe('facet registry', () => {
  it('has unique slugs within each type', () => {
    expect(RESERVED_SCHOLARSHIP_SLUGS.size).toBe(SCHOLARSHIP_FACETS.length);
    expect(RESERVED_PROGRAM_SLUGS.size).toBe(PROGRAM_FACETS.length);
  });

  it('matches a value that actually exists in the data', () => {
    // A typo'd `value` produces a hub with zero items, which the floor then
    // silently drops; the page just never appears. Catch it here instead.
    const regions = new Set(allScholarships.map(s => s.region));
    const sCategories = new Set(allScholarships.map(s => s.category));
    for (const f of SCHOLARSHIP_FACETS) {
      const pool = f.kind === 'region' ? regions : sCategories;
      expect(pool, `scholarship facet "${f.slug}" matches value "${f.value}"`).toContain(f.value);
    }
    const pCategories = new Set(listedPrograms.map(p => p.category));
    for (const f of PROGRAM_FACETS) {
      expect(pCategories, `program facet "${f.slug}" matches value "${f.value}"`).toContain(f.value);
    }
  });

  it('every facet clears the doorway-page floor', () => {
    for (const f of SCHOLARSHIP_FACETS) {
      expect(facetItems(f, allScholarships).length, f.slug).toBeGreaterThanOrEqual(MIN_FACET_ITEMS);
    }
    for (const f of PROGRAM_FACETS) {
      expect(facetItems(f, listedPrograms).length, f.slug).toBeGreaterThanOrEqual(MIN_FACET_ITEMS);
    }
  });

  it('counts agree with a direct filter over the JSON', () => {
    const mh = SCHOLARSHIP_FACETS.find(f => f.slug === 'medicine-hat')!;
    expect(facetItems(mh, allScholarships).length).toBe(
      allScholarships.filter(s => s.region === 'Medicine Hat').length,
    );
    const stem = SCHOLARSHIP_FACETS.find(f => f.slug === 'stem')!;
    expect(facetItems(stem, allScholarships).length).toBe(
      allScholarships.filter(s => s.category === 'STEM').length,
    );
  });

  it('matches regions on region and categories on category, never the other field', () => {
    const mh = SCHOLARSHIP_FACETS.find(f => f.slug === 'medicine-hat')!;
    expect(facetMatches(mh, { region: 'Medicine Hat', category: 'Academic' })).toBe(true);
    expect(facetMatches(mh, { region: 'Calgary', category: 'Medicine Hat' })).toBe(false);
    const trades = SCHOLARSHIP_FACETS.find(f => f.slug === 'trades')!;
    expect(facetMatches(trades, { region: 'Trades', category: 'Arts' })).toBe(false);
    expect(facetMatches(trades, { region: 'Alberta', category: 'Trades' })).toBe(true);
  });

  it('puts an alsoOpenTo listing on the other region hub, but not in its breadcrumb', () => {
    // An award written for nine communities can only carry one of them in
    // `region`; alsoOpenTo is how the other eight hubs reach it. It must not
    // change where the listing itself lives, or a Calgary award would start
    // rendering an Airdrie breadcrumb.
    const airdrie = SCHOLARSHIP_FACETS.find(f => f.slug === 'airdrie')!;
    const calgary = SCHOLARSHIP_FACETS.find(f => f.slug === 'calgary')!;
    const listing = { region: 'Calgary', category: 'Academic', alsoOpenTo: ['Airdrie'] };
    expect(facetMatches(airdrie, listing)).toBe(true);
    expect(facetMatches(airdrie, listing, { primaryOnly: true })).toBe(false);
    expect(facetForListing(listing, SCHOLARSHIP_FACETS)).toBe(calgary);
  });

  it('counts the Airdrie hub as its own region plus what is also open to it', () => {
    const airdrie = SCHOLARSHIP_FACETS.find(f => f.slug === 'airdrie')!;
    const items = facetItems(airdrie, allScholarships);
    expect(items.length).toBe(
      allScholarships.filter(
        s => s.region === 'Airdrie' || (s.alsoOpenTo ?? []).includes('Airdrie'),
      ).length,
    );
    expect(items.some(s => s.region !== 'Airdrie')).toBe(true);
  });

  it('keeps a broad scope out of a listing breadcrumb but still gives it a hub', () => {
    // The province-wide and National hubs exist because readers search for
    // them, but a listing's crumb should still say Trades rather than
    // "Province-wide". If `broad` ever stops being honoured, 120 detail pages
    // silently change their breadcrumb, which is not the kind of change that
    // announces itself.
    const broad = SCHOLARSHIP_FACETS.filter(f => f.broad);
    expect(broad.map(f => f.slug).sort()).toEqual(['alberta', 'national']);
    for (const f of broad) {
      expect(facetItems(f, allScholarships).length).toBeGreaterThanOrEqual(MIN_FACET_ITEMS);
    }
    expect(facetForListing({ region: 'Alberta', category: 'Trades' }, SCHOLARSHIP_FACETS)?.slug).toBe('trades');
    expect(facetForListing({ region: 'National', category: 'STEM' }, SCHOLARSHIP_FACETS)?.slug).toBe('stem');
    // A city is not broad and still wins over its category.
    expect(facetForListing({ region: 'Airdrie', category: 'Trades' }, SCHOLARSHIP_FACETS)?.slug).toBe('airdrie');
  });

  it('claims International awards for the National hub', () => {
    // Nothing is filed International today. The synonym exists so that the day
    // one is, it lands on a scope instead of being reachable from none.
    const national = SCHOLARSHIP_FACETS.find(f => f.slug === 'national')!;
    expect(facetMatches(national, { region: 'International', category: 'General' })).toBe(true);
    expect(facetMatches(national, { region: 'Alberta', category: 'General' })).toBe(false);
  });
});

describe('reserved slugs', () => {
  // The hub route wins precedence over the detail route, so a listing slugging
  // to a facet slug would have its page silently replaced by the hub. This is
  // the same check validate-data runs at build time; here so a rename during
  // development fails a fast test rather than a five-minute build.
  it('no scholarship slugs onto a hub URL', () => {
    const collisions = allScholarships
      .map(s => generateSlug(s.title!))
      .filter(slug => RESERVED_SCHOLARSHIP_SLUGS.has(slug));
    expect(collisions).toEqual([]);
  });

  it('no program slugs onto a hub URL', () => {
    const collisions = (programs as Listing[])
      .map(p => generateSlug(p.name!))
      .filter(slug => RESERVED_PROGRAM_SLUGS.has(slug));
    expect(collisions).toEqual([]);
  });
});

describe('facet copy', () => {
  it('keeps titles short enough to survive the brand suffix', () => {
    // Google truncates around 60; the page appends " | ScholarAB" (12 chars).
    for (const f of [...SCHOLARSHIP_FACETS, ...PROGRAM_FACETS]) {
      expect(f.title.length + ' | ScholarAB'.length, f.slug).toBeLessThanOrEqual(60);
    }
  });

  it('keeps descriptions inside the house range', () => {
    for (const f of [...SCHOLARSHIP_FACETS, ...PROGRAM_FACETS]) {
      expect(f.description.length, `${f.slug} description`).toBeGreaterThanOrEqual(120);
      expect(f.description.length, `${f.slug} description`).toBeLessThanOrEqual(160);
    }
  });

  it('gives every facet real intro prose rather than a templated label', () => {
    for (const f of [...SCHOLARSHIP_FACETS, ...PROGRAM_FACETS]) {
      expect(f.intro.length, `${f.slug} intro`).toBeGreaterThan(120);
      // And the ceiling, which is a layout rule rather than a taste one:
      // .sabl-desc reserves three lines so the chip rows land at the same
      // height on every scope, and at 560px wide a fourth line starts
      // somewhere past 215 characters. 205 leaves room for a long word.
      expect(f.intro.length, `${f.slug} intro`).toBeLessThanOrEqual(205);
      // The h1 has to hold one line. At the top of its clamp it is 76px, and a
      // second line moves the toolbar and all three chip rows down by exactly
      // that much, which is the shift a reader sees when they hop between
      // scopes. 32 characters is where the wrap starts at 1440px: "Athletic
      // scholarships in Alberta" is the longest that holds, "Indigenous
      // scholarships in Alberta" at 34 was the first that did not.
      expect(f.h1.length, `${f.slug} h1`).toBeGreaterThan(0);
      expect(f.h1.length, `${f.slug} h1`).toBeLessThanOrEqual(32);
    }
  });

  it('keeps every intro to one sentence', () => {
    // The intro shares .sabl-title-row with the stat block. Four sentences on a
    // hub against two on /scholarships/ was the whole reason the two looked
    // like different layouts, and prose grows back one sentence at a time
    // unless something says no. A sentence break is a period followed by a
    // space; the amounts in these lines use commas, so nothing false-positives.
    for (const f of [...SCHOLARSHIP_FACETS, ...PROGRAM_FACETS]) {
      expect(f.intro, `${f.slug} intro`).not.toMatch(/\.\s/);
      expect(f.intro.endsWith('.'), `${f.slug} intro ends in a period`).toBe(true);
    }
  });

  it('only points at guides that exist', async () => {
    const { guides } = await import('./guides.ts');
    const known = new Set(guides.map(g => g.slug));
    for (const f of [...SCHOLARSHIP_FACETS, ...PROGRAM_FACETS]) {
      if (f.guide) expect(known, `${f.slug} guide`).toContain(f.guide);
    }
  });
});

describe('category vocabulary', () => {
  // The build enforces this too (validate-data), but a fast test catches a
  // rename during development rather than five minutes into a build.
  it('covers every category the data actually uses', () => {
    expect([...new Set(allScholarships.map(s => s.category))].sort())
      .toEqual([...SCHOLARSHIP_CATEGORIES].sort());
    expect([...new Set((programs as Listing[]).map(p => p.category))].sort())
      .toEqual([...PROGRAM_CATEGORIES].sort());
  });

  it('declares every facet value, so a hub can never outlive its category', () => {
    for (const f of SCHOLARSHIP_FACETS.filter(f => f.kind === 'category')) {
      expect(SCHOLARSHIP_CATEGORIES, f.slug).toContain(f.value);
    }
    for (const f of PROGRAM_FACETS) {
      expect(PROGRAM_CATEGORIES, f.slug).toContain(f.value);
    }
  });
});
