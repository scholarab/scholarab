import { useEffect } from 'react';
import type { RefObject } from 'react';

// Shared IntersectionObserver — all cards share one native observer instance.
let sharedObserver: IntersectionObserver | null = null;
const callbacks = new Map<Element, () => void>();

function getObserver(): IntersectionObserver {
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const cb = callbacks.get(entry.target);
      if (cb) {
        cb();
        callbacks.delete(entry.target);
        sharedObserver!.unobserve(entry.target);
      }
    }
  }, { threshold: 0.05 });
  return sharedObserver;
}

export function useCardEntrance(
  ref: RefObject<HTMLDivElement | null>,
  index: number,
  isInitial: boolean,
  isFiltered = false,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const delay = `${Math.min(index, 6) * 0.03}s`;
    if (isInitial) {
      if (isFiltered) {
        el.style.setProperty('--card-delay', delay);
        el.classList.add('card-entrance-filter');
      }
      return;
    }
    callbacks.set(el, () => {
      el.style.setProperty('--card-delay', delay);
      el.classList.remove('card-before-reveal');
      el.classList.add(isFiltered ? 'card-entrance-filter' : 'card-entrance');
    });
    getObserver().observe(el);
    return () => {
      callbacks.delete(el);
      if (sharedObserver) sharedObserver.unobserve(el);
    };
  }, [ref, index, isFiltered, isInitial]);
}
