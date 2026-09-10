import { stableJson, validateCatalogue, type CatalogueKind, type Document } from './catalogue';
type Stored = {
  kind: CatalogueKind;
  public_id: number;
  published: Document | null;
  draft: Document | null;
};
export function planCatalogueSync(
  data: Record<CatalogueKind, Document[]>,
  stored: Stored[],
  prune: boolean
) {
  const upserts: { kind: CatalogueKind; public_id: number; document: Document }[] = [];
  const removals: { kind: CatalogueKind; public_id: number }[] = [];
  for (const kind of ['scholarship', 'program'] as const) {
    const documents = validateCatalogue(data[kind], kind);
    const previous = new Map(stored.filter((r) => r.kind === kind).map((r) => [r.public_id, r]));
    const ids = new Set(documents.map((d) => d.id));
    const missing = [...previous.values()].filter((r) => r.published && !ids.has(r.public_id));
    // A truncated-but-valid JSON file is still not authority to bulk-delete.
    if (prune && missing.length > Math.max(5, previous.size * 0.1))
      throw new Error(`${kind}: large removal requires a separately reviewed migration`);
    for (const document of documents) {
      const prior = previous.get(document.id);
      if (
        prior &&
        !prior.published &&
        prior.draft &&
        stableJson(prior.draft) !== stableJson(document)
      )
        throw new Error(`${kind} ${document.id}: JSON addition collides with an unpublished draft`);
      if (stableJson(previous.get(document.id)?.published) !== stableJson(document))
        upserts.push({ kind, public_id: document.id, document });
    }
    if (prune)
      removals.push(
        ...missing.filter((r) => !r.draft).map((r) => ({ kind, public_id: r.public_id }))
      );
  }
  return { upserts, removals };
}
