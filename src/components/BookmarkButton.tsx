import { useState, useRef, useEffect } from 'react';
import { getSaved, toggleSaved, getSavedPrograms, toggleSavedProgram } from '../lib/tracker.ts';
import { showToast, showConfetti } from '../lib/utils.ts';

interface BookmarkButtonProps {
  id: number;
  type?: 'scholarship' | 'program';
}

export default function BookmarkButton({ id, type }: BookmarkButtonProps) {
  const [saved, setSaved] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const list = type === 'program' ? getSavedPrograms() : getSaved();
    setSaved(list.includes(id));
  }, [id, type]);

  function handleClick() {
    btnRef.current?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(0.9)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }],
      { duration: 380, easing: 'ease-out' }
    );
    navigator.vibrate?.(12);
    const next = type === 'program' ? toggleSavedProgram(id) : toggleSaved(id);
    const nowSaved = next.includes(id);
    setSaved(nowSaved);
    if (nowSaved) showConfetti(btnRef.current);
    showToast(nowSaved ? 'Saved ✓' : 'Removed from saved');
  }

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      aria-label={saved ? 'Remove bookmark' : 'Save'}
      style={{
        width: 44,
        flexShrink: 0,
        alignSelf: 'stretch',
        borderRadius: 12,
        background: saved ? 'var(--brand-dim)' : 'var(--bg-subtle)',
        backdropFilter: 'blur(16px) saturate(2)',
        WebkitBackdropFilter: 'blur(16px) saturate(2)',
        border: `0.5px solid ${saved ? 'var(--brand-border)' : 'var(--border-strong)'}`,
        color: saved ? 'var(--brand)' : 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'color 0.15s, background 0.15s, border-color 0.15s, box-shadow 0.15s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
  );
}
