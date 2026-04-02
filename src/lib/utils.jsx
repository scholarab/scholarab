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

let _toastTimer = null;

export function showToast(message) {
  if (_toastTimer !== null) { clearTimeout(_toastTimer); _toastTimer = null; }
  document.getElementById('scholarab-toast')?.remove();
  const toast = document.createElement('div');
  toast.id = 'scholarab-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: #22d3a5;
    color: #0a0a0f;
    padding: 10px 22px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    z-index: 99999;
    opacity: 0;
    pointer-events: none;
    white-space: nowrap;
    box-shadow: 0 4px 20px rgba(34,211,165,0.35);
  `;
  document.body.appendChild(toast);
  toast.animate(
    [
      { opacity: 0, transform: 'translateX(-50%) translateY(20px)' },
      { opacity: 1, transform: 'translateX(-50%) translateY(0px)' },
    ],
    { duration: 350, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' }
  );
  _toastTimer = setTimeout(() => {
    _toastTimer = null;
    toast.animate(
      [
        { opacity: 1, transform: 'translateX(-50%) translateY(0px)' },
        { opacity: 0, transform: 'translateX(-50%) translateY(10px)' },
      ],
      { duration: 220, easing: 'ease-in', fill: 'forwards' }
    ).onfinish = () => toast.remove();
  }, 1600);
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
