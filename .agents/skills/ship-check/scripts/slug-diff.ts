// Compare detail-page slugs before/after the working-tree change.
// A slug that disappears is a dead URL unless public/_redirects covers it.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { generateSlug } from '../../../../src/lib/utils.ts';

const baseRef = process.argv[2] ?? 'HEAD';

const sources = [
  { file: 'src/data/scholarships.json', key: 'title', type: 'scholarships' },
  { file: 'src/data/research-programs.json', key: 'name', type: 'programs' },
] as const;

function slugs(json: string, key: string): Set<string> {
  const rows = JSON.parse(json) as Record<string, string>[];
  return new Set(rows.map(r => generateSlug(r[key])).filter(Boolean));
}

const redirects = (() => {
  try {
    return new Set(readFileSync('public/_redirects', 'utf8').split('\n')
      .map(line => line.trim().split(/\s+/))
      .filter(([source, target, status]) => source?.startsWith('/') && target && status === '301')
      .map(([source]) => source!.replace(/\/$/, '')));
  } catch { return new Set<string>(); }
})();

let failed = 0;
let churn = 0;

for (const { file, key, type } of sources) {
  let before: Set<string>;
  try {
    before = slugs(execFileSync('git', ['show', `${baseRef}:${file}`], { encoding: 'utf8' }), key);
  } catch {
    console.error(`FAIL cannot read ${file} at the comparison revision`);
    process.exit(1);
  }
  const after = slugs(readFileSync(file, 'utf8'), key);
  for (const slug of before) {
    if (after.has(slug)) continue;
    churn++;
    const path = `/${type}/${slug}`;
    if (redirects.has(path)) {
      console.log(`PASS ${path} removed and redirected`);
    } else {
      console.log(`FAIL ${path} no longer builds and has no 301 in public/_redirects`);
      failed = 1;
    }
  }
}

if (!churn) console.log('PASS no detail-page URLs removed or renamed');
process.exit(failed);
