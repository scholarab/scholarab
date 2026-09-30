import { describe, expect, it } from 'vitest';
import { SCHOLARSHIP_FACETS } from './facets';
import { scopeHubForQuery, scopeSearchMap } from './scope-search';

const map = scopeSearchMap(SCHOLARSHIP_FACETS);

describe('scopeHubForQuery', () => {
  it('sends a city, a broad scope or its alias to the hub', () => {
    expect(scopeHubForQuery('Calgary', map)).toBe('/scholarships/calgary/');
    expect(scopeHubForQuery('  red deer ', map)).toBe('/scholarships/red-deer/');
    expect(scopeHubForQuery('St Albert', map)).toBe('/scholarships/st-albert/');
    expect(scopeHubForQuery('Alberta', map)).toBe('/scholarships/alberta/');
    expect(scopeHubForQuery('province-wide', map)).toBe('/scholarships/alberta/');
    expect(scopeHubForQuery('National', map)).toBe('/scholarships/national/');
    expect(scopeHubForQuery('canada', map)).toBe('/scholarships/national/');
  });

  it('reads through filler words and known misspellings', () => {
    expect(scopeHubForQuery('scholarships in Lethbridge', map)).toBe('/scholarships/lethbridge/');
    expect(scopeHubForQuery('calgery scholarships', map)).toBe('/scholarships/calgary/');
  });

  it('leaves ordinary searches and categories to the directory', () => {
    expect(scopeHubForQuery('nursing', map)).toBeNull();
    expect(scopeHubForQuery('calgary nursing', map)).toBeNull();
    expect(scopeHubForQuery('stem', map)).toBeNull();
    expect(scopeHubForQuery('scholarships', map)).toBeNull();
    expect(scopeHubForQuery('', map)).toBeNull();
  });
});
