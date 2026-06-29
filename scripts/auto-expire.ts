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
  open_date?: string;
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
  } else if (s.active === false && s.pendingReview !== true && s.open_date) {
    const openDate = new Date(s.open_date + 'T00:00:00Z');
    if (openDate <= today) {
      s.active = true;
      changed++;
      console.log(`Opened: [${s.id}] ${s.title} (open_date: ${s.open_date})`);
    }
  }
}

if (changed === 0) {
  console.log('No scholarships to sync.');
  process.exit(0);
}

writeFileSync(filePath, JSON.stringify(scholarships, null, 2) + '\n', 'utf8');
console.log(`\nSynced ${changed} scholarship(s). JSON written.`);
