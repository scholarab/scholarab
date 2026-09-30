import { catalogueHash, validateCatalogue } from '../src/lib/catalogue.ts';
import { readFileSync, writeFileSync } from 'node:fs';
import { quizPayload } from '../src/lib/quiz-payload.ts';
import { eligibilitySchema } from '../src/lib/eligibility-types.ts';
import type { Scholarship, Program } from '../src/lib/data-loader.ts';
import { comboIndex } from '../src/lib/combos.ts';
import { todayDate } from '../src/lib/calendar.ts';
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
const payload=quizPayload(scholarships,programs,comboIndex(scholarships,todayDate()));
for (const [source, result] of [[scholarships, payload.scholarships], [programs, payload.programs]] as const) {
  if (new Set(source.map(row => row.id)).size !== source.length ||
      source.length !== result.length || source.some((row, index) => row.id !== result[index]?.id))
    throw new Error('Quiz payload lost or duplicated catalogue identities');
}
// Both transport shapes come from this one validated snapshot. Runtime routes
// need identity, label, availability and deadline, never full editorial records.
writeFileSync('src/data/quiz-payload.json', JSON.stringify(payload));
writeFileSync('src/data/runtime-catalogue.json', JSON.stringify({
  // Sparse, like the quiz payload: /api/alert refuses a reminder for a date
  // the provider has not posted, the same line the listing page draws.
  scholarships: scholarships.map(({ id, title, active, deadline, deadlineEstimated }) =>
    ({ id, title, active, deadline, ...(deadlineEstimated ? { deadlineEstimated: true } : {}) })),
  programs: programs.map(({ id, name, active, deadline }) => ({ id, name, active, deadline })),
}));
// The publisher checks this same small marker after deployment: the request ID
// it committed, bound to all content in the build's JSON snapshot. Only the ID
// is committed. The hash is recomputed here before anything reads it, so a
// committed copy could only go stale, and did after every data commit that left
// it out, the daily sync among them.
const request = JSON.parse(readFileSync('src/data/publication-request.json', 'utf8'));
writeFileSync('public/publication.json', JSON.stringify({ ...request, catalogueHash: await catalogueHash(snapshot) }) + '\n');
