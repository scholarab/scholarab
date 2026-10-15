// One reminder sign-up for a whole set: My combo (/saved/) and the Build my
// combo results (/match/). Which listings a set covers is the listing form's
// own rule (alerts.ts reminderState), so a set never offers a reminder its
// listing page would refuse. /api/alert checks the same rule again against
// the published catalogue and answers with how many it covered.

import { ALERT_MILESTONES, MAX_REMINDER_SET, canRemind, milestonePhrase, milestonesAhead, reminderFormCopy, reminderState, type ItemType } from './alerts';
import { calendarMs, todayDate } from './calendar';
import { programStatusOf, scholarshipStatusOf, type StatusInput } from './status';
import { emailProblem } from './utils';

export interface SetCandidate extends StatusInput {
  type: ItemType;
  id: number;
  /** Marked submitted or won on My combo, so nothing is left to remind about. */
  done?: boolean;
}

export type SetPlace = 'saved' | 'match';
export type SetItem = { itemType: ItemType; itemId: number };

export interface SetPlan {
  /** What the request sends, in page order, at most MAX_REMINDER_SET. */
  items: SetItem[];
  heading: string;
  sub: string;
  /** Which listings it leaves out and why, or '' when it takes every one. */
  note: string;
}

/** A listing's status fields and nothing else, from a catalogue row. */
export function setCandidate(type: ItemType, row: StatusInput & { id: number }, done = false): SetCandidate {
  const { id, deadline, openDate, active, concluded, deadlineEstimated, rolling } = row;
  return { type, id, deadline, openDate, active, concluded, deadlineEstimated, rolling, done };
}

type Out = 'closed' | 'done' | 'soon' | 'undated';
const ONE: Record<Out, string> = { closed: 'is closed', done: 'is already submitted', soon: 'closes too soon', undated: 'has no date to watch' };
const MANY: Record<Out, string> = { closed: 'are closed', done: 'are already submitted', soon: 'close too soon', undated: 'have no date to watch' };

/** Calendar days from `today` (todayDate's Alberta midnight) to an ISO date. */
function daysUntil(iso: string, today: Date): number {
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return Math.round((calendarMs(iso) - calendarMs(ymd)) / 86400000);
}

function isClosed(c: SetCandidate, today: Date): boolean {
  if (c.concluded) return true;
  return c.type === 'program'
    ? c.active === false || programStatusOf(c, today) === 'closed'
    : scholarshipStatusOf(c, today) === 'closed';
}

const either = (words: string[]) => words.length > 1 ? `${words.slice(0, -1).join(', ')} or ${words[words.length - 1]}` : words[0] ?? '';

/** The sign-up a set offers, or null when no listing in it takes a reminder. */
export function planSetReminder(candidates: readonly SetCandidate[], today: Date): SetPlan | null {
  const taken: { c: SetCandidate; state: 'deadline' | 'open' | 'posted' }[] = [];
  const out = new Map<Out, number>();
  for (const c of candidates) {
    const state = c.done ? null : reminderState(c, c.type, today);
    if (canRemind(state)) { taken.push({ c, state }); continue; }
    const why: Out = c.done ? 'done' : state === 'too-soon' ? 'soon' : isClosed(c, today) ? 'closed' : 'undated';
    out.set(why, (out.get(why) ?? 0) + 1);
  }
  if (taken.length === 0) return null;
  const set = taken.slice(0, MAX_REMINDER_SET);
  const items = set.map(({ c }) => ({ itemType: c.type, itemId: c.id }));

  const left = [...out.values()].reduce((a, b) => a + b, 0);
  const reasons = (['closed', 'done', 'soon', 'undated'] as const).filter(r => out.has(r));
  const notes = [left === 0 ? '' : left === 1 ? `The other one ${ONE[reasons[0]!]}.` : `The other ${left} ${either(reasons.map(r => MANY[r]))}.`];
  if (taken.length > set.length) notes.push(`One sign-up takes up to ${MAX_REMINDER_SET}, so this one covers the first ${MAX_REMINDER_SET} here.`);
  const note = notes.filter(Boolean).join(' ');

  // One listing reads exactly as its own page's form does.
  if (set.length === 1) {
    const { c, state } = set[0]!;
    const copy = reminderFormCopy(state, state === 'deadline' ? milestonesAhead(daysUntil(c.deadline!, today)) : []);
    return { items, heading: copy.heading, sub: copy.before + copy.when + copy.after, note };
  }
  // Every milestone is promised only where every dated listing still has it.
  const short = set.some(t => t.state === 'deadline' && milestonesAhead(daysUntil(t.c.deadline!, today)).length < ALERT_MILESTONES.length);
  const states = new Set(set.map(t => t.state));
  const when = states.has('posted') && states.has('open') ? 'a date is posted or applications open'
    : states.has('posted') ? 'a date is posted' : states.has('open') ? 'applications open' : '';
  const sub = `We send one link to confirm, then a reminder ${milestonePhrase(ALERT_MILESTONES)} before each deadline`
    + (short ? ', where there is still time' : '')
    + (when ? `, and an email when ${when}` : '')
    + '. Reminders due the same day come in one email.';
  return { items, heading: `Email me before these ${set.length} close`, sub, note };
}

/** What the box says once /api/alert has the request. The answer is the same
 * for a new, waiting or confirmed address, so it never says which. */
export function setReminderDone(covered: number, asked: number): string {
  if (covered <= 1) return 'Request received. If confirmation is needed, check your inbox. Existing reminders stay unchanged.';
  return `Request received for ${covered === asked ? `all ${covered}` : `${covered} of ${asked}`}. If confirmation is needed, check your inbox for one email. Existing reminders stay unchanged.`;
}

export async function requestSetReminder(email: string, items: SetItem[], place: SetPlace): Promise<{ covered: number } | { error: string }> {
  try {
    const res = await fetch('/api/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, items, place }),
    });
    const data = await res.json().catch(() => ({})) as { error?: string; covered?: number };
    if (res.ok) return { covered: typeof data.covered === 'number' ? data.covered : items.length };
    return { error: data.error || 'Something went wrong. Try again.' };
  } catch {
    return { error: 'Could not reach the server. Check your connection and try again.' };
  }
}

// ── My combo ─────────────────────────────────────────────────────────────────
// saved-client.ts dispatches `saved:plan` with the rows it shows, each with its
// plan status, every time it paints the plan. The box is painted from that, so
// it follows saves, removals and status changes without a second source.

type SavedRow = StatusInput & { type: ItemType; id: number; status?: string };

const plans = new WeakMap<HTMLElement, SetPlan>();
let bound = false;

function paint(box: HTMLElement, rows: SavedRow[]): void {
  // A sent box keeps its answer until the page is opened again.
  if (box.dataset.sent !== undefined) return;
  const plan = planSetReminder(rows.map(r => setCandidate(r.type, r, r.status === 'submitted' || r.status === 'won')), todayDate());
  box.hidden = !plan;
  if (!plan) { plans.delete(box); return; }
  plans.set(box, plan);
  box.querySelector('[data-set-remind-heading]')!.textContent = plan.heading;
  box.querySelector('[data-set-remind-sub]')!.textContent = [plan.sub, plan.note].filter(Boolean).join(' ');
}

async function submit(e: Event): Promise<void> {
  const form = (e.target as Element).closest?.<HTMLFormElement>('[data-set-remind-form]');
  if (!form) return;
  // Capture phase and stopPropagation, so Astro's ClientRouter, which also
  // listens for submit, never swaps the page for this form.
  e.preventDefault();
  e.stopPropagation();
  const box = form.closest<HTMLElement>('[data-set-remind]')!;
  const plan = plans.get(box);
  if (!plan) return;
  const input = form.querySelector<HTMLInputElement>('input[name="email"]')!;
  const btn = form.querySelector<HTMLButtonElement>('button')!;
  const msg = box.querySelector<HTMLElement>('[data-set-remind-msg]')!;
  const say = (text: string, error: boolean) => {
    msg.textContent = text;
    msg.classList.toggle('is-error', error);
    msg.hidden = false;
    input.setAttribute('aria-invalid', String(error));
  };
  const problem = emailProblem(input.value);
  if (problem) { say(problem, true); input.focus(); return; }
  const idle = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Saving…';
  const result = await requestSetReminder(input.value.trim(), plan.items, form.dataset.place === 'match' ? 'match' : 'saved');
  if ('covered' in result) {
    box.dataset.sent = '';
    form.style.display = 'none';
    say(setReminderDone(result.covered, plan.items.length), false);
  } else {
    btn.disabled = false;
    btn.textContent = idle;
    say(result.error, true);
  }
}

/** The button opens the box in place and puts the cursor in the field. */
function toggle(e: Event): void {
  const btn = (e.target as Element).closest?.<HTMLButtonElement>('[data-set-remind-open]');
  const box = btn?.closest('[data-set-remind]')?.querySelector<HTMLElement>('[data-set-remind-box]');
  if (!btn || !box) return;
  const open = box.hidden;
  box.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  if (open) box.querySelector<HTMLInputElement>('input[name="email"]')?.focus();
}

/** Once flagged, the field clears its error the moment the address is fixed. */
function revalidate(e: Event): void {
  const input = e.target as HTMLInputElement;
  if (!input.matches?.('[data-set-remind-form] input[name="email"]') || input.getAttribute('aria-invalid') !== 'true') return;
  const msg = input.closest('[data-set-remind]')?.querySelector<HTMLElement>('[data-set-remind-msg]');
  const problem = emailProblem(input.value);
  if (msg) msg.textContent = problem ?? '';
  if (!problem) { input.removeAttribute('aria-invalid'); if (msg) msg.hidden = true; }
}

export function bindSetReminder(): void {
  if (bound) return;
  bound = true;
  document.addEventListener('saved:plan', e => {
    const box = (e.target as Element).querySelector?.<HTMLElement>('[data-set-remind]');
    if (box) paint(box, (e as CustomEvent<SavedRow[]>).detail);
  });
  document.addEventListener('click', toggle);
  document.addEventListener('submit', e => { void submit(e); }, true);
  document.addEventListener('input', revalidate);
}
