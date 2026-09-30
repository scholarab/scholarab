import { describe, it, expect } from 'vitest';
import { COMBOS, CITY_COMBOS, MIN_COMBO_CORE, MIN_COMBO_ITEMS, combosForCity, comboCities, type ComboTarget } from './combos.ts';
import { SCHOLARSHIP_FACETS } from './facets.ts';

const TODAY = new Date('2027-01-15T00:00:00');

let nextId = 1;
function award(over: Partial<ComboTarget> & { eligibility?: ComboTarget['eligibility'] } = {}): ComboTarget {
  return {
    id: nextId++,
    title: `Award ${nextId}`,
    region: 'Medicine Hat',
    audience: 'Grade 12 students',
    deadline: '2027-05-01',
    active: true,
    ...over,
    eligibility: { grades: ['12'], schoolBoards: [], specificSchools: [], targetInstitutions: [], fields: [], ...over.eligibility },
  };
}

const catholic = (over: Partial<ComboTarget> = {}) => award({ ...over, eligibility: { schoolBoards: ['MHCBE'] } });
const college = (over: Partial<ComboTarget> & { eligibility?: ComboTarget['eligibility'] } = {}) =>
  award({ ...over, eligibility: { grades: ['12', 'post-secondary'], targetInstitutions: ['Medicine Hat College'], ...over.eligibility } });

const names = (items: ComboTarget[]) => combosForCity('medicine-hat', items, TODAY).map(b => b.combo.slug);

describe('combo registry', () => {
  it('names only cities that have a hub and a page entry', () => {
    const hubs = new Set(SCHOLARSHIP_FACETS.map(f => f.slug));
    const pages = new Set(CITY_COMBOS.map(c => c.city));
    for (const c of COMBOS) {
      expect(hubs.has(c.city), c.slug).toBe(true);
      expect(pages.has(c.city), c.slug).toBe(true);
    }
  });

  it('has unique anchors within a city', () => {
    for (const { city } of CITY_COMBOS) {
      const slugs = COMBOS.filter(c => c.city === city).map(c => c.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it('keeps meta descriptions in the house range', () => {
    for (const c of CITY_COMBOS) {
      expect(c.description.length, c.city).toBeGreaterThanOrEqual(130);
      expect(c.description.length, c.city).toBeLessThanOrEqual(155);
    }
  });
});

describe('combosForCity', () => {
  it('splits a city by the fact that decides eligibility', () => {
    const items = [catholic(), catholic(), catholic(), award({ audience: 'Redcliff residents' }), award()];
    const built = combosForCity('medicine-hat', items, TODAY);
    expect(built.map(b => b.combo.slug)).toEqual(['catholic-school-graduates']);
    expect(built[0]!.core).toHaveLength(3);
  });

  it('leaves out single-school awards from a board-wide combo', () => {
    const mcCoy = award({ eligibility: { schoolBoards: ['MHCBE'], specificSchools: ['Monsignor McCoy High School'] } });
    const built = combosForCity('medicine-hat', [catholic(), catholic(), catholic(), mcCoy], TODAY);
    expect(built[0]!.core.map(s => s.id)).not.toContain(mcCoy.id);
  });

  it('drops closed awards and awards only for students past high school', () => {
    const closed = catholic({ deadline: '2026-12-01' });
    const after = award({ eligibility: { schoolBoards: ['MHCBE'], grades: ['post-secondary'] } });
    expect(names([catholic(), catholic(), closed, after])).toEqual([]);
  });

  it('counts an award that is between cycles, since it will open again', () => {
    const waiting = catholic({ deadline: null, active: false });
    expect(names([catholic(), catholic(), waiting])).toEqual(['catholic-school-graduates']);
  });

  it('lists narrower awards as add-ons, not as core members', () => {
    const nursing = college({ eligibility: { fields: ['health'] } });
    const special = college({ audience: 'Medicine Hat College students with special needs' });
    const built = combosForCity('medicine-hat', [college(), college(), nursing, special], TODAY);
    expect(built[0]!.core).toHaveLength(2);
    expect(built[0]!.addOns.map(s => s.id).sort()).toEqual([nursing.id, special.id].sort());
  });

  it(`needs ${MIN_COMBO_CORE} core awards and ${MIN_COMBO_ITEMS} in all`, () => {
    const nursing = () => college({ eligibility: { fields: ['health'] } });
    expect(names([college(), college()])).toEqual([]);
    expect(names([college(), nursing(), nursing()])).toEqual([]);
    expect(names([college(), college(), nursing()])).toEqual(['medicine-hat-college']);
  });

  it('ignores awards filed under another city', () => {
    expect(names([catholic({ region: 'Calgary' }), catholic({ region: 'Calgary' }), catholic({ region: 'Calgary' })])).toEqual([]);
  });

  it('builds a page only for a city with a combo', () => {
    expect(comboCities([award()], TODAY)).toEqual([]);
    expect(comboCities([catholic(), catholic(), catholic()], TODAY).map(c => c.city)).toEqual(['medicine-hat']);
  });
});
