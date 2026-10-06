import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { ONE_FORMS, ONE_FORM_KEYS, oneFormBlock, type OneFormKey } from './one-form.ts';
import { saysNoApplication } from './apply-method.ts';

const scholarships = JSON.parse(readFileSync('src/data/scholarships.json', 'utf8')) as {
  id: number; notes?: string | null; oneForm?: OneFormKey | null; concluded?: boolean;
}[];

describe('one-form', () => {
  it('never reads as "nothing to file"', () => {
    // Every one of these is a form the student fills in. If the shared text
    // tripped the no-application test, a page could swap Apply for "How it is
    // awarded" (an LPSD draft said "You do not apply to the sponsors").
    for (const key of ONE_FORM_KEYS) expect(saysNoApplication(ONE_FORMS[key].text), key).toBe(false);
  });

  it('is said once, not again in each listing', () => {
    const repeats = scholarships.filter(s => s.oneForm && s.notes && s.notes.includes(ONE_FORMS[s.oneForm].text.slice(0, 40)));
    expect(repeats.map(s => s.id)).toEqual([]);
  });

  it('counts the open listings that name the form', () => {
    const all = [{ oneForm: 'rdp' as const }, { oneForm: 'rdp' as const, concluded: true }, { oneForm: 'naf' as const }, {}];
    expect(oneFormBlock('rdp', all)).toEqual({
      heading: 'How the Red Deer Polytechnic General Application works',
      text: ONE_FORMS.rdp.text,
      count: 1,
    });
    expect(oneFormBlock(null, all)).toBeNull();
  });

  it('has no listing carrying the old pasted paragraph', () => {
    const pasted = /Every EducationMatters award has three rules|One form covers every LPSD award|single ECCHS Awards Application|One universal application covers every fund/;
    expect(scholarships.filter(s => pasted.test(s.notes ?? '')).map(s => s.id)).toEqual([]);
  });
});
