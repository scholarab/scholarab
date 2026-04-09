// Shared IntersectionObserver for all cards.
// Instead of one observer per card, all cards share a single native observer.
// Inspired by Telegram Web's SuperIntersectionObserver freeze/flush pattern.

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

export function observeCard(el: Element, callback: () => void): void {
  callbacks.set(el, callback);
  getObserver().observe(el);
}

export function unobserveCard(el: Element): void {
  callbacks.delete(el);
  if (sharedObserver) sharedObserver.unobserve(el);
}
