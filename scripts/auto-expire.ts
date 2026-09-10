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
  [key: string]: unknown;
}

const scholarships: Scholarship[] = JSON.parse(readFileSync(filePath, 'utf8'));

// "Today" is Alberta's calendar date, not the runner's (CI is UTC; its
// midnight is 5-6pm in Edmonton, which would expire listings on the evening
// OF their deadline day). ISO strings compare correctly as strings.
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Edmonton' }).format(new Date());

// Only compare deadlines that are actually dates. A bare `deadline < today`
// string compare treats anything sorting below "2026-..." as expired, so a
// value like "15 May 2026" or "01-05-2026" would silently delist the entry
// (letters sort above digits, which is the only reason "TBA"/"Ongoing" were
// safe). validate-data enforces ISO for scholarships, so this guards the gap
// between a hand edit and the build that rejects it, and matches the guards
// the programs loop and the SQL below already have.
const isDated = (d?: string): boolean => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
const isPast = (d?: string): boolean => isDated(d) && d! < today;

let changed = 0;

for (const s of scholarships) {
  if (s.active === true) {
    if (isPast(s.deadline)) {
      s.active = false;
      changed++;
      console.log(`Expired: [${s.id}] ${s.title} (deadline: ${s.deadline})`);
    }
  } else if (s.active === false && s.openDate) {
    // A dated, still-future deadline is required, not merely "not past":
    // isPast(undefined) is false, so a listing with NO deadline used to
    // satisfy this and get reopened by a stale openDate, with nothing left
    // that could ever expire it again. That is how the discontinued TD
    // community leadership award came back as open the night after it was
    // retired, carrying an openDate from its last real cycle.
    if (s.openDate <= today && isDated(s.deadline) && !isPast(s.deadline)) {
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

// ── Research programs: passed dated deadlines reset to TBA (between cycles) ──
// Programs stay listed between cycles with deadline 'TBA' (70 of 97 entries).
// A passed date means the cycle closed; next-cycle dates get filled in by hand
// once announced. The weekly link checker catches programs that actually die.
interface Program {
  id: number | string;
  name: string;
  active?: boolean;
  deadline: string;
  [key: string]: unknown;
}

const programsPath = join(__dirname, '../src/data/research-programs.json');
const programs: Program[] = JSON.parse(readFileSync(programsPath, 'utf8'));

let programsChanged = 0;
for (const p of programs) {
  if (p.active === false || p.deadline === 'TBA' || p.deadline === 'Ongoing') continue;
  if (/^\d{4}-\d{2}-\d{2}$/.test(p.deadline) && p.deadline < today) {
    console.log(`Cycle closed: [${p.id}] ${p.name} (deadline: ${p.deadline}) -> TBA`);
    p.deadline = 'TBA';
    programsChanged++;
  }
}

if (programsChanged > 0) {
  writeFileSync(programsPath, JSON.stringify(programs, null, 2) + '\n', 'utf8');
  console.log(`Synced ${programsChanged} program(s). JSON written.`);
} else {
  console.log('No JSON programs to sync.');
}

// sync-db.ts mirrors this validated published snapshot. Never independently
// reopen legacy DB rows or mutate drafts from an expiration job.
