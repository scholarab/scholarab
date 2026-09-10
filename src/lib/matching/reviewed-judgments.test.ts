import { describe, expect, it } from 'vitest';
import sources from '../../tests/fixtures/matching/reviewed/sources.json';
import rules from '../../tests/fixtures/matching/reviewed/rules.json';
import judgments from '../../tests/fixtures/matching/reviewed/judgments.json';
import scholarships from '../../data/scholarships.json';
import programs from '../../data/research-programs.json';
import { requirementSchema } from './schema';
import { evaluateRequirement } from './evaluate';
import { evaluateAvailability } from './availability';
import { normalizeOpportunity } from './normalize';
import { profileSchema } from './types';
import { createMatchingEngine } from './engine';
import { evaluationProjection } from './client-catalogue';
const catalogue = [
  ...scholarships.map((s) => normalizeOpportunity(s, 'scholarship')),
  ...programs.map((p) => normalizeOpportunity(p, 'program')),
];
for (const split of ['development', 'held-out'])
  describe(`Source-bounded judgments: ${split}`, () => {
    for (const judgment of judgments) {
      const authored = rules.find((r) => r.id === judgment.rule);
      const source = sources.find((s) => s.id === (authored?.source ?? judgment.source))!;
      if (source.split !== split) continue;
      it(`${judgment.id}: ${judgment.reason}`, () => {
        const original = catalogue.find((o) => o.key === source.key)!;
        expect(original).toBeDefined();
        if (judgment.availability) {
          expect(evaluateAvailability(original, new Date(judgment.now!)).status).toBe(
            judgment.availability
          );
          return;
        }
        const { source: _source, ...definition } = authored!;
        const rule = requirementSchema.parse({
          ...definition,
          evidence: {
            status: 'reviewed',
            sourceUrl: source.url,
            excerpt: source.summary,
            verifiedAt: source.reviewedOn,
          },
        });
        const profile = profileSchema.parse({ answers: { [rule.answerKey!]: judgment.answer } });
        expect(evaluateRequirement(rule, profile, { today: '2026-09-10' }).state).toBe(
          judgment.expected
        );
        // Test the rule inside the real identity, retaining partial scope. These
        // cases do NOT certify the rest of the provider's eligibility conditions.
        const opportunity = structuredClone(original);
        opportunity.matching.requirements = [rule];
        opportunity.matching.groups = [{ id: 'scope', operator: 'all', children: [rule.id] }];
        opportunity.matching.root = 'scope';
        opportunity.matching.coverage = 'partial';
        const full = createMatchingEngine([opportunity]).assess(profile, {
          now: new Date('2026-09-10T12:00:00Z'),
        });
        expect(full.all[0]!.eligibility).toBe(
          judgment.expected === 'not_satisfied' ? 'known_ineligible' : 'worth_checking'
        );
        expect(
          createMatchingEngine([evaluationProjection(opportunity)]).assess(profile, {
            now: new Date('2026-09-10T12:00:00Z'),
          })
        ).toEqual(full);
      });
    }
  });
