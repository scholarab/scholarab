import { useRef } from 'react';
import { toast } from 'sonner';

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
  toast(message);
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
