// The words a first-time applicant meets on the site without being told what
// they mean, each defined once. The home program slides, the format hubs, the
// directories' "What these mean" note and the quiz all read this, so a word is
// never defined two ways (critique 2026-09-23: "bursary", "olympiad" and
// "dual credit" were used on home, the hubs and the quiz and explained nowhere).
//
// `line` is the full sentence for a note or a hub; `short` fits over a photo.

import { STATUS_WORDS } from './status';

export interface GlossaryEntry {
  term: string;
  line: string;
  short: string;
}

export const GLOSSARY = {
  bursary: {
    term: 'Bursary',
    line: 'An award given mainly on financial need rather than marks. You usually show your family’s income, not your grades.',
    short: 'Money given on financial need',
  },
  designated: {
    term: 'Designated trade',
    line: 'A trade Alberta certifies through an apprenticeship, like electrician, welder or carpenter.',
    short: 'A trade learned by apprenticeship',
  },
  unconfirmed: {
    term: STATUS_WORDS.unconfirmed,
    line: 'The sponsor has not posted this year’s date. “Around” means last year’s date, so check before you plan on it.',
    short: 'This year’s date is not posted yet',
  },
  olympiad: {
    term: 'Olympiad',
    line: 'A timed exam in math, science or computing. The first round is written at your own school, and a teacher registers you.',
    short: 'Timed math and science exams, written at your school',
  },
  dualCredit: {
    term: 'Dual credit',
    line: 'A course that counts for high school credit and for college credit or trade hours at the same time, arranged through your school.',
    short: 'One course, high school and college credit at once',
  },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;

/** The hub whose name is itself a jargon word, and the word. */
export const FORMAT_TERMS: Readonly<Record<string, GlossaryKey>> = {
  olympiads: 'olympiad',
  'dual-credit': 'dualCredit',
};

/** The words each directory prints on its rows, for its "What these mean" note. */
export const DIRECTORY_TERMS: Readonly<Record<'scholarship' | 'program', readonly GlossaryKey[]>> = {
  scholarship: ['bursary', 'designated'],
  program: ['olympiad', 'dualCredit'],
};
