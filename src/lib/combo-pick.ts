// Which scholarship combo a quiz result belongs to.
//
// Combos are built at build time in combos.ts, which pulls in the facet
// registry; /match only needs this small, client-safe part. The build writes
// each combo's key and core award ids into quiz-payload.json, and the results
// screen picks the ones this student's answers put them in.

import { institutionsOf } from './quiz';

/** A combo needs two awards everyone in it can apply to (combos.ts). */
export const MIN_COMBO_CORE = 2;

/** The quiz answer that puts a student in a combo. */
export type ComboKey =
  | { board: string }
  | { school: string }
  | { institution: string }
  /** Everyone in the city: the Peace Country foundation form. */
  | { city: true };

export interface ComboEntry {
  /** The quiz's city answer ("Medicine Hat", "Other Alberta"). */
  quizCity: string;
  /** Facet slug of the combo page. */
  page: string;
  slug: string;
  name: string;
  who: string;
  on: ComboKey;
  core: number[];
}

export interface PickedCombo {
  entry: ComboEntry;
  /** Core awards that are also in this student's results. */
  hits: number[];
}

/**
 * High schools the listings name only in their audience line. combos.ts builds
 * a combo from each, and the quiz offers each as a school answer so the combo
 * can be reached; picking one filters nothing else, because these awards carry
 * no specificSchools. Empty since 2026-09-30: the single-school removal left
 * none of the eight with a combo, and a school answer that leads nowhere is
 * dead weight in the quiz.
 */
export const AUDIENCE_SCHOOLS: { page: string; quizCity: string; name: string; pattern: RegExp }[] = [];

function keyMatches(on: ComboKey, answers: Record<string, string>): boolean {
  if ('board' in on) return answers.board === on.board;
  if ('school' in on) return answers.school === on.school;
  if ('institution' in on) return institutionsOf(answers.institution).includes(on.institution);
  return true;
}

/**
 * The combos this student is in: same city, the answer that decides it, and
 * at least MIN_COMBO_CORE of its core awards among their own results. The
 * last test does the work the answers cannot: a Grade 10 student in the
 * Catholic board combo matches none of its Grade 12 awards, so is shown none.
 * Biggest first, two at most (a school combo and its board's).
 */
export function pickCombos(
  index: readonly ComboEntry[],
  answers: Record<string, string>,
  resultIds: ReadonlySet<number>,
  max = 2,
): PickedCombo[] {
  return index
    .filter(e => e.quizCity === answers.city && keyMatches(e.on, answers))
    .map(entry => ({ entry, hits: entry.core.filter(id => resultIds.has(id)) }))
    .filter(p => p.hits.length >= MIN_COMBO_CORE)
    .sort((a, b) => b.hits.length - a.hits.length)
    .slice(0, max);
}

export const comboHref = (e: Pick<ComboEntry, 'page' | 'slug'>) => `/scholarships/${e.page}/combos/#${e.slug}`;
