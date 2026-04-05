export { generateSlug } from './generateSlug.ts';

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
