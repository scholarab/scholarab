import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  QUIZ_DURATION, QUIZ_PROMISE, QUIZ_QUESTION_COUNT, QUIZ_QUESTION_WORD,
  QUIZ_MAX_QUESTION_COUNT, QUIZ_MAX_QUESTION_WORD, QUIZ_OPTIONAL_QUESTION_COUNT, SCHOOL_QUESTION_KEY,
  schoolQuestion, schoolsForCity,
  BOARD_QUESTION_KEY, boardQuestion, boardsForCity, SCHOOL_BOARD_NAMES,
  QUIZ_QUESTIONS, QUIZ_STORAGE_KEY, TEASER_KEYS, teaserOptions,
} from './quiz.ts';

// The home-page teaser writes a partial answer set under the quiz's own
// storage key so /match resumes instead of restarting. That handoff only
// works while the teaser's chips carry values the matcher recognises, so
// these tests pin the contract between the two surfaces.
describe('the home teaser handoff', () => {
  const byKey = (key: string) => QUIZ_QUESTIONS.find(q => q.key === key);

  it('asks about questions that exist in the quiz', () => {
    for (const key of TEASER_KEYS) {
      expect(byKey(key), `no quiz question keyed "${key}"`).toBeDefined();
    }
  });

  it('seeds a contiguous run from the start of the quiz', () => {
    // The teaser also answers searchType (question 1), so its keys have to be
    // questions 2..n; otherwise resuming at TEASER_KEYS.length + 1 would skip
    // an unanswered question and land the student on a later one.
    const covered = ['searchType', ...TEASER_KEYS];
    expect(QUIZ_QUESTIONS.slice(0, covered.length).map(q => q.key)).toEqual(covered);
  });

  it('offers at least one real value per teaser question', () => {
    for (const key of TEASER_KEYS) {
      expect(teaserOptions(key).length, `"${key}" has no chip-able options`).toBeGreaterThan(0);
    }
  });

  it('never offers a chip that would seed a non-answer', () => {
    // An empty value stored as an answer reads as "answered" to the quiz but
    // means nothing to the matcher; the student would skip a question without
    // having answered it.
    for (const key of TEASER_KEYS) {
      for (const o of teaserOptions(key)) expect(o.value).not.toBe('');
    }
  });

  it('keeps teaser chip labels short enough for the card', () => {
    // The teaser card is ~360px; anything past ~14 characters wraps a chip mid
    // word. `short` exists for exactly this, so require it where label is long.
    for (const key of TEASER_KEYS) {
      for (const o of teaserOptions(key)) {
        expect(o.label.length, `"${o.label}" needs a shorter \`short\``).toBeLessThanOrEqual(14);
      }
    }
  });

  it('pins the storage key both surfaces write', () => {
    // Bumping this is a deliberate migration, not a rename; the teaser, the
    // quiz, and any stored answers in the wild all key off this string.
    expect(QUIZ_STORAGE_KEY).toBe('scholarab_quiz_answers_v4');
  });
});

describe('quiz option values', () => {
  it('never repeats a value inside one question', () => {
    for (const q of QUIZ_QUESTIONS) {
      const values = q.opts.map(o => o.value);
      expect(new Set(values).size, `"${q.key}" has duplicate values`).toBe(values.length);
    }
  });
});

describe('quiz hints', () => {
  it('never lets one hint cover most of a question', () => {
    // Four of the six city chips read "AND AREA"; a column that repeats
    // itself for the majority of its options is not telling you which one to
    // pick, which is the only job a hint has. Two options sharing one
    // (both U of C and MRU really are in Calgary) is fine.
    for (const q of QUIZ_QUESTIONS) {
      const counts = new Map<string, number>();
      for (const o of q.opts) counts.set(o.hint, (counts.get(o.hint) ?? 0) + 1);
      for (const [hint, n] of counts) {
        expect(n, `"${hint}" is the hint on ${n} of "${q.key}"'s ${q.opts.length} options`)
          .toBeLessThanOrEqual(q.opts.length / 2);
      }
    }
  });
});

describe('how the quiz describes itself', () => {
  const NUMERALS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

  it('spells the same number it asks', () => {
    // Adding a seventh question without touching the word would leave five
    // pages promising six; the failure this constant exists to prevent.
    expect(QUIZ_QUESTION_WORD).toBe(NUMERALS[QUIZ_QUESTION_COUNT]);
  });

  it('counts the questions it actually has', () => {
    expect(QUIZ_QUESTION_COUNT).toBe(QUIZ_QUESTIONS.length);
  });

  it('builds the promise from the two parts, not a copy of them', () => {
    expect(QUIZ_PROMISE).toContain(QUIZ_QUESTION_WORD);
    expect(QUIZ_PROMISE).toContain(QUIZ_DURATION);
  });

  it('is the only place any page states how long the quiz takes', () => {
    // SabGuide.astro sat on a hardcoded "TWO MINUTES" for months after this
    // file settled on 30 seconds, so all eight guides quoted the number that
    // was rejected for being untrue. A duration in markup is the bug.
    const files = globSync('src/**/*.astro', { cwd: process.cwd() });
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      // Strip <style> and comments: "2 minutes" in prose about something
      // other than the quiz is fine, a duration beside a /match link is not.
      const body = src
        .replace(/<style[\s\S]*?<\/style>/g, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      for (const m of body.matchAll(
        /(TWO|THREE|ONE|\d+)\s+(MINUTES?|SECONDS?)/gi,
      )) {
        if (m[0].toLowerCase() === QUIZ_DURATION.toLowerCase()) continue;
        // Only durations sold as the cost of taking the quiz. /educators'
        // "THREE MINUTES, TOPS" is how long sharing the link takes, and is
        // none of this constant's business.
        const at = m.index ?? 0;
        const near = body.slice(Math.max(0, at - 160), at + 160);
        if (!/\/match\/|quiz/i.test(near)) continue;
        offenders.push(`${file}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ── The optional school question ─────────────────────────────────────────────

describe('school question', () => {
  const listings = [
    { region: 'Calgary', eligibility: { specificSchools: ['Western Canada High School'] } },
    { region: 'Calgary', eligibility: { specificSchools: ['Bowness High School', 'Western Canada High School'] } },
    { region: 'Calgary', eligibility: { specificSchools: [] } },
    { region: 'Edmonton', eligibility: { specificSchools: [] } },
    { region: 'Medicine Hat', eligibility: { specificSchools: ['Medicine Hat High School'] } },
  ];

  it('lists each school once, sorted, for the city asked about', () => {
    expect(schoolsForCity(listings, 'Calgary'))
      .toEqual(['Bowness High School', 'Western Canada High School']);
  });

  it('returns nothing for a city with no school-restricted awards', () => {
    expect(schoolsForCity(listings, 'Edmonton')).toEqual([]);
  });

  it('does not leak another city\'s schools', () => {
    expect(schoolsForCity(listings, 'Medicine Hat')).toEqual(['Medicine Hat High School']);
  });

  it('tolerates a listing with no eligibility block', () => {
    expect(schoolsForCity([{ region: 'Calgary', eligibility: null }], 'Calgary')).toEqual([]);
  });

  // Three school-restricted awards span several communities and are filed
  // under region "Alberta". Keyed on an exact city match they appeared in no
  // dropdown at all, so their filter could never engage and they showed to
  // every student in the province.
  it('offers a province-wide award\'s schools under Other Alberta', () => {
    const wide = [
      ...listings,
      { region: 'Alberta', eligibility: { specificSchools: ['Strathmore High School'] } },
    ];
    expect(schoolsForCity(wide, 'Other Alberta')).toEqual(['Strathmore High School']);
    // and nowhere else, so a city with no school-restricted awards of its own
    // does not gain a question to filter three listings out of 345
    expect(schoolsForCity(wide, 'Medicine Hat')).toEqual(['Medicine Hat High School']);
    expect(schoolsForCity(wide, 'Edmonton')).toEqual([]);
  });

  it('offers an escape hatch last, and it stores an empty value', () => {
    const q = schoolQuestion(['Bowness High School']);
    expect(q.key).toBe(SCHOOL_QUESTION_KEY);
    const last = q.opts[q.opts.length - 1]!;
    expect(last.value).toBe('');
    expect(q.opts).toHaveLength(2);
  });

  it('keeps the spelled maximum in step with the count', () => {
    expect(QUIZ_MAX_QUESTION_COUNT).toBe(QUIZ_QUESTION_COUNT + QUIZ_OPTIONAL_QUESTION_COUNT);
    expect(QUIZ_MAX_QUESTION_WORD).toBe('eight');
  });
})

// ── The optional school-board question ───────────────────────────────────────

describe('school board question', () => {
  const listings = [
    { region: 'Calgary', eligibility: { schoolBoards: ['CBE'] } },
    { region: 'Calgary', eligibility: { schoolBoards: ['CBE', 'CCSD'] } },
    { region: 'Calgary', eligibility: { schoolBoards: [] } },
    { region: 'Edmonton', eligibility: { schoolBoards: ['EPS'] } },
    { region: 'Alberta', eligibility: { schoolBoards: ['GPPSD'] } },
  ];

  it('lists each board once for the city asked about', () => {
    // Sorted by the name shown, not the code, so the list reads alphabetically.
    expect(boardsForCity(listings, 'Calgary')).toEqual(['CBE', 'CCSD']);
  });

  it("does not leak another city's board", () => {
    expect(boardsForCity(listings, 'Edmonton')).not.toContain('CBE');
  });

  it('carries a province-wide board into Other Alberta, not into every city', () => {
    expect(boardsForCity(listings, 'Other Alberta')).toEqual(['GPPSD']);
    expect(boardsForCity(listings, 'Lethbridge')).toEqual([]);
  });

  it('tolerates a listing with no eligibility block', () => {
    expect(boardsForCity([{ region: 'Calgary', eligibility: null }], 'Calgary')).toEqual([]);
  });

  it('offers an escape hatch last, and it stores an empty value', () => {
    const q = boardQuestion(['CBE']);
    expect(q.key).toBe(BOARD_QUESTION_KEY);
    expect(q.opts).toHaveLength(2);
    const last = q.opts[q.opts.length - 1]!;
    expect(last.value).toBe('');
  });

  it('labels a board with the name a student would recognise, not its code', () => {
    expect(boardQuestion(['CBE']).opts[0]!.label).toBe('Calgary Board of Education');
    expect(boardQuestion(['CBE']).opts[0]!.value).toBe('CBE');
  });

  // A code with no name would put initials in front of a student, and a name
  // for a code no listing uses is dead weight in the file.
  it('names every board code the listings actually use', async () => {
    const data = (await import('../data/scholarships.json')).default as Array<{
      eligibility?: { schoolBoards?: string[] } | null
    }>;
    const used = new Set(data.flatMap(s => s.eligibility?.schoolBoards ?? []));
    for (const code of used) expect(SCHOOL_BOARD_NAMES[code], code).toBeDefined();
    for (const code of Object.keys(SCHOOL_BOARD_NAMES)) expect(used.has(code), code).toBe(true);
  });
})
