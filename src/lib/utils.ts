export function generateSlug(title: string): string {
  return String(title).toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

export function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDeadline(str: string | null | undefined): string | null | undefined {
  if (!str || str === 'TBA' || str === 'Ongoing') return str;
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
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

// Intentionally imperative DOM injection — works outside the React tree, zero bundle cost on public pages.
export function showToast(message: string): void {
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
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    zIndex: '999999999',
    opacity: '0',
    pointerEvents: 'none',
    transition: 'opacity 0.25s ease, transform 0.25s ease',
    boxShadow: '0 4px 20px rgba(var(--brand-rgb), 0.35)',
  });
  el.textContent = message;
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
  }, 2800);
}
