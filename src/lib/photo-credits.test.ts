import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROGRAM_FORMATS, SCHOLARSHIP_FACETS } from './facets';
import { PHOTO_CREDITS, needsCredit } from './photo-credits';

const DIR = join(__dirname, '../../public/photos/backdrops');
const FILES = ['wide-1672', 'wide-3344', 'tall-1000', 'tall-2000', 'tile'];
const named = (fs: { backdrop?: string }[]) => fs.map(f => f.backdrop).filter((b): b is string => !!b);
const scopes = named(SCHOLARSHIP_FACETS);
// The program formats show their photo only as a Programs menu tile.
const formats = named(PROGRAM_FORMATS);
const backdrops = [...scopes, ...formats];

describe('scope photos', () => {
  it('ships all five files for every scope and the tile for every format', () => {
    const wanted = [...scopes.flatMap(b => FILES.map(f => `${b}-${f}.webp`)), ...formats.map(b => `${b}-tile.webp`)];
    expect(wanted.filter(f => !existsSync(join(DIR, f)))).toEqual([]);
  });

  // A CC BY or CC BY-SA photo used without its credit breaks its license.
  it('credits every backdrop, and only backdrops that exist', () => {
    expect(backdrops.filter(b => !PHOTO_CREDITS[b])).toEqual([]);
    expect(Object.keys(PHOTO_CREDITS).filter(k => !backdrops.includes(k))).toEqual([]);
  });

  it('links the license of every photo that needs a credit', () => {
    const bad = Object.entries(PHOTO_CREDITS).filter(([, c]) => needsCredit(c) && (!c.licenseUrl || !c.author));
    expect(bad.map(([k]) => k)).toEqual([]);
  });
});
