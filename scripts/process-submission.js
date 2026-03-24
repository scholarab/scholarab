#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '../src/data/scholarships.json');

const {
  INPUT_NAME,
  INPUT_ORGANIZATION,
  INPUT_AMOUNT,
  INPUT_DEADLINE,
  INPUT_APPLY_URL,
  INPUT_CATEGORY,
  INPUT_REGION,
  INPUT_DESCRIPTION,
  INPUT_SUBMITTER_NAME,
  INPUT_SUBMITTER_EMAIL,
} = process.env;

const required = { INPUT_NAME, INPUT_ORGANIZATION, INPUT_AMOUNT, INPUT_DEADLINE, INPUT_APPLY_URL, INPUT_CATEGORY, INPUT_REGION, INPUT_DESCRIPTION };
for (const [key, val] of Object.entries(required)) {
  if (!val?.trim()) { console.error(`Missing required input: ${key}`); process.exit(1); }
}

const amountNum = parseInt(INPUT_AMOUNT.replace(/[$,]/g, ''), 10);
if (!Number.isFinite(amountNum) || amountNum < 0) {
  console.error('Invalid INPUT_AMOUNT: must be a non-negative number');
  process.exit(1);
}
const amountStr = '$' + amountNum.toLocaleString('en-CA');

const scholarships = JSON.parse(readFileSync(filePath, 'utf8'));
const numericIds = scholarships
  .map((s) => s.id)
  .filter((id) => typeof id === 'number' && Number.isFinite(id));
const nextId = (numericIds.length ? Math.max(...numericIds) : 0) + 1;

const entry = {
  id: nextId,
  title: INPUT_NAME.trim(),
  amount: amountStr,
  deadline: INPUT_DEADLINE.trim(),
  audience: INPUT_ORGANIZATION.trim(),
  url: INPUT_APPLY_URL.trim(),
  category: INPUT_CATEGORY.trim(),
  lastVerified: new Date().toISOString().slice(0, 7),
  region: INPUT_REGION.trim(),
  notes: INPUT_DESCRIPTION.trim(),
  active: false,
  pendingReview: true,
  ...(INPUT_SUBMITTER_NAME?.trim() && { submitter_name: INPUT_SUBMITTER_NAME.trim() }),
  ...(INPUT_SUBMITTER_EMAIL?.trim() && { submitter_email: INPUT_SUBMITTER_EMAIL.trim() }),
};

scholarships.push(entry);
writeFileSync(filePath, JSON.stringify(scholarships, null, 2) + '\n', 'utf8');

console.log(`Added submission: id ${entry.id}`);
console.log('ENTRY_JSON=' + JSON.stringify(entry));
