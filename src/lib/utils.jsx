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
