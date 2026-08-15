#!/usr/bin/env node
/**
 * Builds a ready-to-post social queue from src/data/scholarships.json.
 *
 * For each pick it writes three files into social-out/: a 1080x1350 feed card,
 * a 1080x1920 story card, and a caption .txt with the link already tagged
 * `?s=ig` / `?s=tt` (see recordSourceVisit in src/lib/events.ts, which is what
 * turns that tag into a row).
 *
 * Captions come from a fixed template bank rather than a model. The deadline,
 * the amount and the days-left are the whole point of the post and they are
 * all derivable from the data — there is no upside to a generator that could
 * put a wrong deadline in front of a student, and no way to catch it once the
 * post is up.
 *
 * Rendering is the same satori + resvg pipeline as generate-og-images.ts, at
 * portrait sizes.
 *
 *   npm run social              -- next 5 picks
 *   npm run social -- --count=8 --dry
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { generateSlug, getToday, parseAmount } from '../src/lib/utils.ts';
import { scholarshipStatusOf } from '../src/lib/status.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Scholarship {
  id: number;
  title: string;
  amount: string;
  deadline?: string | null;
  openDate?: string | null;
  region?: string | null;
  category?: string | null;
  active?: boolean;
}

/** One line per posted award, so the queue doesn't serve the same one twice. */
interface LogEntry { id: number; slug: string; generated: string }

// --- options ---------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name: string) => args.some(a => a === `--${name}`);
const opt = (name: string, fallback: number) => {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  const n = hit ? Number(hit.split('=')[1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const COUNT = opt('count', 5);
/** Under three days out, a post is likelier to frustrate than to help. */
const MIN_DAYS = opt('min-days', 3);
/** Past ~six weeks nobody acts on it, they just scroll. */
const MAX_DAYS = opt('max-days', 45);
/** How long before the same award may be posted again. */
const COOLDOWN_DAYS = opt('cooldown', 30);
const DRY = flag('dry');

const SITE = 'https://www.scholarab.ca';
const OUT_DIR = join(__dirname, '../social-out');
// outreach/ is gitignored, which is what we want: the log is a local record of
// what Ilia has actually posted, not a repo artifact.
const LOG_PATH = join(__dirname, '../outreach/social-log.json');

// --- selection -------------------------------------------------------------

const scholarships: Scholarship[] = JSON.parse(
  readFileSync(join(__dirname, '../src/data/scholarships.json'), 'utf8')
);

const today = getToday();
const DAY_MS = 86_400_000;

const daysUntil = (iso: string) =>
  Math.round((new Date(iso + 'T00:00:00').getTime() - today.getTime()) / DAY_MS);

const isRealDate = (d: string | null | undefined): d is string =>
  typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

const log: LogEntry[] = existsSync(LOG_PATH)
  ? (JSON.parse(readFileSync(LOG_PATH, 'utf8')) as LogEntry[])
  : [];

const onCooldown = new Set(
  log
    .filter(e => daysUntil(e.generated) > -COOLDOWN_DAYS)
    .map(e => e.id)
);

const picks = scholarships
  .filter(s => scholarshipStatusOf(s, today) === 'active')
  .filter(s => isRealDate(s.deadline))
  .filter(s => {
    const d = daysUntil(s.deadline as string);
    return d >= MIN_DAYS && d <= MAX_DAYS;
  })
  .filter(s => !onCooldown.has(s.id))
  // Closing soonest first; a tie goes to the bigger award, which is the one
  // more people will stop scrolling for.
  .sort((a, b) =>
    (a.deadline as string).localeCompare(b.deadline as string) ||
    parseAmount(b.amount) - parseAmount(a.amount)
  )
  .slice(0, COUNT);

// --- captions --------------------------------------------------------------

interface Post { s: Scholarship; slug: string; days: number }

const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-CA', {
    month: 'long', day: 'numeric',
  });

/**
 * Openers matching the content pillars in outreach/social-media-plan.md,
 * rotated by position in the log so consecutive weeks don't all open the same
 * way — the deadline post and the money post read very differently.
 *
 * Two banks, because plenty of listings have an amount of "Varies" or
 * "Up to $5,000" and a template that drops it mid-sentence reads like a bug
 * ("Varies and it closes in 16 days").
 */
const AMOUNT_HOOKS: ((p: Post) => string)[] = [
  p => `${p.s.amount} and it closes in ${p.days} days.`,
  p => `Most people in Alberta have never heard of this one. It's ${p.s.amount}.`,
  p => `Free money you're eligible for right now — ${p.s.amount}.`,
];
const DEADLINE_HOOKS: ((p: Post) => string)[] = [
  p => `Deadline check: ${fmtDate(p.s.deadline as string)}.`,
  p => `${p.days} days left on this one.`,
  p => `Closing soon and almost nobody is applying.`,
];

/** "$1,000" parses; "Varies" and "TBA" don't, and shouldn't be quoted as money. */
const hasConcreteAmount = (s: Scholarship) => parseAmount(s.amount) > 0;

const TAGS = '#alberta #scholarships #gradeschool #classof2027 #yyc #yeg #medicinehat';

function caption(p: Post, index: number): string {
  const bank = hasConcreteAmount(p.s) ? AMOUNT_HOOKS : DEADLINE_HOOKS;
  // Amounts in the data are written as they appear on the funder's page
  // ("up to $2,500"), so a hook that opens with one needs a capital.
  const raw = bank[(log.length + index) % bank.length]!(p);
  const hook = raw.charAt(0).toUpperCase() + raw.slice(1);
  const link = (src: string) => `${SITE}/scholarships/${p.slug}/?s=${src}`;
  return [
    hook,
    '',
    p.s.title,
    `Amount: ${p.s.amount}`,
    `Deadline: ${fmtDate(p.s.deadline as string)} (${p.days} days)`,
    p.s.region ? `Who: ${p.s.region}` : null,
    '',
    'Full details and the application link are on ScholarAB — every listing is checked by hand.',
    '',
    `Instagram link: ${link('ig')}`,
    `TikTok link:    ${link('tt')}`,
    '',
    TAGS,
  ].filter(l => l !== null).join('\n');
}

// --- rendering -------------------------------------------------------------

const font = (name: string) => readFileSync(join(__dirname, 'og-fonts', name));
const fonts = [
  { name: 'Instrument Serif', data: font('instrument-serif-400.ttf'), weight: 400 as const, style: 'normal' as const },
  { name: 'Archivo', data: font('archivo-700.ttf'), weight: 700 as const, style: 'normal' as const },
  { name: 'IBM Plex Mono', data: font('plex-mono-500.ttf'), weight: 500 as const, style: 'normal' as const },
];

const INK = '#F2F0E9';
const GREEN = '#2FD3A0';
const BG = '#0B1512';

const el = (type: string, style: Record<string, unknown>, children?: unknown) =>
  ({ type, props: { style, children } });

/**
 * Portrait card. The story variant is the same card with more breathing room
 * top and bottom, so the middle block stays clear of the Instagram UI.
 */
function card(p: Post, height: number) {
  const tall = height > 1500;
  const t = p.s.title;
  const titleSize = t.length > 70 ? 76 : t.length > 45 ? 92 : 110;
  // "Up to $5,000 / year" is a real amount string; at 130px it runs off the card.
  const amountSize = p.s.amount.length > 16 ? 74 : p.s.amount.length > 10 ? 100 : 130;
  return el('div', {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between', backgroundColor: BG,
    padding: tall ? '220px 80px' : '90px 80px', color: INK,
  }, [
    el('div', { display: 'flex', flexDirection: 'column', gap: 20 }, [
      el('div', { display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'IBM Plex Mono', fontSize: 28, letterSpacing: 2, color: GREEN }, [
        el('div', { width: 16, height: 16, borderRadius: 999, backgroundColor: GREEN }),
        el('div', {}, `${p.days} DAYS LEFT`),
      ]),
      el('div', { fontFamily: 'IBM Plex Mono', fontSize: 24, letterSpacing: 2, color: 'rgba(242,240,233,0.55)' },
        (p.s.region || 'ALBERTA').toUpperCase()),
    ]),
    el('div', { display: 'flex', flexDirection: 'column', gap: 72 }, [
      el('div', { fontFamily: 'Instrument Serif', fontSize: titleSize, lineHeight: 1.03, letterSpacing: -2 }, t),
      el('div', { display: 'flex', flexDirection: 'column', gap: 12 }, [
        el('div', { fontFamily: 'Instrument Serif', fontSize: amountSize, lineHeight: 1, color: GREEN }, p.s.amount),
        el('div', { fontFamily: 'IBM Plex Mono', fontSize: 30, letterSpacing: 2, color: 'rgba(242,240,233,0.6)' },
          `CLOSES ${fmtDate(p.s.deadline as string).toUpperCase()}`),
      ]),
    ]),
    el('div', { display: 'flex', flexDirection: 'column', gap: 22, borderTop: '1px solid rgba(242,240,233,0.2)', paddingTop: 34 }, [
      el('div', { display: 'flex', fontFamily: 'Archivo', fontSize: 46, fontWeight: 700 }, [
        el('span', {}, 'Scholar'),
        el('span', { color: GREEN }, 'AB'),
      ]),
      el('div', { fontFamily: 'IBM Plex Mono', fontSize: 26, letterSpacing: 2, color: 'rgba(242,240,233,0.6)' },
        'LINK IN BIO · SCHOLARAB.CA'),
    ]),
  ]);
}

async function render(p: Post, width: number, height: number): Promise<Buffer> {
  const svg = await satori(card(p, height) as Parameters<typeof satori>[0], { width, height, fonts });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng());
}

// --- go --------------------------------------------------------------------

if (picks.length === 0) {
  console.log(
    `No picks: nothing active closes between ${MIN_DAYS} and ${MAX_DAYS} days out ` +
    `that hasn't been posted in the last ${COOLDOWN_DAYS} days.\n` +
    `Widen the window with --max-days=90, or --cooldown=0 to reuse recent posts.`
  );
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });

const stamp = today.toISOString().slice(0, 10);
const posts: Post[] = picks.map(s => ({
  s,
  slug: generateSlug(s.title),
  days: daysUntil(s.deadline as string),
}));

for (const [i, p] of posts.entries()) {
  const base = `${stamp}-${String(i + 1).padStart(2, '0')}-${p.slug}`;
  writeFileSync(join(OUT_DIR, `${base}-post.png`), await render(p, 1080, 1350));
  writeFileSync(join(OUT_DIR, `${base}-story.png`), await render(p, 1080, 1920));
  writeFileSync(join(OUT_DIR, `${base}.txt`), caption(p, i) + '\n');
  console.log(`${base}  ${p.s.amount}  ${p.days}d left`);
}

if (DRY) {
  console.log(`\n${posts.length} posts in social-out/ (dry run — log not updated)`);
} else {
  const updated: LogEntry[] = [
    ...log,
    ...posts.map(p => ({ id: p.s.id, slug: p.slug, generated: stamp })),
  ];
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  writeFileSync(LOG_PATH, JSON.stringify(updated, null, 2) + '\n');
  console.log(`\n${posts.length} posts in social-out/ — logged to outreach/social-log.json`);
}
