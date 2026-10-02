#!/usr/bin/env node
/**
 * Generates per-listing OG images (1200x630 PNG) for indexable scholarships
 * into public/og/scholarships/<slug>.png. Runs before astro build via npm run
 * build. Only closed listings (past deadline, no next open date) fall back to
 * the site-wide og-image.png, mirroring the sitemap's rule; [slug].astro
 * applies the same condition when choosing the og:image URL.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { placeOf } from '../src/lib/school-awards.ts';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { encodeCardPng } from './opaque-png';
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
  deadlineEstimated?: boolean;
}

const scholarships: Scholarship[] = JSON.parse(
  readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8')
);

const font = (name: string) => readFileSync(join(__dirname, 'og-fonts', name));
const fonts = [
  { name: 'Big Shoulders', data: font('big-shoulders-800.ttf'), weight: 800 as const, style: 'normal' as const },
  { name: 'Big Shoulders Label', data: font('big-shoulders-700.ttf'), weight: 700 as const, style: 'normal' as const },
  { name: 'Public Sans', data: font('public-sans-700.ttf'), weight: 700 as const, style: 'normal' as const },
];

function fmtDeadline(d: string | null | undefined, estimated = false): string {
  if (!d || d === 'TBA') return 'DEADLINE TBA';
  // A share card outlives the page it points at; never print a guessed date on it.
  if (estimated) return 'DATE NOT CONFIRMED';
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
  const titleSize = s.title.length > 60 ? 62 : s.title.length > 40 ? 74 : 88;
  return el('div', {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between', backgroundColor: '#0B1512',
    padding: '64px 72px', color: '#EEF1EC',
  }, [
    el('div', { display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'Big Shoulders Label', fontWeight: 700, fontSize: 22, letterSpacing: 2, color: '#2FD3A0' }, [
      el('div', { width: 14, height: 14, borderRadius: 999, backgroundColor: '#2FD3A0' }),
      el('div', {}, `SCHOLARSHIP · ${(placeOf(s) || 'ALBERTA').toUpperCase()}`),
    ]),
    el('div', { display: 'flex', flexDirection: 'column', gap: 28 }, [
      el('div', { fontFamily: 'Big Shoulders', fontWeight: 800, fontSize: titleSize, lineHeight: 1.05, letterSpacing: -1 }, s.title),
      el('div', { display: 'flex', alignItems: 'baseline', gap: 24 }, [
        el('div', { fontFamily: 'Big Shoulders', fontWeight: 800, fontSize: 68, color: '#2FD3A0' }, s.amount),
        el('div', { fontFamily: 'Big Shoulders Label', fontWeight: 700, fontSize: 22, letterSpacing: 1.5, color: 'rgba(238,241,236,0.6)' }, fmtDeadline(s.deadline, s.deadlineEstimated)),
      ]),
    ]),
    el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(238,241,236,0.2)', paddingTop: 28 }, [
      el('div', { display: 'flex', fontFamily: 'Public Sans', fontSize: 30, fontWeight: 700 }, [
        el('span', {}, 'Scholar'),
        el('span', { color: '#2FD3A0' }, 'AB'),
      ]),
      el('div', { fontFamily: 'Big Shoulders Label', fontWeight: 700, fontSize: 20, letterSpacing: 1.5, color: 'rgba(238,241,236,0.6)' }, 'FIND YOUR SCHOLARSHIP · SCHOLARAB.CA'),
    ]),
  ]);
}

const outDir = join(__dirname, '../public/og/scholarships');
mkdirSync(outDir, { recursive: true });

const open = scholarships.filter(
  s => scholarshipStatusOf(s, getToday()) !== 'closed'
);
const cacheDir=join(__dirname,'../.cache');mkdirSync(cacheDir,{recursive:true});
const cachePath=join(cacheDir,'og-images.json');
let previous:Record<string,string>={};
try {previous=JSON.parse(readFileSync(cachePath,'utf8'));} catch { /* cold build */ }
const hash=(input:string|Buffer)=>createHash('sha256').update(input).digest('hex');
const renderer=hash(readFileSync(join(__dirname,'../package-lock.json')))+hash(readFileSync(join(__dirname,'opaque-png.ts')))+fonts.map(f=>hash(f.data)).join('');
const cards=open.map(s=>{const tree=card(s);const file=`${generateSlug(s.title)}.png`;return {file,tree,digest:hash(renderer+JSON.stringify(tree))};});

async function render(batch:typeof cards){
  const [{ default: satori }, { Resvg }] = await Promise.all([import('satori'), import('@resvg/resvg-js')]);
  for (const {file,tree} of batch) {
    const svg = await satori(tree as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts });
    // satori has already turned every glyph into a path, so resvg needs no fonts.
    // Its default scans all system fonts for each image: 119 ms of a 148 ms card
    // here, and slow enough on Workers Builds that a cold build timed out at 30 min.
    const png = encodeCardPng(new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: false } }).render());
    writeFileSync(join(outDir,file),png);
  }
}

// A batch child renders only the files it was handed, then exits.
if (process.env.OG_BATCH) {
  const wanted=new Set(JSON.parse(process.env.OG_BATCH) as string[]);
  await render(cards.filter(c=>wanted.has(c.file)));
  process.exit(0);
}

// The renderer holds 1 to 2 GB of native memory that garbage collection does
// not return, and on Workers Builds the run froze near the 1,000th card until
// the 30 minute limit. So cards render in child processes of BATCH cards, whose
// memory is released when each exits, and each batch gets a time limit: an OG
// image is a social preview, and a stalled render must not stop the site from
// deploying. A skipped card keeps no cache entry, so the next build retries it.
// A batch takes about 6 s on Workers Builds; the step as a whole stops starting
// batches after 8 minutes, well inside the build's time limit.
const BATCH=100, BATCH_LIMIT_MS=90_000, DEADLINE=Date.now()+8*60_000;
const todo=cards.filter(c=>!(previous[c.file]===c.digest && existsSync(join(outDir,c.file))));
const next:Record<string,string>={};
for (const c of cards) next[c.file]=c.digest;
let written=0;
for (let i=0;i<todo.length;i+=BATCH) {
  const batch=todo.slice(i,i+BATCH);
  if (Date.now()>DEADLINE) {
    console.warn(`OG images: out of time; ${todo.length-i} cards skipped, retried next build`);
    for (const c of todo.slice(i)) delete next[c.file];
    break;
  }
  const run=spawnSync(process.execPath,[...process.execArgv,fileURLToPath(import.meta.url)],{
    env:{...process.env,OG_BATCH:JSON.stringify(batch.map(c=>c.file))},stdio:'inherit',timeout:BATCH_LIMIT_MS,
  });
  if (run.status===0) { written+=batch.length; console.warn(`OG images: ${written} of ${todo.length} rendered`); continue; }
  console.warn(`OG images: batch ${i/BATCH+1} failed (${run.error?.message ?? `exit ${run.status ?? run.signal}`}); ${batch.length} cards skipped, retried next build`);
  for (const c of batch) { delete next[c.file]; if (existsSync(join(outDir,c.file)) && previous[c.file]!==c.digest) unlinkSync(join(outDir,c.file)); }
}
for (const file of readdirSync(outDir)) {
  if (file.endsWith('.png') && !(file in next)) unlinkSync(join(outDir, file));
}
writeFileSync(cachePath,JSON.stringify(next));
console.log(`Wrote ${written} OG images; reused ${cards.length-todo.length} unchanged images`);
