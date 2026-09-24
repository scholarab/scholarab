import { describe, it, expect } from 'vitest';
import { DIRECTORY_TERMS, FORMAT_TERMS, GLOSSARY } from './glossary';
import { PROGRAM_FORMATS } from './facets';
import { STATUS_WORDS } from './status';

describe('glossary', () => {
  it('names only format hubs that exist', () => {
    const slugs = new Set(PROGRAM_FORMATS.map(f => f.slug));
    for (const slug of Object.keys(FORMAT_TERMS)) expect(slugs.has(slug)).toBe(true);
  });

  it('defines "Date not confirmed" in the status words the rows print', () => {
    expect(GLOSSARY.unconfirmed.term).toBe(STATUS_WORDS.unconfirmed);
  });

  it('keeps every short form short enough to sit over a photo', () => {
    for (const e of Object.values(GLOSSARY)) {
      expect(e.short.length).toBeLessThanOrEqual(56);
      expect(e.line).toMatch(/\.$/);
    }
  });

  it('gives each directory note at least one word to define', () => {
    expect(DIRECTORY_TERMS.scholarship).toContain('bursary');
    expect(DIRECTORY_TERMS.program).toEqual(expect.arrayContaining(['olympiad', 'dualCredit']));
  });
});
