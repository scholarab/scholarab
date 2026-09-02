import { beforeEach, describe, expect, it } from 'vitest';
import {
  LIST_CONTEXT_KEY, placeInList, readListContext, writeListContext,
} from './list-context.ts';

const ctx = (paths: string[], filtered = false) => ({ paths, filtered });

describe('placeInList', () => {
  const three = ctx(['/scholarships/a/', '/scholarships/b/', '/scholarships/c/']);

  it('finds the listing and walks its neighbours', () => {
    const p = placeInList(three, '/scholarships/b/')!;
    expect([p.index, p.total, p.prev, p.next])
      .toEqual([1, 3, '/scholarships/a/', '/scholarships/c/']);
  });

  it('wraps at both ends', () => {
    expect(placeInList(three, '/scholarships/a/')!.prev).toBe('/scholarships/c/');
    expect(placeInList(three, '/scholarships/c/')!.next).toBe('/scholarships/a/');
  });

  it('returns null for a listing that is not in the list', () => {
    // Arrived from a search result, a guide, /saved or a shared link. There is
    // no list to be third of, so the switcher must not render at all.
    expect(placeInList(three, '/scholarships/zzz/')).toBeNull();
  });

  it('returns null with no remembered list', () => {
    expect(placeInList(null, '/scholarships/a/')).toBeNull();
  });

  it('does not care whether the path carries a trailing slash', () => {
    // location.pathname and the card hrefs have disagreed about this before.
    expect(placeInList(three, '/scholarships/b')!.index).toBe(1);
    expect(placeInList(ctx(['/scholarships/b']), '/scholarships/b/')!.index).toBe(0);
  });

  it('says so when the order came from a filter', () => {
    expect(placeInList(three, '/scholarships/b/')!.label).toBe('2 OF 3');
    expect(placeInList(ctx(three.paths, true), '/scholarships/b/')!.label)
      .toBe('FILTERED · 2 OF 3');
  });

  it('handles a single-item list without pointing anywhere else', () => {
    const p = placeInList(ctx(['/scholarships/a/']), '/scholarships/a/')!;
    expect([p.prev, p.next, p.label]).toEqual(['/scholarships/a/', '/scholarships/a/', '1 OF 1']);
  });
});

describe('the stored context', () => {
  beforeEach(() => sessionStorage.clear());

  it('round-trips', () => {
    writeListContext(ctx(['/programs/x/'], true));
    expect(readListContext()).toEqual({ paths: ['/programs/x/'], filtered: true });
  });

  it('reads nothing when nothing was stored', () => {
    expect(readListContext()).toBeNull();
  });

  it('survives a corrupted or empty entry', () => {
    // A half-written value, or one from an older shape, must not throw on a
    // page whose only job is to render a listing.
    sessionStorage.setItem(LIST_CONTEXT_KEY, '{not json');
    expect(readListContext()).toBeNull();
    sessionStorage.setItem(LIST_CONTEXT_KEY, JSON.stringify({ paths: [] }));
    expect(readListContext()).toBeNull();
    sessionStorage.setItem(LIST_CONTEXT_KEY, JSON.stringify({ nope: 1 }));
    expect(readListContext()).toBeNull();
  });
});
