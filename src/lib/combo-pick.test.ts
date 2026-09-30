import { describe, it, expect } from 'vitest';
import { comboHref, pickCombos, type ComboEntry } from './combo-pick';

const entry = (over: Partial<ComboEntry>): ComboEntry => ({
  quizCity: 'Medicine Hat', page: 'medicine-hat', slug: 'board-mhcbe', name: 'Medicine Hat Catholic schools',
  who: 'you are graduating from a Medicine Hat Catholic school', on: { board: 'MHCBE' }, core: [1, 2, 3], ...over,
});
const results = (...ids: number[]) => new Set(ids);

describe('pickCombos', () => {
  it('needs the same city and the answer that decides the combo', () => {
    const index = [entry({})];
    expect(pickCombos(index, { city: 'Medicine Hat', board: 'MHCBE' }, results(1, 2, 3))).toHaveLength(1);
    expect(pickCombos(index, { city: 'Calgary', board: 'MHCBE' }, results(1, 2, 3))).toEqual([]);
    expect(pickCombos(index, { city: 'Medicine Hat', board: '' }, results(1, 2, 3))).toEqual([]);
    expect(pickCombos(index, { city: 'Medicine Hat' }, results(1, 2, 3))).toEqual([]);
  });

  it('matches a school, a college, or the whole city', () => {
    const school = entry({ slug: 'school-x', on: { school: 'X High' } });
    const college = entry({ slug: 'going-to-y', on: { institution: 'Y College' } });
    const city = entry({ slug: 'peace', on: { city: true } });
    const picked = (answers: Record<string, string>) => pickCombos([school, college, city], answers, results(1, 2, 3), 5).map(p => p.entry.slug);
    expect(picked({ city: 'Medicine Hat', school: 'X High' })).toEqual(['school-x', 'peace']);
    expect(picked({ city: 'Medicine Hat', institution: 'Y College' })).toEqual(['going-to-y', 'peace']);
  });

  it('counts only core awards in the student\'s own results, and needs two', () => {
    const [picked] = pickCombos([entry({})], { city: 'Medicine Hat', board: 'MHCBE' }, results(2, 3, 99));
    expect(picked!.hits).toEqual([2, 3]);
    // A Grade 10 student matches none of the board's Grade 12 awards.
    expect(pickCombos([entry({})], { city: 'Medicine Hat', board: 'MHCBE' }, results(3))).toEqual([]);
  });

  it('shows the biggest two', () => {
    const index = [
      entry({ slug: 'a', on: { city: true }, core: [1, 2] }),
      entry({ slug: 'b', core: [1, 2, 3, 4] }),
      entry({ slug: 'c', on: { city: true }, core: [1, 2, 3] }),
    ];
    expect(pickCombos(index, { city: 'Medicine Hat', board: 'MHCBE' }, results(1, 2, 3, 4)).map(p => p.entry.slug)).toEqual(['b', 'c']);
  });

  it('links to the combo on its city page', () => {
    expect(comboHref(entry({}))).toBe('/scholarships/medicine-hat/combos/#board-mhcbe');
  });
});
