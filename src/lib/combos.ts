// Scholarship combos: /scholarships/medicine-hat/combos/.
//
// A combo is a set of awards in one city that are open to the same students,
// so a reader who matches its one-line rule can apply to every award in it
// (Ilia, 2026-09-30: "pre-built combos, like fast food"). The city alone is
// not the rule: a Medicine Hat High student cannot apply to the Catholic
// board's awards, so one "Medicine Hat combo" would break its own promise.
// Each combo adds the one fact that decides eligibility: the school board, the
// town, or where the student is going next.
//
// The rules are written by hand; the members never are. Membership is
// computed from the published JSON on every build, so an award that closes
// or is retired leaves its combo without anyone editing this file, and a
// combo that falls below the floor stops being built.
//
// What a combo does NOT claim: that the reader will win, or that every
// condition is met. Averages, essays and need still apply per award, which is
// why the page says "open to" and each row keeps its own audience line.
import { facetItems, SCHOLARSHIP_FACETS, type FacetTarget } from './facets.ts';
import { scholarshipStatusOf, type StatusInput } from './status.ts';

export interface ComboTarget extends FacetTarget, StatusInput {
  id: number;
  title: string;
  audience?: string | null;
  applyViaGuidance?: boolean;
  eligibility?: {
    grades?: string[];
    schoolBoards?: string[];
    specificSchools?: string[];
    targetInstitutions?: string[];
    fields?: string[];
  } | null;
}

export interface Combo {
  /** The section anchor on the city's combo page. */
  slug: string;
  /** Facet slug of the city this combo belongs to. */
  city: string;
  name: string;
  /** Completes "For you if ...". One clause, no full stop. */
  who: string;
  includes: (s: ComboTarget) => boolean;
  /**
   * Members with a condition narrower than the combo's own rule: a nursing
   * bursary inside the college combo. They are listed apart as add-ons, so the
   * core list stays one everyone matching `who` can apply to. Defaults to any
   * award restricted to a field of study.
   */
  addOn?: (s: ComboTarget) => boolean;
}

export interface CityCombos {
  city: string;
  h1: string;
  /** Page <title>, brand suffix appended by the page. */
  title: string;
  /** Meta description, 130-155 characters. */
  description: string;
  intro: string;
}

/** A combo needs two awards everyone in it can apply to, and three in all. */
export const MIN_COMBO_CORE = 2;
export const MIN_COMBO_ITEMS = 3;

const has = (list: string[] | undefined, value: string) => list?.includes(value) ?? false;
const fieldGated = (s: ComboTarget) => (s.eligibility?.fields?.length ?? 0) > 0;

export const CITY_COMBOS: CityCombos[] = [
  {
    city: 'medicine-hat',
    h1: 'Medicine Hat scholarship combos',
    title: 'Medicine Hat Scholarship Combos',
    description:
      'Medicine Hat scholarships grouped by who can apply: Catholic school graduates, Redcliff students and Medicine Hat College entrants. Apply to the whole set.',
    intro:
      'Each combo is a set of local awards open to the same students, so if its first line describes you, you can apply to every award in it. The conditions on each award still apply.',
  },
];

export const COMBOS: Combo[] = [
  {
    slug: 'catholic-school-graduates',
    city: 'medicine-hat',
    name: 'Catholic school graduates',
    who: 'you are graduating from a Medicine Hat Catholic school',
    // Board-wide only: an award for one school (Chuck Love is Monsignor
    // McCoy's) is not open to every Catholic graduate.
    includes: s => has(s.eligibility?.schoolBoards, 'MHCBE') && !s.eligibility?.specificSchools?.length,
  },
  {
    slug: 'redcliff',
    city: 'medicine-hat',
    name: 'Redcliff students',
    who: 'you have lived in Redcliff for most of your school years',
    // The residency rule lives only in the audience line; eligibility has no
    // town field.
    includes: s => /\bRedcliff\b/.test(s.audience ?? ''),
  },
  {
    slug: 'medicine-hat-college',
    city: 'medicine-hat',
    name: 'Staying for Medicine Hat College',
    who: 'you are starting at Medicine Hat College after Grade 12',
    includes: s => has(s.eligibility?.targetInstitutions, 'Medicine Hat College'),
    addOn: s => fieldGated(s) || /special needs/i.test(s.audience ?? ''),
  },
  {
    slug: 'cypress-county',
    city: 'medicine-hat',
    name: 'Cypress County residents',
    who: 'you live in Cypress County',
    includes: s => /\bCypress County\b/.test(s.audience ?? ''),
  },
];

export interface BuiltCombo<T> {
  combo: Combo;
  core: T[];
  addOns: T[];
}

function forHighSchool(s: ComboTarget): boolean {
  const grades = s.eligibility?.grades ?? [];
  return grades.length === 0 || grades.some(g => g !== 'post-secondary');
}

/**
 * The combos a city's page shows, in COMBOS order, each with its members.
 * Closed awards and awards only for students already past high school are
 * left out; a combo under the floor is dropped rather than shown thin.
 */
export function combosForCity<T extends ComboTarget>(city: string, items: T[], today: Date): BuiltCombo<T>[] {
  const facet = SCHOLARSHIP_FACETS.find(f => f.slug === city);
  if (!facet) return [];
  const pool = facetItems(facet, items).filter(s => forHighSchool(s) && scholarshipStatusOf(s, today) !== 'closed');
  return COMBOS
    .filter(c => c.city === city)
    .map(combo => {
      const members = pool.filter(combo.includes);
      const isAddOn = combo.addOn ?? fieldGated;
      return { combo, core: members.filter(s => !isAddOn(s)), addOns: members.filter(isAddOn) };
    })
    .filter(b => b.core.length >= MIN_COMBO_CORE && b.core.length + b.addOns.length >= MIN_COMBO_ITEMS);
}

/** Cities with at least one combo, which are the combo pages the build emits. */
export function comboCities<T extends ComboTarget>(items: T[], today: Date): CityCombos[] {
  return CITY_COMBOS.filter(c => combosForCity(c.city, items, today).length > 0);
}
