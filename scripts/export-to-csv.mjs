import { readFileSync, writeFileSync } from 'fs';

const scholarships = JSON.parse(readFileSync('./src/data/scholarships.json', 'utf8'));
const programs = JSON.parse(readFileSync('./src/data/research-programs.json', 'utf8'));

function escape(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(rows, headers) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

// Scholarships CSV
const scholarshipHeaders = ['id', 'title', 'amount', 'deadline', 'open_date', 'audience', 'category', 'region', 'active', 'lastVerified', 'applyViaGuidance', 'notes', 'url'];
writeFileSync('./scholarships.csv', toCSV(scholarships, scholarshipHeaders));
console.log(`✓ scholarships.csv — ${scholarships.length} rows`);

// Research Programs CSV
const programHeaders = ['id', 'name', 'category', 'provider', 'grades', 'duration', 'paid', 'stipend', 'location', 'eligibility', 'deadline', 'lastVerified', 'description', 'url'];
writeFileSync('./research-programs.csv', toCSV(programs, programHeaders));
console.log(`✓ research-programs.csv — ${programs.length} rows`);
