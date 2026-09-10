import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { buildMatchingCatalogue, verifyMatchingCatalogue } from '../src/lib/matching/catalogue.ts';
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const snapshot = {
  scholarship: read('src/data/scholarships.json'),
  program: read('src/data/research-programs.json'),
};
const { manifest, opportunities } = await buildMatchingCatalogue(snapshot);
await verifyMatchingCatalogue(snapshot, manifest, opportunities);
const dir = 'public/matching';
mkdirSync(dir, { recursive: true });
// This directory is generated exclusively by this script; prevent stale assets
// accumulating in builds. CDN clients still hold the old deployment atomically.
for (const name of readdirSync(dir))
  if (/^opportunities\.[a-f0-9]{64}\.json$/.test(name)) unlinkSync(`${dir}/${name}`);
writeFileSync(
  `${dir}/opportunities.${manifest.assetHash}.json`,
  JSON.stringify({ version: 1, catalogueHash: manifest.catalogueHash, opportunities })
);
writeFileSync(`${dir}/manifest.json`, JSON.stringify(manifest));
// Imported by the authenticated coverage page, never a database credential.
writeFileSync('src/data/matching-manifest.json', JSON.stringify(manifest));
const report = {
  catalogueHash: manifest.catalogueHash,
  counts: manifest.counts,
  total: opportunities.length,
  connected: opportunities.length,
  reviewed: opportunities.filter((o) => o.matching.coverage === 'reviewed').length,
  inactive: opportunities.filter((o) => !o.active).length,
  unresolved: opportunities.filter((o) => o.issues.length).length,
  ageRules: opportunities.filter((o) => o.matching.requirements.some((r) => r.field === 'age'))
    .length,
  queue: opportunities.map((o) => ({
    key: o.key,
    title: o.title,
    deadline: o.matching.availability.closesOn,
    issues: o.issues,
  })),
};
mkdirSync('.cache', { recursive: true });
writeFileSync('.cache/matching-coverage.json', JSON.stringify(report, null, 2));
console.log(
  `Matching coverage: ${opportunities.length}/${opportunities.length}; scholarships ${manifest.counts.scholarship}, programs ${manifest.counts.program}; reviewed ${report.reviewed}; unresolved ${report.unresolved}`
);

// Public quiz: evaluation fields up front, complete evidence only on request.
const { evaluationProjection, encodeClientCatalogue } =
  await import('../src/lib/matching/client-catalogue.ts');
const { createHash } = await import('node:crypto');
const evidence: Record<string, string> = {};
mkdirSync(`${dir}/evidence`, { recursive: true });
for (const name of readdirSync(`${dir}/evidence`)) {
  if (/^[a-f0-9]{64}\.json$/.test(name)) unlinkSync(`${dir}/evidence/${name}`);
}
// Small evidence packs share one content digest across 16 identities. This
// avoids shipping 1,207 unrelated hashes before a student opens any evidence.
// Every record still has a verified mapping and complete original evidence.
for (let offset = 0; offset < opportunities.length; offset += 16) {
  const pack = opportunities.slice(offset, offset + 16);
  const body = JSON.stringify({
    version: 2,
    catalogueHash: manifest.catalogueHash,
    opportunities: pack,
  });
  const hash = createHash('sha256').update(body).digest('hex');
  for (const opportunity of pack) evidence[opportunity.key] = hash;
  writeFileSync(`${dir}/evidence/${hash}.json`, body);
}
for (const name of readdirSync(dir)) {
  if (/^core\.[a-f0-9]{64}\.json$/.test(name)) unlinkSync(`${dir}/${name}`);
}
const core = JSON.stringify(
  encodeClientCatalogue({
    version: 1,
    catalogueHash: manifest.catalogueHash,
    opportunities: opportunities.map(evaluationProjection),
    evidence,
  })
);
const coreHash = createHash('sha256').update(core).digest('hex');
writeFileSync(`${dir}/core.${coreHash}.json`, core);
writeFileSync(
  'src/data/matching-client.json',
  JSON.stringify({ catalogueHash: manifest.catalogueHash, coreHash, count: opportunities.length })
);
console.log(
  `Matching core: ${core.length} bytes; evidence connected through ${new Set(Object.values(evidence)).size} versioned packs.`
);
