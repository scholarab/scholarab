#!/usr/bin/env node
/**
 * Monthly Google Search Console totals, committed as JSON for the admin
 * analytics panel.
 *
 * Why this exists: the first-party events table only starts on 2026-07-17
 * (the table shipped 2026-07-07 and was wiped on the 16th), so Apr, May, Jun
 * and the first half of July are blank in the panel. Search Console keeps 16
 * months of clicks and impressions for the same period, which is measured
 * data rather than a reconstruction, so those months can be filled honestly.
 * It is a different metric from the event counts and is presented as one:
 * clicks are Google search visits, not detail views.
 *
 * The API is not called at request time. The key is a gitignored
 * service-account file that must never reach the Worker, and the numbers only
 * change once a day, so this writes a snapshot the page imports at build time.
 * Run it whenever the panel should catch up:
 *
 *   npm run gsc-months
 *
 * Auth and credential handling are the same as scripts/index-status.ts; see
 * the header there and docs/seo-index-status.md.
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { accessToken, root, searchAnalytics } from './lib/gsc.ts';

const OUT = join(root, 'src/data/search-months.json');

// The site's first day in Search Console. Anything earlier returns nothing,
// and the property itself only goes back 16 months, so this is a floor rather
// than a guess about what is available.
const START = '2026-03-01';

/** Today in Alberta, which is the same clock the panel buckets events by. */
function today(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Edmonton', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

async function main(): Promise<void> {
  const token = await accessToken();

  // By date, not by month: the API has no month dimension, and daily rows also
  // reveal how many days each month actually reported, which is what makes a
  // partial first or last month legible rather than a dip.
  const rows = await searchAnalytics(token, { startDate: START, endDate: today(), dimensions: ['date'] });

  const buckets = new Map<string, { clicks: number; impressions: number; posSum: number; days: number }>();
  for (const row of rows) {
    const month = (row.keys[0] ?? '').slice(0, 7);
    if (!month) continue;
    const b = buckets.get(month) ?? { clicks: 0, impressions: 0, posSum: 0, days: 0 };
    b.clicks += row.clicks;
    b.impressions += row.impressions;
    // Weighted by impressions, because an average of daily averages would let
    // a quiet day with one lucky impression outvote a busy one.
    b.posSum += row.position * row.impressions;
    b.days += 1;
    buckets.set(month, b);
  }

  const months = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      clicks: Math.round(b.clicks),
      impressions: Math.round(b.impressions),
      position: b.impressions > 0 ? Number((b.posSum / b.impressions).toFixed(1)) : null,
      days: b.days,
    }));

  writeFileSync(OUT, JSON.stringify({ generated: today(), months }, null, 2) + '\n');

  console.log(`Wrote ${months.length} months to src/data/search-months.json`);
  for (const m of months) {
    console.log(`  ${m.month}  ${String(m.clicks).padStart(5)} clicks  ${String(m.impressions).padStart(7)} impressions  pos ${m.position ?? '-'}  (${m.days} days)`);
  }
}

void main();
