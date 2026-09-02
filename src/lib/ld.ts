// Shared JSON-LD builders.
//
// The directories emitted CollectionPage with a `hasPart` of the first ten
// listings, which describes the page as a thing that has parts but never says
// the parts are an ordered list. ItemList is the type for what these pages
// actually are, and it is the one a facet hub will want too, so it lives here
// rather than being written twice.
//
// No imports: this is called from .astro frontmatter and from build scripts,
// and the build scripts run under a plain tsc that must not pull in
// data-loader's `import.meta.env`. Same reasoning as status.ts.

export interface LdListItem {
  name: string;
  url: string;
}

/**
 * Cap on how many entries an emitted ItemList carries. The directories already
 * ship 256-260 KB of HTML because every listing is server-rendered; repeating
 * all 153 of them inside a script tag would add weight for no crawl benefit,
 * since the links themselves are already in the markup. Fifty is enough to
 * establish the list and its order.
 */
export const ITEM_LIST_CAP = 50;

/** The site's canonical origin. Duplicated rather than imported; see the note
 * at the top of this file about why nothing here has imports. Kept in step
 * with CANONICAL_ORIGIN in site-origin.ts and `site` in astro.config.mjs. */
const ORIGIN = 'https://www.scholarab.ca';

/**
 * WebPage + BreadcrumbList for the standing pages that carry neither.
 *
 * /privacy/, /terms/, /educators/, /about/ and /updates/ were the only
 * indexable pages on the site emitting no structured data at all, and the only
 * ones missing a breadcrumb trail. They are two levels deep, so the trail is
 * always the site root plus the page itself.
 *
 * `isPartOf` points at the WebSite node declared on the homepage, which ties
 * these pages to the same entity rather than leaving five unattached WebPages.
 * `extra` takes any further nodes the page wants in the same graph; /about/
 * uses it to describe the founder.
 */
export function webPageJson(
  page: { name: string; description: string; path: string },
  extra: Record<string, unknown>[] = [],
) {
  const url = `${ORIGIN}${page.path}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url,
        url,
        name: page.name,
        description: page.description,
        isPartOf: { '@id': `${ORIGIN}/#website` },
        inLanguage: 'en-CA',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ScholarAB', item: ORIGIN },
          { '@type': 'ListItem', position: 2, name: page.name, item: url },
        ],
      },
      ...extra,
    ],
  };
}

/**
 * `numberOfItems` is the true total, not the truncated length: it describes the
 * list, and the list really does have that many items. `itemListElement` is the
 * sample. Saying 50 when the page shows 153 would be the markup contradicting
 * the page.
 */
export function itemListJson(items: LdListItem[], name: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    url,
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: items.slice(0, ITEM_LIST_CAP).map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: it.url,
      name: it.name,
    })),
  };
}
