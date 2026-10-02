// What applying for a scholarship takes, as the provider's own page lists it.
//
// Students saved an award, clicked Apply, and only then found out it wanted a
// portal account, two references and a one-take video, or nothing at all
// (the New Beginnings Bursary has no application). Saving 262 awards a month
// against 0.8% of page views on /saved is that drop-off, measured
// (private/flow-plan, 2026-10-01). The list puts the work in front of the
// button, so a student can pick what they have time for.
//
// Researched by hand, never derived from the notes: a keyword guess would
// list an essay for every award whose notes mention one in passing.
// `complete` is true only when the provider's page lists the whole
// application; otherwise the page says the form may ask for more.
// JSON-only, like metaDetail.

export const APPLY_KINDS = [
  'none', 'account', 'form', 'essay', 'video', 'reference',
  'transcript', 'acceptance', 'financial', 'interview', 'other',
] as const;

export type ApplyKind = (typeof APPLY_KINDS)[number];

export interface ApplyItem {
  kind: ApplyKind;
  text: string;
  /** How many letters, on a reference item. */
  count?: number;
}

export interface ToApply {
  /** YYYY-MM-DD the provider's page was read. */
  checked: string;
  complete: boolean;
  items: ApplyItem[];
}

/** Problems with one listing's toApply, as messages; empty when it is sound. */
export function toApplyProblems(t: unknown): string[] {
  if (t === undefined || t === null) return [];
  const v = t as Partial<ToApply>;
  const out: string[] = [];
  if (typeof v.checked !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.checked)) out.push('checked must be YYYY-MM-DD');
  if (typeof v.complete !== 'boolean') out.push('complete must be true or false');
  if (!Array.isArray(v.items) || v.items.length === 0) return [...out, 'items must be a non-empty list'];
  v.items.forEach((item, i) => {
    if (!APPLY_KINDS.includes(item?.kind as ApplyKind)) out.push(`item ${i}: unknown kind ${String(item?.kind)}`);
    if (typeof item?.text !== 'string' || !item.text.trim()) out.push(`item ${i}: empty text`);
    if (item?.count !== undefined && (!Number.isInteger(item.count) || item.count < 1)) out.push(`item ${i}: count must be a whole number`);
    if (item?.count !== undefined && item.kind !== 'reference') out.push(`item ${i}: count is only for references`);
  });
  if (v.items.some((i) => i?.kind === 'none') && v.items.length > 1) out.push('a "none" item stands alone');
  return out;
}
