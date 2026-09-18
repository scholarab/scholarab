/** A fresh document, or a return from the browser's back/forward cache. */
export function onPageLoad(init: () => void) {
  init();
  window.addEventListener('pageshow', event => { if (event.persisted) init(); });
}
