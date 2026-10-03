import { describe, it, expect } from 'vitest';
import {
  PLACES, SCHOOLS, FROM_TOWNS, MAP_W, MAP_H, project, insideAlberta, kmBetween, mapPlaces, dotField,
} from './alberta-map';
import { SCHOLARSHIP_FACETS, facetItems } from './facets';
import { schoolOf } from './school-awards';
import scholarships from '../data/scholarships.json';

describe('the Alberta map', () => {
  it('puts every place and every town a student can measure from inside the border', () => {
    for (const p of [...PLACES, ...FROM_TOWNS]) {
      const [x, y] = project(p.lat, p.lon);
      expect(insideAlberta(x, y), p.name).toBe(true);
      expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(MAP_W);
      expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(MAP_H);
    }
  });

  it('draws north up and west left', () => {
    const [, north] = project(58, -115);
    const [, south] = project(50, -115);
    const [west] = project(54, -119);
    const [east] = project(54, -111);
    expect(north).toBeLessThan(south);
    expect(west).toBeLessThan(east);
  });

  it('gives every school a place that exists and every place a school', () => {
    const ids = new Set(PLACES.map(p => p.id));
    for (const s of SCHOOLS) {
      expect(s.campuses.length, s.name).toBeGreaterThan(0);
      for (const c of s.campuses) expect(ids.has(c.place), `${s.name} at ${c.place}`).toBe(true);
      expect(s.site, s.name).toMatch(/^https:\/\/[^/]+\/$/);
    }
    for (const p of mapPlaces()) expect(p.schools.length, p.name).toBeGreaterThan(0);
    expect(new Set(SCHOOLS.map(s => s.id)).size).toBe(SCHOOLS.length);
  });

  // The map promises "every school we list entrance awards for": a new school
  // award whose school is not on the map fails here until it is placed.
  it('places every school the entrance-awards list names', () => {
    const facet = SCHOLARSHIP_FACETS.find(f => f.bySchool)!;
    const named = new Set(facetItems(facet, scholarships as Parameters<typeof facetItems>[1])
      .map(s => schoolOf(s as Parameters<typeof schoolOf>[0])).filter((x): x is string => !!x));
    const placed = new Set(SCHOOLS.map(s => s.awardsName).filter(Boolean));
    expect([...named].filter(n => !placed.has(n))).toEqual([]);
  });

  it('measures distances the way a map does', () => {
    const at = (id: string) => PLACES.find(p => p.id === id)!;
    // Calgary to Edmonton is about 280 km in a straight line.
    expect(kmBetween(at('calgary'), at('edmonton'))).toBeGreaterThan(270);
    expect(kmBetween(at('calgary'), at('edmonton'))).toBeLessThan(290);
    expect(kmBetween(at('calgary'), at('calgary'))).toBe(0);
  });

  it('keeps the dot field small enough to ship in the page', () => {
    const d = dotField();
    expect((d.plain + d.foothills + d.peaks).length).toBeLessThan(60_000);
    // The Rockies band exists, and is a band, not the province.
    expect(d.peaks.length).toBeGreaterThan(0);
    expect(d.peaks.length).toBeLessThan(d.plain.length / 5);
  });
});
