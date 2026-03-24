import { useState, useEffect } from 'react';
import { getSaved, toggleSaved, getSavedPrograms, toggleSavedProgram } from '../lib/tracker.js';

export default function BookmarkButton({ id, type }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const list = type === 'program' ? getSavedPrograms() : getSaved();
    setSaved(list.includes(id));
  }, [id, type]);

  function handleClick() {
    const next = type === 'program' ? toggleSavedProgram(id) : toggleSaved(id);
    setSaved(next.includes(id));
  }

  return (
    <button
      onClick={handleClick}
      aria-label={saved ? 'Remove bookmark' : 'Bookmark'}
      style={{ lineHeight: 0 }}
      className={`transition-all duration-150 ${saved ? 'text-[#22d3a5]' : 'text-gray-300 dark:text-white/20 hover:text-[#22d3a5] dark:hover:text-[#22d3a5]'}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
  );
}
