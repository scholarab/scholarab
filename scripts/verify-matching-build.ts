import { stableJson } from '../src/lib/catalogue.ts';
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
const { createHash } = await import('node:crypto');
const { parseClientCatalogue, evaluationProjection, evidenceOpportunity } =
  await import('../src/lib/matching/client-catalogue.ts');
const client = read('src/data/matching-client.json');
const coreBytes = readFileSync(`dist/matching/core.${client.coreHash}.json`);
if (createHash('sha256').update(coreBytes).digest('hex') !== client.coreHash)
  throw new Error('Core asset hash mismatch');
const core = parseClientCatalogue(JSON.parse(coreBytes.toString()), manifest.catalogueHash);
assertIdentitySets(
  manifest.entries.map((e: { key: string }) => e.key),
  core.opportunities.map((o) => o.key),
  'Adaptive quiz connection'
);
for (const opportunity of asset.opportunities) {
  const projected = core.opportunities.find((o) => o.key === opportunity.key);
  if (stableJson(projected) !== stableJson(evaluationProjection(opportunity)))
    throw new Error(`Evaluation projection drift: ${opportunity.key}`);
  const hash = core.evidence[opportunity.key];
  const bytes = readFileSync(`dist/matching/evidence/${hash}.json`);
  if (createHash('sha256').update(bytes).digest('hex') !== hash)
    throw new Error('Evidence digest mismatch');
  const detail = JSON.parse(bytes.toString());
  if (
    detail.catalogueHash !== manifest.catalogueHash ||
    JSON.stringify(evidenceOpportunity(detail, manifest.catalogueHash, opportunity.key)) !==
      JSON.stringify(opportunity)
  )
    throw new Error('Evidence content mismatch');
}
console.log(`Verified adaptive core and all ${core.opportunities.length} evidence connections.`);
