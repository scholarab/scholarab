import { todayDate } from './calendar'
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

// First dollar figure in the string: "$2,500" → 2500, "up to $8,000" → 8000,
// "$4,000–$5,000" → 4000, "Varies" → 0
export function parseAmount(amount: string | null | undefined): number {
  const m = String(amount ?? '').match(/\$[\d,]+/);
  return m ? parseInt(m[0].replace(/[$,]/g, ''), 10) || 0 : 0;
}


interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  w: number; h: number;
  rot: number; rotV: number;
  color: string;
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function showConfetti(originEl?: Element | null): void {
  if (prefersReducedMotion()) return;
  document.getElementById('sa-confetti')?.remove();
  const rect = originEl?.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ox = rect ? rect.left + rect.width / 2 : vw / 2;
  const oy = rect ? rect.top + rect.height / 2 : vh / 2;

  const canvas = document.createElement('canvas');
  canvas.id = 'sa-confetti';
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:999999998;';
  // Render at device resolution so particles stay sharp on HiDPI screens
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = vw * dpr;
  canvas.height = vh * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  document.body.appendChild(canvas);

  const COLORS = ['#22d3a5', '#5ee8c4', '#ffffff', '#fbbf24', '#a78bfa', '#f472b6'];
  const particles: Particle[] = Array.from({ length: 30 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 9 + 4;
    return {
      x: ox, y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 5,
      w: Math.random() * 7 + 3,
      h: Math.random() * 4 + 2,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.26,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    };
  });

  const start = performance.now();
  let last = start;
  function tick(now: number) {
    const elapsed = now - start;
    // Physics tuned at 60fps; dt scales them to the actual refresh rate
    // (120Hz phones, throttled tabs). Capped so a background tab doesn't teleport particles.
    const dt = Math.min((now - last) / 16.667, 3);
    last = now;
    ctx!.clearRect(0, 0, vw, vh);
    let alive = false;
    for (const p of particles) {
      p.vy += 0.4 * dt; p.vx *= Math.pow(0.98, dt);
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.rotV * dt;
      if (p.y < vh + 20) alive = true;
      ctx!.save();
      ctx!.globalAlpha = Math.max(0, 1 - elapsed / 1600);
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx!.restore();
    }
    if (alive && elapsed < 1800) requestAnimationFrame(tick);
    else canvas.remove();
  }
  requestAnimationFrame(tick);
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
