import { useEffect } from 'react';
import type { RefObject } from 'react';

// Cards render directly — no skeleton/reveal pass. Only filter changes
// animate: the grid remounts on a filter key change, and fresh cards get a
// short staggered entrance so the change reads as intentional.
export function useCardEntrance(
  ref: RefObject<HTMLDivElement | null>,
  index: number,
  isInitial: boolean,
  isFiltered = false,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !isFiltered) return;
    el.style.setProperty('--card-delay', `${Math.min(index, 6) * 0.03}s`);
    el.classList.add('card-entrance-filter');
  }, [ref, index, isInitial, isFiltered]);
}
