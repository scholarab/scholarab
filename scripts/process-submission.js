#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import parseJson from 'secure-json-parse';
import validator from 'validator';
import sanitizeHtml from 'sanitize-html';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '../src/data/scholarships.json');

// Strip all HTML tags from text input
function cleanText(str) {
  return sanitizeHtml(String(str ?? ''), { allowedTags: [], allowedAttributes: {} }).trim();
}

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

// Validate apply URL
if (!validator.isURL(INPUT_APPLY_URL.trim(), { protocols: ['http', 'https'], require_protocol: true })) {
  console.error('Invalid INPUT_APPLY_URL: must be a valid http(s) URL');
  process.exit(1);
}

// Validate submitter email if provided
if (INPUT_SUBMITTER_EMAIL?.trim() && !validator.isEmail(INPUT_SUBMITTER_EMAIL.trim())) {
  console.error('Invalid INPUT_SUBMITTER_EMAIL: must be a valid email address');
  process.exit(1);
}

// Validate date format
if (!validator.isDate(INPUT_DEADLINE.trim(), { format: 'YYYY-MM-DD', strictMode: true })) {
  console.error('Invalid INPUT_DEADLINE: must be YYYY-MM-DD format');
  process.exit(1);
}

const amountNum = parseInt(INPUT_AMOUNT.replace(/[$,]/g, ''), 10);
if (!Number.isFinite(amountNum) || amountNum < 0) {
  console.error('Invalid INPUT_AMOUNT: must be a non-negative number');
  process.exit(1);
}
const amountStr = '$' + amountNum.toLocaleString('en-CA');

const scholarships = parseJson(readFileSync(filePath, 'utf8'));

// Reject duplicate URLs
const normalizedApplyUrl = INPUT_APPLY_URL.trim().toLowerCase().replace(/\/+$/, '');
const duplicate = scholarships.find(s => s.url && s.url.trim().toLowerCase().replace(/\/+$/, '') === normalizedApplyUrl);
if (duplicate) {
  console.error(`Duplicate URL: a scholarship already exists with this apply URL (id ${duplicate.id}: "${duplicate.title}")`);
  process.exit(1);
}

const numericIds = scholarships
  .map((s) => s.id)
  .filter((id) => typeof id === 'number' && Number.isFinite(id));
const nextId = (numericIds.length ? Math.max(...numericIds) : 0) + 1;

const entry = {
  id: nextId,
  title: cleanText(INPUT_NAME),
  amount: amountStr,
  deadline: INPUT_DEADLINE.trim(),
  audience: cleanText(INPUT_ORGANIZATION),
  url: INPUT_APPLY_URL.trim(),
  category: cleanText(INPUT_CATEGORY),
  lastVerified: new Date().toISOString().slice(0, 7),
  region: cleanText(INPUT_REGION),
  notes: cleanText(INPUT_DESCRIPTION),
  active: false,
  pendingReview: true,
  ...(INPUT_SUBMITTER_NAME?.trim() && { submitter_name: cleanText(INPUT_SUBMITTER_NAME) }),
  ...(INPUT_SUBMITTER_EMAIL?.trim() && { submitter_email: INPUT_SUBMITTER_EMAIL.trim() }),
};

scholarships.push(entry);
writeFileSync(filePath, JSON.stringify(scholarships, null, 2) + '\n', 'utf8');

console.log(`Added submission: id ${entry.id}`);
console.log('ENTRY_JSON=' + JSON.stringify(entry));
