import { catalogueHash } from '../src/lib/catalogue.ts';
import { readFileSync, writeFileSync } from 'node:fs';
import { quizPayload } from '../src/lib/quiz-payload.ts';
import { eligibilitySchema } from '../src/lib/eligibility-types.ts';
import type { Scholarship, Program } from '../src/lib/data-loader.ts';
const snapshot = {
  scholarship: JSON.parse(readFileSync('src/data/scholarships.json', 'utf8')),
  program: JSON.parse(readFileSync('src/data/research-programs.json', 'utf8')),
};
const scholarships = snapshot.scholarship.map(
  (s: Scholarship) => ({
    ...s,
    eligibility: s.eligibility ? eligibilitySchema.parse(s.eligibility) : null,
  })
) as Scholarship[];
const programs = snapshot.program.map(
  (p: Program) => ({ ...p, active: p.active !== false })
) as Program[];
const payload=quizPayload(scholarships,programs);
for (const [source, result] of [[scholarships, payload.scholarships], [programs, payload.programs]] as const) {
  if (new Set(source.map(row => row.id)).size !== source.length ||
      source.length !== result.length || source.some((row, index) => row.id !== result[index]?.id))
    throw new Error('Quiz payload lost or duplicated catalogue identities');
}
writeFileSync('src/data/quiz-payload.json', JSON.stringify(payload));
// The publisher checks this same small marker after deployment. Preserve its
// request ID while binding it to all content in the build's JSON snapshot.
const marker = JSON.parse(readFileSync('public/publication.json', 'utf8'));
writeFileSync('public/publication.json', JSON.stringify({ ...marker, catalogueHash: await catalogueHash(snapshot) }) + '\n');
