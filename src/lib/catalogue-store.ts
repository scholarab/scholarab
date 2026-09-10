import { and, desc, eq, sql, count, isNotNull } from 'drizzle-orm';
import { db } from './db/client';
import { catalogueEntries as entries } from './db/schema';
import { entryView, type CatalogueKind } from './catalogue';
import { ADMIN_PAGE_SIZE as PAGE_SIZE } from './constants';
export { PAGE_SIZE };
export async function getCatalogueEntry(kind: CatalogueKind, id: number) {
  const [row] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.kind, kind), eq(entries.publicId, id)));
  return row;
}
export async function listCatalogue(kind: CatalogueKind, page = 0, search = '', facet = 'All') {
  const document = sql`coalesce(${entries.draft}, ${entries.published})`;
  const title = kind === 'scholarship' ? sql`${document}->>'title'` : sql`${document}->>'name'`;
  const category =
    kind === 'scholarship' ? sql`${document}->>'region'` : sql`${document}->>'category'`;
  const base = and(eq(entries.kind, kind), eq(entries.deleted, false), isNotNull(document));
  const conditions = and(
    base,
    search ? sql`${title} ilike ${'%' + search.replace(/([\\%_])/g, '\\$1') + '%'}` : undefined,
    facet === 'All'
      ? undefined
      : facet.startsWith('No ')
        ? sql`coalesce(${category}, '') = ''`
        : sql`${category} = ${facet}`
  );
  const [rows, totals, facets] = await Promise.all([
    db
      .select()
      .from(entries)
      .where(conditions)
      .orderBy(desc(entries.updatedAt), desc(entries.publicId))
      .limit(PAGE_SIZE)
      .offset(page * PAGE_SIZE),
    db.select({ n: count() }).from(entries).where(conditions),
    db
      .select({ value: sql<string>`coalesce(${category}, '')`, n: count() })
      .from(entries)
      .where(base)
      .groupBy(category),
  ]);
  const counts: Record<string, number> = { All: 0 };
  for (const f of facets) {
    counts[f.value || (kind === 'scholarship' ? 'No region' : 'No category')] = f.n;
    counts.All! += f.n;
  }
  return {
    items: rows.map(entryView),
    total: totals[0]?.n ?? 0,
    counts,
    page,
    pageSize: PAGE_SIZE,
  };
}
