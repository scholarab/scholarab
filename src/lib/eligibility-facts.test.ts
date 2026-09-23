import { describe, it, expect } from 'vitest';
import { eligibilityFacts } from './eligibility-facts';

describe('eligibilityFacts', () => {
  it('says nothing for a plain Grade 12 award', () => {
    expect(eligibilityFacts({ grades: ['12'], minAverage: null, financialNeed: false })).toEqual([]);
    expect(eligibilityFacts(null)).toEqual([]);
  });
  it('names a grade only when it is not just Grade 12', () => {
    expect(eligibilityFacts({ grades: ['10', '11', '12'] })).toEqual(['Grades 10 to 12']);
    expect(eligibilityFacts({ grades: ['11'] })).toEqual(['Grade 11']);
    expect(eligibilityFacts({ grades: ['12', 'post-secondary'] })).toEqual(['Grade 12 or post-secondary']);
    expect(eligibilityFacts({ grades: ['post-secondary'] })).toEqual(['Post-secondary students']);
  });
  it('lists the average and need after the grade', () => {
    expect(eligibilityFacts({ grades: ['12'], minAverage: 80, financialNeed: true })).toEqual(['80% average', 'Financial need']);
  });
});
