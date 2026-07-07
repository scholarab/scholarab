#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '../src/data/scholarships.json');

interface Scholarship {
  id: number | string;
  title: string;
  active: boolean;
  deadline?: string;
  openDate?: string;
  pendingReview?: boolean;
  [key: string]: unknown;
}

const scholarships: Scholarship[] = JSON.parse(readFileSync(filePath, 'utf8'));

const today = new Date();
today.setUTCHours(0, 0, 0, 0);

let changed = 0;

for (const s of scholarships) {
  if (s.active === true) {
    const deadline = new Date(s.deadline + 'T00:00:00Z');
    if (deadline < today) {
      s.active = false;
      changed++;
      console.log(`Expired: [${s.id}] ${s.title} (deadline: ${s.deadline})`);
    }
  } else if (s.active === false && s.pendingReview !== true && s.openDate) {
    const openDate = new Date(s.openDate + 'T00:00:00Z');
    const deadline = s.deadline ? new Date(s.deadline + 'T00:00:00Z') : null;
    if (openDate <= today && !(deadline && deadline < today)) {
      s.active = true;
      changed++;
      console.log(`Opened: [${s.id}] ${s.title} (openDate: ${s.openDate})`);
    }
  }
}

if (changed > 0) {
  writeFileSync(filePath, JSON.stringify(scholarships, null, 2) + '\n', 'utf8');
  console.log(`\nSynced ${changed} scholarship(s). JSON written.`);
} else {
  console.log('No JSON scholarships to sync.');
}

// ── Sync the database too (production source of truth), when configured ──────
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(dbUrl);
  const todayISO = today.toISOString().slice(0, 10);

  const expired = await sql`
    UPDATE scholarships SET active = false
    WHERE active = true
      AND deadline IS NOT NULL
      AND deadline ~ '^\\d{4}-\\d{2}-\\d{2}$'
      AND deadline::date < ${todayISO}::date
    RETURNING id, title, deadline`;
  for (const r of expired) console.log(`DB expired: [${r.id}] ${r.title} (deadline: ${r.deadline})`);

  const opened = await sql`
    UPDATE scholarships SET active = true
    WHERE active = false
      AND open_date IS NOT NULL
      AND open_date ~ '^\\d{4}-\\d{2}-\\d{2}$'
      AND open_date::date <= ${todayISO}::date
      AND (deadline IS NULL OR deadline !~ '^\\d{4}-\\d{2}-\\d{2}$' OR deadline::date >= ${todayISO}::date)
    RETURNING id, title, open_date`;
  for (const r of opened) console.log(`DB opened: [${r.id}] ${r.title} (open_date: ${r.open_date})`);

  console.log(`DB sync: ${expired.length} expired, ${opened.length} opened.`);
} else {
  console.log('DATABASE_URL not set — skipped DB sync.');
}
