import { useEffect } from 'react';
import type { RefObject } from 'react';
import { observeCard, unobserveCard } from '../lib/cardObserver.ts';

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
    observeCard(el, () => {
      el.style.setProperty('--card-delay', delay);
      el.classList.remove('card-before-reveal');
      el.classList.add(isFiltered ? 'card-entrance-filter' : 'card-entrance');
    });
    return () => unobserveCard(el);
  }, [index, isFiltered, isInitial]);
}
