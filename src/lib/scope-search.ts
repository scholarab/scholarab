// A search for a place opens that place's hub.
//
// Typing "Calgary" or "national" into the home page search used to land on the
// full directory filtered by text, which matches every award that merely
// mentions the word. The hub is the page that lists what that scope actually
// has (Ilia, 2026-09-29). The map is built at build time from the facets, so
// the client never ships facets.ts and its prose.
import { normalizeSearchQuery } from './search-text';
import type { Facet } from './facets';

/** Other words a student uses for the two broad scopes. */
const SCOPE_ALIASES: Record<string, string[]> = {
  alberta: ['alberta', 'ab', 'provincial', 'province wide', 'all of alberta'],
  national: ['canada', 'canada wide', 'canadian', 'nationwide', 'across canada', 'international'],
  edmonton: ['strathcona county'],
  'fort-mcmurray': ['wood buffalo', 'fort mac'],
};

/** Words that say nothing about the place: "scholarships in Red Deer" is "red deer". */
const FILLER = new Set(['scholarship', 'scholarships', 'bursary', 'bursaries', 'award', 'awards', 'in', 'for', 'students', 'student']);

function scopeKey(input: string): string {
  return normalizeSearchQuery(input).split(' ').filter(w => !FILLER.has(w)).join(' ');
}

/** Search phrase to hub URL, for the region facets that have a page. */
export function scopeSearchMap(facets: Facet[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of facets) {
    if (f.kind !== 'region') continue;
    const href = `/scholarships/${f.slug}/`;
    for (const name of [f.label, f.value, f.slug.replace(/-/g, ' '), ...(f.members ?? []), ...(SCOPE_ALIASES[f.slug] ?? [])]) {
      const key = scopeKey(name);
      if (key) map[key] = href;
    }
  }
  return map;
}

/** The hub a query names, or null when it is an ordinary search. */
export function scopeHubForQuery(query: string, map: Record<string, string>): string | null {
  const key = scopeKey(query);
  return key ? map[key] ?? null : null;
}

/** Send a search form to the hub when its query names a scope. */
export function wireScopeSearch(form: HTMLFormElement): void {
  let map: Record<string, string>;
  try { map = JSON.parse(form.dataset.scopeHubs ?? '{}'); } catch { return; }
  form.addEventListener('submit', e => {
    const q = form.querySelector<HTMLInputElement>('input[name="q"]')?.value ?? '';
    const hub = scopeHubForQuery(q, map);
    if (!hub) return;
    e.preventDefault();
    location.assign(hub);
  });
}
