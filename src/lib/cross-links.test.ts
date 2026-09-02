import { describe, it, expect } from 'vitest';
import {
  PROGRAMS_FOR_SCHOLARSHIP,
  SCHOLARSHIPS_FOR_PROGRAM,
  locationMatchesRegion,
  scoreProgramForScholarship,
  scoreScholarshipForProgram,
} from './cross-links.ts';
import scholarshipData from '../data/scholarships.json';
import programData from '../data/research-programs.json';

const scholarships = scholarshipData as { category?: string | null; region?: string | null }[];
const programs = programData as { category?: string | null; location?: string | null; active?: boolean }[];

describe('the affinity table', () => {
  it('only names program categories that exist in the data', () => {
    const real = new Set(programs.map(p => p.category).filter(Boolean));
    for (const cats of Object.values(PROGRAMS_FOR_SCHOLARSHIP)) {
      for (const c of cats) expect(real, `no program has category ${c}`).toContain(c);
    }
  });

  it('only keys on scholarship categories that exist in the data', () => {
    const real = new Set(scholarships.map(s => s.category).filter(Boolean));
    for (const c of Object.keys(PROGRAMS_FOR_SCHOLARSHIP)) {
      expect(real, `no scholarship has category ${c}`).toContain(c);
    }
  });

  it('inverts without losing a pairing', () => {
    for (const [s, ps] of Object.entries(PROGRAMS_FOR_SCHOLARSHIP)) {
      for (const p of ps) expect(SCHOLARSHIPS_FOR_PROGRAM[p]).toContain(s);
    }
  });
});

describe('locationMatchesRegion', () => {
  it('matches a city named in the location prose', () => {
    expect(locationMatchesRegion('Edmonton (in-person)', 'Edmonton')).toBe(true);
    expect(locationMatchesRegion('Edmonton, Camrose', 'Edmonton')).toBe(true);
  });

  it('does not match a different city', () => {
    expect(locationMatchesRegion('Calgary (in-person)', 'Edmonton')).toBe(false);
  });

  it('treats province-wide and national regions as no signal', () => {
    // Nearly every program mentions Alberta, so counting it would score every
    // pair equally and make the tiebreak the only thing doing any work.
    expect(locationMatchesRegion('Alberta-wide (mentor-based)', 'Alberta')).toBe(false);
    expect(locationMatchesRegion('Various Canadian campuses', 'National')).toBe(false);
  });

  it('is safe on missing data', () => {
    expect(locationMatchesRegion(null, 'Edmonton')).toBe(false);
    expect(locationMatchesRegion('Edmonton', null)).toBe(false);
  });
});

describe('scoring', () => {
  it('rates a topical match above a merely local one', () => {
    const topical = scoreProgramForScholarship(
      { category: 'Trades', region: 'Calgary' },
      { category: 'Engineering', location: 'Edmonton' },
    );
    const local = scoreProgramForScholarship(
      { category: 'Trades', region: 'Calgary' },
      { category: 'Health', location: 'Calgary (in-person)' },
    );
    expect(topical).toBeGreaterThan(local);
  });

  it('gives categories with no honest counterpart a zero', () => {
    for (const cat of ['General', 'Sports']) {
      for (const p of programs) {
        expect(scoreProgramForScholarship({ category: cat, region: 'Alberta' }, p)).toBe(0);
      }
    }
  });

  it('scores both directions on the real data without throwing', () => {
    for (const s of scholarships.slice(0, 25)) {
      for (const p of programs.slice(0, 25)) {
        expect(scoreProgramForScholarship(s, p)).toBeGreaterThanOrEqual(0);
        expect(scoreScholarshipForProgram(p, s)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('finds a real topical pairing for most scholarships', () => {
    // Guards the table against drifting out of step with the data: if a
    // category is renamed in either dataset this drops sharply.
    const withMatch = scholarships.filter(s =>
      programs.some(p => p.active !== false && scoreProgramForScholarship(s, p) >= 2),
    );
    expect(withMatch.length / scholarships.length).toBeGreaterThan(0.7);
  });
});
