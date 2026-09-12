import { catalogueHash, validateCatalogue } from '../src/lib/catalogue.ts';
import { readFileSync, writeFileSync } from 'node:fs';
import { quizPayload } from '../src/lib/quiz-payload.ts';
import { eligibilitySchema } from '../src/lib/eligibility-types.ts';
import type { Scholarship, Program } from '../src/lib/data-loader.ts';
const snapshot = {
  scholarship: validateCatalogue(JSON.parse(readFileSync('src/data/scholarships.json', 'utf8')), 'scholarship'),
  program: validateCatalogue(JSON.parse(readFileSync('src/data/research-programs.json', 'utf8')), 'program'),
};
const scholarships = snapshot.scholarship.map(
  (row) => ({
    ...(row as unknown as Scholarship),
    eligibility: row.eligibility ? eligibilitySchema.parse(row.eligibility) : null,
  })
) as Scholarship[];
const programs = snapshot.program.map(
  (row) => ({ ...(row as unknown as Program), active: row.active !== false })
) as Program[];
const payload=quizPayload(scholarships,programs);
for (const [source, result] of [[scholarships, payload.scholarships], [programs, payload.programs]] as const) {
  if (new Set(source.map(row => row.id)).size !== source.length ||
      source.length !== result.length || source.some((row, index) => row.id !== result[index]?.id))
    throw new Error('Quiz payload lost or duplicated catalogue identities');
}
// Both transport shapes come from this one validated snapshot. Runtime routes
// need identity, label, availability and deadline, never full editorial records.
writeFileSync('src/data/quiz-payload.json', JSON.stringify(payload));
writeFileSync('src/data/runtime-catalogue.json', JSON.stringify({
  scholarships: scholarships.map(({ id, title, active, deadline }) => ({ id, title, active, deadline })),
  programs: programs.map(({ id, name, active, deadline }) => ({ id, name, active, deadline })),
}));
// The publisher checks this same small marker after deployment. Preserve its
// request ID while binding it to all content in the build's JSON snapshot.
const marker = JSON.parse(readFileSync('public/publication.json', 'utf8'));
writeFileSync('public/publication.json', JSON.stringify({ ...marker, catalogueHash: await catalogueHash(snapshot) }) + '\n');
