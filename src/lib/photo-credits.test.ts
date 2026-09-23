import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCHOLARSHIP_FACETS } from './facets';
import { PHOTO_CREDITS, needsCredit } from './photo-credits';

const DIR = join(__dirname, '../../public/photos/backdrops');
const FILES = ['wide-1672', 'wide-3344', 'tall-1000', 'tall-2000', 'tile'];
const backdrops = SCHOLARSHIP_FACETS.map(f => f.backdrop).filter((b): b is string => !!b);

describe('scope photos', () => {
  it('ships all five files for every backdrop', () => {
    const missing = backdrops.flatMap(b => FILES.map(f => `${b}-${f}.webp`)).filter(f => !existsSync(join(DIR, f)));
    expect(missing).toEqual([]);
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
