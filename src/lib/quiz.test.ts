import { describe, expect, it } from 'vitest';
import {
  QUIZ_DURATION, QUIZ_PROMISE, QUIZ_QUESTION_COUNT, QUIZ_QUESTION_WORD,
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
    // questions 2..n — otherwise resuming at TEASER_KEYS.length + 1 would skip
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
    // means nothing to the matcher — the student would skip a question without
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
    // Bumping this is a deliberate migration, not a rename — the teaser, the
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

describe('how the quiz describes itself', () => {
  const NUMERALS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

  it('spells the same number it asks', () => {
    // Adding a seventh question without touching the word would leave five
    // pages promising six — the failure this constant exists to prevent.
    expect(QUIZ_QUESTION_WORD).toBe(NUMERALS[QUIZ_QUESTION_COUNT]);
  });

  it('counts the questions it actually has', () => {
    expect(QUIZ_QUESTION_COUNT).toBe(QUIZ_QUESTIONS.length);
  });

  it('builds the promise from the two parts, not a copy of them', () => {
    expect(QUIZ_PROMISE).toContain(QUIZ_QUESTION_WORD);
    expect(QUIZ_PROMISE).toContain(QUIZ_DURATION);
  });
});
