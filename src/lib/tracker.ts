let _saved: number[] | null = null;
let _savedPrograms: number[] | null = null;

// Invalidate in-memory caches when another tab writes to localStorage
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === 'scholarab_saved')          _saved = null;
    if (e.key === 'scholarab_saved_programs') _savedPrograms = null;
  });
}

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

export function getSaved(): number[] {
  if (_saved === null) {
    try {
      const raw = JSON.parse(localStorage.getItem('scholarab_saved') || '[]') as unknown[];
      _saved = normalizeIdList(raw);
      if (JSON.stringify(raw) !== JSON.stringify(_saved)) {
        localStorage.setItem('scholarab_saved', JSON.stringify(_saved));
      }
    } catch {
      _saved = [];
    }
  }
  return _saved;
}

export function toggleSaved(id: number): number[] {
  const saved = getSaved();
  const idx = saved.findIndex((s) => s === id);
  if (idx > -1) saved.splice(idx, 1);
  else saved.push(id);
  localStorage.setItem('scholarab_saved', JSON.stringify(saved));
  return saved;
}

export function getSavedPrograms(): number[] {
  if (_savedPrograms === null) {
    const raw = JSON.parse(localStorage.getItem('scholarab_saved_programs') || '[]') as unknown[];
    _savedPrograms = normalizeIdList(raw);
    if (JSON.stringify(raw) !== JSON.stringify(_savedPrograms)) {
      localStorage.setItem('scholarab_saved_programs', JSON.stringify(_savedPrograms));
    }
  }
  return _savedPrograms;
}

export function toggleSavedProgram(id: number): number[] {
  const saved = getSavedPrograms();
  const idx = saved.findIndex((s) => s === id);
  if (idx > -1) saved.splice(idx, 1);
  else saved.push(id);
  localStorage.setItem('scholarab_saved_programs', JSON.stringify(saved));
  return saved;
}
