import { useRef } from 'react';

export { generateSlug } from './generateSlug.js';

export const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export function getToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDeadline(str) {
  if (!str || str === 'TBA' || str === 'Ongoing') return str;
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function showConfetti(originEl) {
  document.getElementById('sa-confetti')?.remove();
  const rect = originEl?.getBoundingClientRect();
  const ox = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const oy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

  const canvas = document.createElement('canvas');
  canvas.id = 'sa-confetti';
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:999999998;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const COLORS = ['#22d3a5', '#5ee8c4', '#ffffff', '#fbbf24', '#a78bfa', '#f472b6'];
  const particles = Array.from({ length: 65 }, () => {
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
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  });

  const start = performance.now();
  let rafId;
  function tick(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      p.vy += 0.4;
      p.vx *= 0.98;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;
      if (p.y < canvas.height + 20) alive = true;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - elapsed / 1600);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive && elapsed < 1800) rafId = requestAnimationFrame(tick);
    else canvas.remove();
  }
  rafId = requestAnimationFrame(tick);
}

export function showToast(message) {
  const TOAST_ID = 'sa-toast';
  document.getElementById(TOAST_ID)?.remove();
  const el = document.createElement('div');
  el.id = TOAST_ID;
  Object.assign(el.style, {
    position: 'fixed',
    top: '72px',
    left: '50%',
    transform: 'translateX(-50%) translateY(-8px)',
    background: '#22d3a5',
    color: '#0a0a0f',
    padding: '10px 22px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    zIndex: '999999999',
    opacity: '0',
    pointerEvents: 'none',
    transition: 'opacity 0.25s ease, transform 0.25s ease',
    boxShadow: '0 4px 20px rgba(34,211,165,0.35)',
  });
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(-8px)';
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

export function BookmarkButton({ isSaved, onToggle }) {
  const btnRef = useRef(null);

  function handleClick() {
    const el = btnRef.current;
    if (el) {
      el.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.55)' },
          { transform: 'scale(0.85)' },
          { transform: 'scale(1.12)' },
          { transform: 'scale(1)' },
        ],
        { duration: 420, easing: 'ease-out' }
      );
    }
    // Haptic feedback
    navigator.vibrate?.(12);
    showToast(isSaved ? 'Removed from saved' : 'Saved ✓');
    onToggle();
  }

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      className={`flex-shrink-0 transition-colors ${
        isSaved
          ? 'text-[#22d3a5]'
          : 'text-gray-300 dark:text-white/20 hover:text-gray-400 dark:hover:text-white/35'
      }`}
      aria-label={isSaved ? 'Remove bookmark' : 'Add bookmark'}
      style={{ lineHeight: 0 }}
    >
      <svg
        width="16" height="16" viewBox="0 0 24 24"
        fill={isSaved ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
  );
}
