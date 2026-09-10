import { readFileSync, existsSync } from 'node:fs';
import { verifyMatchingCatalogue, assertIdentitySets } from '../src/lib/matching/catalogue.ts';
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const snapshot = {
  scholarship: read('src/data/scholarships.json'),
  program: read('src/data/research-programs.json'),
};
const manifest = read('dist/matching/manifest.json');
const asset = read(`dist/matching/opportunities.${manifest.assetHash}.json`);
if (asset.version !== 1 || asset.catalogueHash !== manifest.catalogueHash)
  throw new Error('Matching asset version mismatch');
await verifyMatchingCatalogue(snapshot, manifest, asset.opportunities);
for (const entry of manifest.entries) {
  if (
    !/^\/(scholarships|programs)\/[a-z0-9-]+\/$/.test(entry.detailPath) ||
    !existsSync(`dist${entry.detailPath}index.html`)
  )
    throw new Error(`Missing detail page for ${entry.key}: ${entry.detailPath}`);
}
const quiz = read('src/data/quiz-payload.json');
assertIdentitySets(
  manifest.entries.map((e: { key: string }) => e.key),
  [
    ...quiz.scholarships.map((s: { id: number }) => `scholarship:${s.id}`),
    ...quiz.programs.map((p: { id: number }) => `program:${p.id}`),
  ],
  'Deployed quiz connection'
);
console.log(
  `Verified ${manifest.entries.length} matching identities, content hashes, quiz connections, and detail pages.`
);
