/** Validation and fingerprint of the committed JSON catalogue. IDs are public JSON IDs. */
export type CatalogueKind = 'scholarship' | 'program';
export type Document = Record<string, unknown> & { id: number };
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
/** Fingerprint the complete published JSON without building a second quiz catalogue. */
export async function catalogueHash(snapshot: { scholarship: unknown[]; program: unknown[] }): Promise<string> {
  const bytes = new TextEncoder().encode(stableJson(snapshot));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
