import { describe, it, expect } from 'vitest';
import { BOARDS, COMBOS, CITY_COMBOS, oneForm, MIN_COMBO_CORE, MIN_COMBO_ITEMS, combosForCity, comboCities, comboIndex, type ComboTarget } from './combos.ts';
import { QUIZ_QUESTIONS, schoolsForCity, boardsForCity } from './quiz.ts';
import { matchAll } from './eligibility-matcher.ts';
import { eligibilitySchema } from './eligibility-types.ts';
import { todayDate } from './calendar.ts';
import scholarshipsJson from '../data/scholarships.json';
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
  it('names only boards whose code is checked, and only cities with a hub and a page', () => {
    expect(Object.keys(BOARDS)).toContain('MHCBE');
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
    expect(built.map(b => b.combo.slug)).toEqual(['board-mhcbe']);
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
    expect(names([catholic(), catholic(), waiting])).toEqual(['board-mhcbe']);
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

  it('generates a combo per high school with its own list', () => {
    const jp = (over: Partial<ComboTarget> = {}) => award({ ...over, eligibility: { specificSchools: ['Jasper Place High School'] } });
    const built = combosForCity('medicine-hat', [jp(), jp(), jp()], TODAY);
    expect(built.map(b => [b.combo.slug, b.combo.who])).toEqual([['school-jasper-place-high-school', 'you go to Jasper Place High School']]);
  });

  it('puts an award with a second gate in the sides of a college combo', () => {
    const boardOnly = college({ eligibility: { schoolBoards: ['MHCBE'] } });
    const men = college({ audience: 'Male students entering Medicine Hat College' });
    const built = combosForCity('medicine-hat', [college(), college(), boardOnly, men], TODAY)
      .find(b => b.combo.slug === 'medicine-hat-college')!;
    expect(built.core).toHaveLength(2);
    expect(built.addOns.map(s => s.id).sort()).toEqual([boardOnly.id, men.id].sort());
  });

  it('puts an award not open to Grade 12 in the sides', () => {
    const grade10 = award({ eligibility: { schoolBoards: ['MHCBE'], grades: ['10'] } });
    const built = combosForCity('medicine-hat', [catholic(), catholic(), grade10], TODAY)[0]!;
    expect(built.addOns.map(s => s.id)).toEqual([grade10.id]);
  });

  it('puts children-of and team awards in the sides', () => {
    const kids = catholic({ audience: 'Grade 12 children of Catholic teachers' });
    const team = catholic({ audience: 'Students on a Huskies team' });
    const built = combosForCity('medicine-hat', [catholic(), catholic(), kids, team], TODAY)[0]!;
    expect(built.addOns.map(s => s.id).sort()).toEqual([kids.id, team.id].sort());
  });

  it('gives an unchecked board code no combo', () => {
    const odd = () => award({ eligibility: { schoolBoards: ['ZZSD'] } });
    expect(names([odd(), odd(), odd()])).toEqual([]);
  });

  it('drops a generated combo that repeats a hand-written one', () => {
    expect(names([college(), college(), college()])).toEqual(['medicine-hat-college']);
  });

  it('builds a page only for a city with a combo', () => {
    expect(comboCities([award()], TODAY)).toEqual([]);
    expect(comboCities([catholic(), catholic(), catholic()], TODAY).map(c => c.city)).toEqual(['medicine-hat']);
  });
});

describe('oneForm', () => {
  it('names the form only when every core award goes through it', () => {
    const em = { url: 'https://www.educationmatters.ca/award/1' };
    expect(oneForm([em, em])).toBe('One EducationMatters application covers these');
    expect(oneForm([em, { url: 'https://calgaryfoundation.org/x' }])).toBeNull();
    expect(oneForm([{ url: 'https://sites.google.com/other/x' }])).toBeNull();
    expect(oneForm([])).toBeNull();
  });
});

// The real catalogue, because the failure this guards is drift between two
// rule sets that each pass their own fixtures: combos.ts deciding who a combo
// is for, and the matcher deciding what a student sees on /match.
describe('combos on /match, against the published catalogue', () => {
  const today = todayDate();
  const items = (scholarshipsJson as unknown as ComboTarget[]).map(s => ({
    ...s, eligibility: s.eligibility ? eligibilitySchema.parse(s.eligibility) : null,
  })) as unknown as (ComboTarget & Parameters<typeof matchAll>[1][number])[];
  const index = comboIndex(items, today);
  const open = items.filter(s => !(s as { concluded?: boolean }).concluded && (!s.deadline || new Date(s.deadline + 'T00:00:00') >= today));

  it('names only quiz answers a student can actually give', () => {
    const cities = new Set(QUIZ_QUESTIONS.find(q => q.key === 'city')!.opts.map(o => o.value));
    const institutions = new Set(QUIZ_QUESTIONS.find(q => q.key === 'institution')!.opts.map(o => o.value));
    for (const e of index) {
      expect(cities.has(e.quizCity), e.slug).toBe(true);
      if ('board' in e.on) expect(boardsForCity(items, e.quizCity), e.slug).toContain(e.on.board);
      if ('school' in e.on) expect(schoolsForCity(items, e.quizCity), e.slug).toContain(e.on.school);
      if ('institution' in e.on && !institutions.has(e.on.institution)) continue;
    }
  });

  it('returns at least two of every combo\'s core awards to a Grade 12 student who gives its answer', () => {
    for (const e of index) {
      const on = e.on as { board?: string; school?: string; institution?: string };
      const got = new Set(matchAll({
        grade: '12', city: e.quizCity, schoolBoard: on.board ?? null, specificSchool: on.school ?? null,
        targetInstitution: on.institution ?? null, fields: [], averagePercent: null, averageTop: null, town: null,
        identifiesAsFemale: null, identifiesAsIndigenous: null, identifiesAsBIPOC: null, hasFinancialNeed: null,
        familyIncome: null, inFosterCare: null, inApprenticeship: null, extracurriculars: [], citizenship: null,
      }, open).map(m => m.id));
      expect(e.core.filter(id => got.has(id)).length, `${e.page}#${e.slug}`).toBeGreaterThanOrEqual(MIN_COMBO_CORE);
    }
  });
});
