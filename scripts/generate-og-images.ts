#!/usr/bin/env node
/**
 * Generates per-listing OG images (1200x630 PNG) for indexable scholarships
 * into public/og/scholarships/<slug>.png. Runs before astro build via npm run
 * build. Only closed listings (past deadline, no next open date) fall back to
 * the site-wide og-image.png, mirroring the sitemap's rule; [slug].astro
 * applies the same condition when choosing the og:image URL.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { generateSlug, getToday } from '../src/lib/utils.ts';
import { scholarshipStatusOf } from '../src/lib/status.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Scholarship {
  title: string;
  amount: string;
  deadline?: string | null;
  openDate?: string | null;
  region?: string | null;
  active?: boolean;
}

const scholarships: Scholarship[] = JSON.parse(
  readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8')
);

const font = (name: string) => readFileSync(join(__dirname, 'og-fonts', name));
const fonts = [
  { name: 'Instrument Serif', data: font('instrument-serif-400.ttf'), weight: 400 as const, style: 'normal' as const },
  { name: 'Archivo', data: font('archivo-700.ttf'), weight: 700 as const, style: 'normal' as const },
  { name: 'IBM Plex Mono', data: font('plex-mono-500.ttf'), weight: 500 as const, style: 'normal' as const },
];

function fmtDeadline(d: string | null | undefined): string {
  if (!d || d === 'TBA') return 'DEADLINE TBA';
  if (d === 'Ongoing') return 'ONGOING';
  const date = new Date(d + 'T00:00:00');
  return 'DEADLINE ' + date
    .toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    .toUpperCase();
}

// Satori element helper (object tree, no JSX in a .ts script)
const el = (type: string, style: Record<string, unknown>, children?: unknown) =>
  ({ type, props: { style, children } });

function card(s: Scholarship) {
  const titleSize = s.title.length > 60 ? 54 : s.title.length > 40 ? 64 : 76;
  return el('div', {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between', backgroundColor: '#0B1512',
    padding: '64px 72px', color: '#F2F0E9',
  }, [
    el('div', { display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'IBM Plex Mono', fontSize: 22, letterSpacing: 2, color: '#2FD3A0' }, [
      el('div', { width: 14, height: 14, borderRadius: 999, backgroundColor: '#2FD3A0' }),
      el('div', {}, `SCHOLARSHIP · ${(s.region || 'ALBERTA').toUpperCase()}`),
    ]),
    el('div', { display: 'flex', flexDirection: 'column', gap: 28 }, [
      el('div', { fontFamily: 'Instrument Serif', fontSize: titleSize, lineHeight: 1.05, letterSpacing: -1 }, s.title),
      el('div', { display: 'flex', alignItems: 'baseline', gap: 24 }, [
        el('div', { fontFamily: 'Instrument Serif', fontSize: 58, color: '#2FD3A0' }, s.amount),
        el('div', { fontFamily: 'IBM Plex Mono', fontSize: 22, letterSpacing: 1.5, color: 'rgba(242,240,233,0.6)' }, fmtDeadline(s.deadline)),
      ]),
    ]),
    el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(242,240,233,0.2)', paddingTop: 28 }, [
      el('div', { display: 'flex', fontFamily: 'Archivo', fontSize: 30, fontWeight: 700 }, [
        el('span', {}, 'Scholar'),
        el('span', { color: '#2FD3A0' }, 'AB'),
      ]),
      el('div', { fontFamily: 'IBM Plex Mono', fontSize: 20, letterSpacing: 1.5, color: 'rgba(242,240,233,0.6)' }, 'FIND YOUR SCHOLARSHIP · SCHOLARAB.CA'),
    ]),
  ]);
}

const outDir = join(__dirname, '../public/og/scholarships');
mkdirSync(outDir, { recursive: true });

const open = scholarships.filter(
  s => scholarshipStatusOf(s, getToday()) !== 'closed'
);
for (const s of open) {
  const svg = await satori(card(s) as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  writeFileSync(join(outDir, `${generateSlug(s.title)}.png`), png);
}
console.log(`Wrote ${open.length} OG images to ${outDir}`);
