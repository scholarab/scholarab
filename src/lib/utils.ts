import { albertaDate, todayDate } from './calendar'
// Accents are folded to their base letter, not dropped. Without the NFD pass
// the character class below deletes them outright, which is how the Belcourt
// listing shipped at /scholarships/belcourt-brosseau-mtis-awards/ and why the
// Fogolar row was stored with a plain 'a' to dodge the same fate. Slugs are
// public URLs, so a title is normalized here rather than worked around in data.
export function generateSlug(title: string): string {
  return String(title)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function getToday(): Date { return todayDate() }

export function formatDeadline(str: string | null | undefined): string | null | undefined {
  if (!str || str === 'TBA' || str === 'Ongoing') return str;
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * "2026-08" → "Aug 2026", the month a listing was last checked against its
 * provider's page. One helper for the detail card and every directory row.
 * Parsed by hand rather than through Date: a bare "YYYY-MM" is a UTC instant,
 * and in a negative-offset zone new Date("2026-08") lands in July.
 */
const VERIFIED_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatVerifiedMonth(str: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(str ?? '');
  if (!m) return null;
  const month = VERIFIED_MONTHS[Number(m[2]) - 1];
  return month ? `${month} ${m[1]}` : null;
}

/** Months after which a directory row says when it was last checked. */
export const STALE_CHECK_MONTHS = 6;

/**
 * Whether a listing's last check is old enough to put on its directory row.
 * Every listing is checked; the row only needs to say so once the check might
 * predate what the provider says now (reader feedback, 2026-09-29: the line on
 * every row was noise beside the deadline). Calendar months in Alberta, so a
 * check in September turns stale on March 1. Unparseable is never stale:
 * formatVerifiedMonth would have nothing to print.
 */
export function isCheckStale(str: string | null | undefined, today: string = albertaDate()): boolean {
  const v = /^(\d{4})-(\d{2})/.exec(str ?? '');
  const t = /^(\d{4})-(\d{2})/.exec(today);
  if (!v || !t || !formatVerifiedMonth(str)) return false;
  const months = (Number(t[1]) * 12 + Number(t[2])) - (Number(v[1]) * 12 + Number(v[2]));
  return months >= STALE_CHECK_MONTHS;
}

const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * How many listings were checked against the provider's page since the start
 * of last month, and that month's name: "since September" on October 5. The
 * directory says it once in its standfirst, because a checked line on every
 * row was noise beside the deadline (reader feedback, 2026-09-29).
 */
export function checkedSince(
  checks: Array<string | null | undefined>,
  today: string = albertaDate(),
): { count: number; month: string } {
  const t = /^(\d{4})-(\d{2})/.exec(today)!;
  const from = Number(t[1]) * 12 + Number(t[2]) - 2;
  const count = checks.filter(c => {
    const v = /^(\d{4})-(\d{2})/.exec(c ?? '');
    return !!v && Number(v[1]) * 12 + Number(v[2]) - 1 >= from;
  }).length;
  return { count, month: FULL_MONTHS[((from % 12) + 12) % 12]! };
}

// First dollar figure in the string: "$2,500" → 2500, "up to $8,000" → 8000,
// "$4,000–$5,000" → 4000, "Varies" → 0
export function parseAmount(amount: string | null | undefined): number {
  const m = String(amount ?? '').match(/\$[\d,]+/);
  return m ? parseInt(m[0].replace(/[$,]/g, ''), 10) || 0 : 0;
}


export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Intentionally imperative DOM injection; works outside the React tree, zero bundle cost on public pages.
/**
 * A short confirmation at the top of the page. With `action` it carries one
 * button (Undo) and stays up longer, long enough to reach it.
 */
export function showToast(message: string, action?: { label: string; onClick: () => void }): void {
  const TOAST_ID = 'sa-toast';
  document.getElementById(TOAST_ID)?.remove();
  const el = document.createElement('div');
  el.id = TOAST_ID;
  Object.assign(el.style, {
    position: 'fixed',
    top: '72px',
    left: '50%',
    transform: 'translateX(-50%) translateY(-8px)',
    background: 'var(--brand)',
    color: 'var(--text-on-brand)',
    padding: '10px 22px',
    borderRadius: '100px',
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    zIndex: '999999999',
    opacity: '0',
    pointerEvents: 'none',
    transition: 'opacity 0.25s ease, transform 0.25s ease',
    boxShadow: '0 4px 20px rgba(var(--brand-rgb), 0.35)',
  });
  el.setAttribute('role', 'status');
  el.textContent = message;
  if (action) {
    el.style.pointerEvents = 'auto';
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = action.label;
    Object.assign(b.style, {
      marginLeft: '14px', padding: '6px 4px', background: 'none', border: '0', cursor: 'pointer',
      font: 'inherit', color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px',
    });
    b.addEventListener('click', () => { action.onClick(); el.remove(); });
    el.appendChild(b);
  }
  document.body.appendChild(el);
  // Force a style flush so the entrance transition reliably fires
  // (a single rAF can land in the same frame as the append and skip it)
  void el.offsetHeight;
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(-8px)';
    setTimeout(() => el.remove(), 300);
  }, action ? 5000 : 2800);
}

/** The address shape the reminder form and /api/alert both accept. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * What is wrong with a typed email, in words that say how to fix it, or null
 * when it passes EMAIL_RE. The form shows this next to the field; a single
 * "missing something" line left students guessing which part (critique
 * 2026-09-23).
 */
export function emailProblem(raw: string): string | null {
  const email = raw.trim();
  if (!email) return 'Type your email address first.';
  if (/\s/.test(email)) return 'Take out the space in your email.';
  const at = email.split('@').length - 1;
  if (at === 0) return 'Add an @ to your email, like name@gmail.com.';
  if (at > 1) return 'Your email has more than one @. Keep only one.';
  const [name, domain] = email.split('@') as [string, string];
  if (!name) return 'Add your name before the @, like name@gmail.com.';
  if (!domain || domain.startsWith('.')) return 'Add the part after the @, like gmail.com.';
  if (!/\.[^.]+$/.test(domain)) return `Finish the part after the @, like ${domain.replace(/\.+$/, '')}.com.`;
  if (email.length > 254) return 'That email is too long.';
  return EMAIL_RE.test(email) ? null : 'That address is missing something. It should look like name@gmail.com.';
}

/**
 * How an award's headline figure is paid, when the listing's own text says it
 * is a multi-year total ("$30,000" that is $5,000 a year, rising to $10,000).
 * Read from the listing, never guessed; null when the text does not say, or
 * when the amount already carries its period or is not a figure.
 */
export function amountSpan(amount: string | null | undefined, text: string | null | undefined): string | null {
  if (!amount || !text || !/\d/.test(amount) || /year|renew|\/yr|annual/i.test(amount)) return null;
  const m = text.match(/\b(?:over|across)\s+(two|three|four|five|2|3|4|5)\s+years\b/i);
  if (!m) return null;
  const words: Record<string, string> = { '2': 'two', '3': 'three', '4': 'four', '5': 'five' };
  const n = words[m[1]!] ?? m[1]!.toLowerCase();
  return /\bup to\b/i.test(text) && !/^up to/i.test(amount) ? `Up to this, in total, over ${n} years.` : `In total, over ${n} years.`;
}
