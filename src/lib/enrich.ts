// Build-time enrichment for the directory payloads.
//
// The two directory pages each did this inline, which was fine while they were
// the only callers. The facet hubs are a third and fourth, and the fields have
// to be computed identically everywhere: `_deadline_ms` and `_open_ms` are what
// status.ts reads through StatusHints, so a hub that derived them differently
// would classify the same listing differently from the directory it links back
// to. One definition, four callers.
//
// The parsing happens here rather than on the client because the payload is
// prerendered: doing it at build time keeps the regex and Date work off every
// visitor's device.
import { generateSlug, formatDeadline, parseAmount } from './utils.ts';
import type { Scholarship, Program } from './data-loader.ts';

export function enrichScholarships(raw: Scholarship[]) {
  return raw.map(s => ({
    ...s,
    _amount: parseAmount(s.amount),
    _deadline_ms: s.deadline ? new Date(s.deadline + 'T00:00:00').getTime() : 0,
    _open_ms: s.openDate ? new Date(s.openDate + 'T00:00:00').getTime() : 0,
    _slug: generateSlug(s.title),
    _deadline_formatted: s.deadline ? formatDeadline(s.deadline) : null,
  }));
}

export function enrichPrograms(raw: Program[]) {
  return raw.map(p => ({
    ...p,
    // 'TBA' and 'Ongoing' are not dates and must not become NaN; undefined is
    // the value programStatusOf and the sorts already understand.
    _deadline_ms: p.deadline && p.deadline !== 'TBA' && p.deadline !== 'Ongoing'
      ? new Date(p.deadline + 'T00:00:00').getTime()
      : undefined,
    _slug: generateSlug(p.name),
  }));
}
