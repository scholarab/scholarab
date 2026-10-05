import { STARTER_PACK_IDS, STARTER_PACK_KEY } from './starter-pack.ts';

/** Coerce legacy string ids to numbers, dedupe, drop garbage (matches numeric ids in JSON). */
function normalizeIdList(raw: unknown[]): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  const seen = new Set<number>();
  for (const v of raw) {
    const n =
      typeof v === 'number' && Number.isFinite(v)
        ? v
        : typeof v === 'string' && /^\d+$/.test(String(v).trim())
          ? Number(String(v).trim())
          : NaN;
    if (!Number.isFinite(n) || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function makeTracker(key: string) {
  let cache: number[] | null = null;

  // Invalidate the in-memory cache when another tab writes to localStorage
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === key) cache = null;
    });
  }

  /** A copy: `toggle` mutates the cached array in place, so handing the live
   *  one to callers lets any of them corrupt it from the outside. */
  function get(): number[] {
    return [...read()];
  }

  function read(): number[] {
    if (cache === null) {
      try {
        const raw = JSON.parse(localStorage.getItem(key) || '[]') as unknown[];
        cache = normalizeIdList(raw);
        if (JSON.stringify(raw) !== JSON.stringify(cache)) {
          localStorage.setItem(key, JSON.stringify(cache));
        }
      } catch {
        cache = [];
      }
    }
    return cache;
  }

  function toggle(id: number): number[] {
    const saved = read();
    const idx = saved.findIndex((s) => s === id);
    if (idx > -1) saved.splice(idx, 1);
    else saved.push(id);
    localStorage.setItem(key, JSON.stringify(saved));
    // The header's Saved counter listens; `storage` only fires in other tabs.
    window.dispatchEvent(new CustomEvent('sab:saved'));
    return [...saved];
  }

  /** Add ids once per device, marked by `flag`: a student who removes one
   *  later does not get it back. Sends no save event, since nobody chose it. */
  function seed(ids: readonly number[], flag: string): void {
    try {
      if (localStorage.getItem(flag)) return;
      const saved = read();
      const fresh = ids.filter(id => !saved.includes(id));
      saved.push(...fresh);
      localStorage.setItem(key, JSON.stringify(saved));
      localStorage.setItem(flag, '1');
      if (fresh.length) window.dispatchEvent(new CustomEvent('sab:saved'));
    } catch { /* storage blocked: nothing to keep it in */ }
  }

  return { get, toggle, seed };
}

const scholarshipTracker = makeTracker('scholarab_saved');
const programTracker     = makeTracker('scholarab_saved_programs');

export const getSaved           = (): number[] => scholarshipTracker.get();
export const toggleSaved        = (id: number): number[] => scholarshipTracker.toggle(id);
export const getSavedPrograms   = (): number[] => programTracker.get();
export const toggleSavedProgram = (id: number): number[] => programTracker.toggle(id);
/** The starter pack (starter-pack.ts), into My combo once per device. */
export const seedStarterPack    = (): void => scholarshipTracker.seed(STARTER_PACK_IDS, STARTER_PACK_KEY);
