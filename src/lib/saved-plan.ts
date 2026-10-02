// /saved as a plan: where each saved award stands, which three to start with,
// and what the whole list asks for.
//
// Students saved 262 awards in 30 days and opened /saved on 0.8% of page
// views (private/flow-plan, 2026-10-01): the list was a second copy of the
// directory, so there was nothing to come back for. A status per award, a
// numbered start and the list's total asks (three reference letters, not
// three separate surprises) give it a job. Statuses stay on the device, like
// the saves themselves.

import type { ApplyKind } from './to-apply';

export const PLAN_STATUSES = ['todo', 'working', 'submitted', 'won'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const STATUS_LABEL: Record<PlanStatus, string> = {
  todo: 'Not started',
  working: 'Working on it',
  submitted: 'Submitted',
  won: 'Won',
};

/** What a saved row carries from its toApply: the kinds, the letters, and whether the list is whole. */
export interface PlanKit { k: ApplyKind[]; r: number; c: boolean }

export interface PlanItem {
  type: 'scholarship' | 'program';
  id: number;
  /** True when the award can't be applied for now or later this cycle. */
  closed: boolean;
  kit?: PlanKit;
  /** Who takes the application (lib/apply-method.ts). */
  via?: string;
}

const KEY = 'scholarab_status';
const itemKey = (type: PlanItem['type'], id: number) => `${type === 'scholarship' ? 's' : 'p'}:${id}`;

function readAll(): Record<string, PlanStatus> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Record<string, PlanStatus> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (/^[sp]:\d+$/.test(k) && (PLAN_STATUSES as readonly string[]).includes(v as string) && v !== 'todo') out[k] = v as PlanStatus;
    }
    return out;
  } catch {
    return {};
  }
}

export function getStatus(type: PlanItem['type'], id: number): PlanStatus {
  return readAll()[itemKey(type, id)] ?? 'todo';
}

/** 'todo' is the absence of a status, so the store only holds what a student set. */
export function setStatus(type: PlanItem['type'], id: number, status: PlanStatus): void {
  try {
    const all = readAll();
    if (status === 'todo') delete all[itemKey(type, id)];
    else all[itemKey(type, id)] = status;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* storage blocked: the select still shows the choice for this visit */ }
}

const isDone = (s: PlanStatus) => s === 'submitted' || s === 'won';
// Nothing to file, by its researched kit or its own text (via 'none').
const needsNothing = (i: PlanItem) => i.via === 'none' || (i.kit?.k.includes('none') ?? false);
// Not one to start tonight: nothing to file, or it waits on someone's nomination.
const cantStart = (i: PlanItem) => needsNothing(i) || i.via === 'nominated';

/**
 * Rows still to do keep the deadline order they arrive in; submitted, then
 * won, sink below them, so the top of the list is always the next job.
 */
export function planOrder<T>(ordered: T[], status: (i: T) => PlanStatus): T[] {
  const rank = (i: T) => ({ todo: 0, working: 0, submitted: 1, won: 2 })[status(i)];
  return ordered.map((item, n) => ({ item, n })).sort((a, b) => rank(a.item) - rank(b.item) || a.n - b.n).map(x => x.item);
}

/**
 * The scholarships to start with: the first three, in deadline order, that are
 * still open or coming, not yet submitted, and actually take an application.
 */
export function startWith<T extends PlanItem>(ordered: T[], status: (i: T) => PlanStatus, max = 3): T[] {
  return ordered.filter(i => i.type === 'scholarship' && !i.closed && !isDone(status(i)) && !cantStart(i)).slice(0, max);
}

// `short` is the phone strip's word, where the whole plan is one line.
const NEED_ORDER: { kind: ApplyKind; one: string; many: string; short: [string, string] }[] = [
  { kind: 'reference', one: 'reference letter', many: 'reference letters', short: ['letter', 'letters'] },
  { kind: 'essay', one: 'award with essays', many: 'awards with essays', short: ['essay', 'essays'] },
  { kind: 'transcript', one: 'transcript', many: 'transcripts', short: ['transcript', 'transcripts'] },
  { kind: 'video', one: 'video', many: 'videos', short: ['video', 'videos'] },
  { kind: 'interview', one: 'interview', many: 'interviews', short: ['interview', 'interviews'] },
  { kind: 'financial', one: 'financial form', many: 'financial forms', short: ['money form', 'money forms'] },
];

export interface PlanNeeds {
  needs: { n: number; label: string; short: string }[];
  /** Open scholarships still to do. */
  todo: number;
  /** How many of those list what they ask for. */
  listed: number;
  /** How many of the listed ones say the form may ask for more. */
  partial: number;
  /** How many need no application at all. */
  nothing: number;
}

/** What the open, unsent scholarships ask for between them. */
export function planNeeds<T extends PlanItem>(items: T[], status: (i: T) => PlanStatus): PlanNeeds {
  const live = items.filter(i => i.type === 'scholarship' && !i.closed && !isDone(status(i)));
  const counts = new Map<ApplyKind, number>();
  let listed = 0;
  let nothing = 0;
  let partial = 0;
  for (const i of live) {
    if (needsNothing(i)) { nothing++; continue; }
    if (!i.kit) continue;
    listed++;
    if (!i.kit.c) partial++;
    for (const kind of new Set(i.kit.k)) counts.set(kind, (counts.get(kind) ?? 0) + (kind === 'reference' ? i.kit.r : 1));
  }
  const needs = NEED_ORDER.filter(d => (counts.get(d.kind) ?? 0) > 0)
    .map(d => { const n = counts.get(d.kind)!; return { n, label: n === 1 ? d.one : d.many, short: d.short[n === 1 ? 0 : 1] }; });
  return { needs, todo: live.length - nothing, listed, partial, nothing };
}
