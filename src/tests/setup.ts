// Stub sendBeacon so sendEvent() short-circuits in tests instead of falling
// back to fetch, which happy-dom would actually attempt against localhost.
Object.defineProperty(navigator, 'sendBeacon', {
  value: () => true,
  writable: true,
  configurable: true,
})
