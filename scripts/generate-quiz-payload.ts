import { assertIdentitySets } from '../src/lib/matching/catalogue.ts';
import { readFileSync, writeFileSync } from 'node:fs';
import { quizPayload } from '../src/lib/quiz-payload.ts';
import { eligibilitySchema } from '../src/lib/eligibility-types.ts';
import type { Scholarship, Program } from '../src/lib/data-loader.ts';
const scholarships = JSON.parse(readFileSync('src/data/scholarships.json', 'utf8')).map(
  (s: Scholarship) => ({
    ...s,
    eligibility: s.eligibility ? eligibilitySchema.parse(s.eligibility) : null,
  })
) as Scholarship[];
const programs = JSON.parse(readFileSync('src/data/research-programs.json', 'utf8')).map(
  (p: Program) => ({ ...p, active: p.active !== false })
) as Program[];
const payload=quizPayload(scholarships,programs);
assertIdentitySets([...scholarships.map(s=>'scholarship:'+s.id),...programs.map(p=>'program:'+p.id)],[...payload.scholarships.map(s=>'scholarship:'+s.id),...payload.programs.map(p=>'program:'+p.id)],'Current quiz payload');
writeFileSync('src/data/quiz-payload.json', JSON.stringify(payload));
