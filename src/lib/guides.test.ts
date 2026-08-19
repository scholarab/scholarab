import { describe, expect, it } from 'vitest';
import { guides } from './guides.ts';
import { generateSlug } from './utils.ts';
import { META_MAX } from './meta.ts';
import scholarships from '../data/scholarships.json';

// SabGuide builds its keep-reading block from this list. It used to take
// `.slice(0, 3)`, which linked the first three guides from all eight pages and
// left the rest with a single inbound link — Search Console filed them under
// "Discovered - currently not indexed". These tests pin the properties that
// made the rotation necessary, so a future edit can't quietly orphan a guide.
describe('the keep-reading link graph', () => {
  // Mirrors the computation in SabGuide.astro.
  function keepReading(slug: string) {
    const others = guides.filter(g => g.slug !== slug);
    const start = guides.findIndex(g => g.slug === slug) % (others.length || 1);
    return [...others.slice(start), ...others.slice(0, start)].slice(0, 3);
  }

  it('never links a guide to itself', () => {
    for (const g of guides) {
      expect(keepReading(g.slug).map(x => x.slug)).not.toContain(g.slug);
    }
  });

  it('gives every guide at least one inbound link from a sibling', () => {
    const inbound = new Map(guides.map(g => [g.slug, 0]));
    for (const g of guides) {
      for (const k of keepReading(g.slug)) inbound.set(k.slug, inbound.get(k.slug)! + 1);
    }
    const orphans = [...inbound].filter(([, n]) => n === 0).map(([s]) => s);
    expect(orphans).toEqual([]);
  });

  it('offers three distinct reads whenever there are enough guides', () => {
    for (const g of guides) {
      const picks = keepReading(g.slug).map(x => x.slug);
      expect(new Set(picks).size).toBe(picks.length);
      expect(picks).toHaveLength(Math.min(3, guides.length - 1));
    }
  });
});

// [type]/[slug].astro renders the reciprocal "read the guide" link by matching
// these slugs against generateSlug(title). A typo would silently render
// nothing, which is exactly the asymmetry that left the Rutherford pair as
// "Duplicate, Google chose different canonical than user".
describe('relatedListings', () => {
  it('names scholarships that actually exist', () => {
    const known = new Set((scholarships as { title: string }[]).map(s => generateSlug(s.title)));
    for (const g of guides) {
      for (const slug of g.relatedListings ?? []) {
        expect(known, `${g.slug} points at a missing listing: ${slug}`).toContain(slug);
      }
    }
  });

  it('never points two guides at the same listing', () => {
    const seen = new Map<string, string>();
    for (const g of guides) {
      for (const slug of g.relatedListings ?? []) {
        expect(seen.has(slug), `${slug} is claimed by both ${seen.get(slug)} and ${g.slug}`).toBe(false);
        seen.set(slug, g.slug);
      }
    }
  });
});

describe('meta descriptions', () => {
  // The generated listing descriptions are clamped by scholarshipMeta; these
  // are hand-written, so nothing was stopping them from running past the cut.
  // The Rutherford guide's did, on the highest-impression page on the site.
  it('fit inside what Google renders', () => {
    for (const g of guides) {
      expect(g.description.length, `${g.slug} is ${g.description.length} chars`).toBeLessThanOrEqual(META_MAX);
    }
  });

  it('are distinct, so no two guides compete on the same snippet', () => {
    const seen = new Set(guides.map(g => g.description));
    expect(seen.size).toBe(guides.length);
  });
});
