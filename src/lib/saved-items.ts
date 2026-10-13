import type { SavedItem } from './saved-client.ts';
import { generateSlug } from './utils.ts';
import type { Scholarship, Program } from './data-loader.ts';
import type { PlanKit } from './saved-plan.ts';
import { saysNoApplication, rowRoute } from './apply-method.ts';

// toApply travels as kinds and a letter count only: the plan adds them up,
// and the full text is one click away on the award's page.
const kitOf = (t: Scholarship['toApply']): PlanKit | undefined => t ? {
  k: t.items.map(i => i.kind),
  r: t.items.reduce((n, i) => n + (i.kind === 'reference' ? i.count ?? 1 : 0), 0),
  c: t.complete,
} : undefined;

/** The card fields My combo draws a saved row from. */
export function savedItems(scholarships: Scholarship[], programs: Program[]): SavedItem[] {
  return [
    ...scholarships.map(({ id, title: name, amount, audience, deadline, openDate, active, concluded, deadlineEstimated, rolling, url, toApply, applyRoute, notes, metaDetail, ...rest }) => {
      // The route as its key, not its words: a few bytes on the 194 that have one.
      const via = rowRoute(applyRoute, saysNoApplication(notes, metaDetail, (rest as { description?: string }).description));
      return { type: 'scholarship' as const, id, name, amount, audience, deadline, openDate, active, concluded, deadlineEstimated, rolling, url, href: `/scholarships/${generateSlug(name)}/`, ...(toApply ? { kit: kitOf(toApply) } : {}), ...(via ? { via } : {}) };
    }),
    ...programs.map(({ id, name, eligibility: audience, paid, cost, deadline, openDate, active, url }) =>
      ({ type: 'program' as const, id, name, audience, paid, cost, deadline, ...(openDate ? { openDate } : {}), ...(active === false ? { active: false } : {}), url, href: `/programs/${generateSlug(name)}/` })),
  ];
}
