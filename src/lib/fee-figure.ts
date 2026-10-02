/**
 * A program's fee as the big figure on its page, when its cost note leads
 * with one: "$10 per student" under "Has a fee" made the least useful words
 * the largest on the page (flow plan, 2026-10-02). Only a leading amount, and
 * never an add-on ("$5 per extra nomination"). A first price with a second
 * one beside it ("$55 early bird or $75", "$15 per entry, $40 per
 * portfolio") is "From $55". The full note stays underneath.
 */
const LEADING = /^((?:~|About )?(?:CA|US)?\$[\d,]+(?:\.\d+)?(?: CAD| USD)?)(.*)$/;

export function feeFigure(note: string | null | undefined): string | null {
  const m = note?.match(LEADING);
  if (!m || /^ per extra\b/.test(m[2] ?? '')) return null;
  const amount = m[1] ?? '', rest = m[2] ?? '';
  const another = /^(?: to | or |,? \w+(?:-\w+)? or |,? early\b|[- ]early\b)/.test(rest) || /^[^;]*?, (?:CA|US)?\$\d/.test(rest);
  return another ? `From ${amount}` : amount;
}
