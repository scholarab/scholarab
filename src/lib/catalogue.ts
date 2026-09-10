/** Shared, environment-independent publication model. IDs are public JSON IDs. */
export type CatalogueKind = 'scholarship' | 'program';
export type Document = Record<string, unknown> & { id: number };
export interface CatalogueEntry {
  kind: CatalogueKind;
  publicId: number;
  published: Document | null;
  draft: Document | null;
  draftBase: Document | null;
  deleted: boolean;
  revision: number;
  updatedAt: Date | string;
}
export interface PublicationChange {
  kind: CatalogueKind;
  publicId: number;
  base: Document | null;
  value: Document | null;
  revision: number;
}
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ':' + stableJson(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value ?? null);
}
export function validateCatalogue(raw: unknown, kind: CatalogueKind): Document[] {
  if (!Array.isArray(raw) || !raw.length)
    throw new Error(`${kind}: refusing empty or invalid catalogue`);
  const ids = new Set<number>();
  return raw.map((row) => {
    if (
      !row ||
      typeof row !== 'object' ||
      !Number.isSafeInteger(row.id) ||
      row.id < 1 ||
      ids.has(row.id)
    )
      throw new Error(`${kind}: invalid or duplicate public ID`);
    const name = kind === 'scholarship' ? row.title : row.name;
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof row.url !== 'string' ||
      !/^https?:\/\//.test(row.url)
    )
      throw new Error(`${kind} ${row.id}: missing name or HTTP(S) URL`);
    try {
      const parsed = new URL(row.url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      throw new Error(`${kind} ${row.id}: invalid provider URL`);
    }
    if ('open_date' in row) throw new Error(`${kind} ${row.id}: use openDate`);
    ids.add(row.id);
    return row as Document;
  });
}
export function entryView(
  entry: CatalogueEntry
): Document & { revision: number; updatedAt: string; unpublished: boolean } {
  return {
    ...(entry.draft ?? entry.published ?? { id: entry.publicId }),
    id: entry.publicId,
    revision: entry.revision,
    updatedAt: new Date(entry.updatedAt).toISOString(),
    unpublished: entry.draft !== null || entry.deleted,
  };
}
/** Three-way field merge: concurrent independent JSON edits survive; conflicting
 * fields stop publication. Public deletions require an unchanged baseline. */
export function applyPublication(
  current: Document[],
  changes: PublicationChange[],
  kind: CatalogueKind
): Document[] {
  const rows = new Map(current.map((row) => [row.id, row]));
  for (const c of changes.filter((c) => c.kind === kind)) {
    const now = rows.get(c.publicId) ?? null;
    if (stableJson(now) === stableJson(c.value)) continue; // rerun after commit/push
    if (!c.base) {
      if (now) throw new Error(`${kind} ${c.publicId}: ID already exists`);
      if (c.value) rows.set(c.publicId, c.value);
      continue;
    }
    if (!now) throw new Error(`${kind} ${c.publicId}: removed since editing began`);
    if (!c.value) {
      if (stableJson(now) !== stableJson(c.base))
        throw new Error(`${kind} ${c.publicId}: deletion conflicts with newer changes`);
      rows.delete(c.publicId);
      continue;
    }
    const merged = { ...now };
    for (const key of new Set([...Object.keys(c.base), ...Object.keys(c.value)])) {
      if (stableJson(c.base[key]) === stableJson(c.value[key])) continue;
      if (
        stableJson(now[key]) !== stableJson(c.base[key]) &&
        stableJson(now[key]) !== stableJson(c.value[key])
      )
        throw new Error(`${kind} ${c.publicId}: ${key} changed since editing began`);
      if (key in c.value) merged[key] = c.value[key];
      else delete merged[key];
    }
    rows.set(c.publicId, merged);
  }
  return validateCatalogue([...rows.values()], kind);
}
