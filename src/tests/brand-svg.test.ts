// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

// iOS Safari paints an SVG <mask>, <filter> or <clipPath> into a bitmap at the
// size it was laid out at and never repaints it on pinch zoom, so the AB plate
// went blurry on phones while Scholar stayed sharp (2026-10-12). Cut-outs are
// drawn as one evenodd path instead.
describe('brand SVGs', () => {
  const files = readdirSync('public/brand').filter(f => f.endsWith('.svg'));

  it.each(files)('%s uses plain paths only', file => {
    const svg = readFileSync(`public/brand/${file}`, 'utf8');
    expect(svg).not.toMatch(/<(mask|filter|clipPath|image)\b/);
  });
});
