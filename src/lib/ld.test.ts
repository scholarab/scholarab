import { describe, it, expect } from 'vitest';
import { itemListJson, ITEM_LIST_CAP } from './ld.ts';

const items = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ name: `Award ${i + 1}`, url: `https://x/a${i + 1}/` }));

describe('itemListJson', () => {
  it('numbers positions from 1, contiguously, in the order given', () => {
    const json = itemListJson(items(5), 'List', 'https://x/');
    expect(json.itemListElement.map(e => e.position)).toEqual([1, 2, 3, 4, 5]);
    expect(json.itemListElement.map(e => e.name)).toEqual([
      'Award 1', 'Award 2', 'Award 3', 'Award 4', 'Award 5',
    ]);
  });

  it('caps the emitted sample but still reports the true total', () => {
    // The page shows all 153; the markup samples 50. Reporting 50 as
    // numberOfItems would be the markup contradicting the page.
    const json = itemListJson(items(153), 'List', 'https://x/');
    expect(json.numberOfItems).toBe(153);
    expect(json.itemListElement).toHaveLength(ITEM_LIST_CAP);
    expect(json.itemListElement.at(-1)!.position).toBe(ITEM_LIST_CAP);
  });

  it('handles a list shorter than the cap without padding', () => {
    const json = itemListJson(items(3), 'List', 'https://x/');
    expect(json.numberOfItems).toBe(3);
    expect(json.itemListElement).toHaveLength(3);
  });

  it('survives an empty list rather than emitting a broken node', () => {
    const json = itemListJson([], 'List', 'https://x/');
    expect(json.numberOfItems).toBe(0);
    expect(json.itemListElement).toEqual([]);
  });

  it('carries the schema.org type and context Google looks for', () => {
    const json = itemListJson(items(2), 'Alberta Scholarships', 'https://x/');
    expect(json['@context']).toBe('https://schema.org');
    expect(json['@type']).toBe('ItemList');
    expect(json.name).toBe('Alberta Scholarships');
    expect(json.url).toBe('https://x/');
    expect(json.itemListElement[0]!['@type']).toBe('ListItem');
  });
});
