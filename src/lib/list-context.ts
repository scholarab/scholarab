// What list the student was looking at when they opened a listing.
//
// The detail page's ‹ › arrows and its "LISTING 3 OF 153" walked the order the
// JSON happens to be in, not the directory's default sort, and certainly not
// whatever the reader had filtered to. Someone who narrowed to Medicine Hat
// and clicked the second card landed on "LISTING 87 OF 153" with arrows into
// two listings they had just filtered away. The position was a claim about a
// list nobody had seen.
//
// The directory writes what is actually on screen here; the detail page reads
// it back. sessionStorage, so it dies with the tab rather than outliving the
// browse it describes.

export const LIST_CONTEXT_KEY = 'scholarab_list_context';

export interface ListContext {
  /** Detail-page paths, in the order the reader saw them. */
  paths: string[];
  /** Whether a filter, search or non-default sort produced this order. */
  filtered: boolean;
}

export function writeListContext(ctx: ListContext): void {
  try {
    sessionStorage.setItem(LIST_CONTEXT_KEY, JSON.stringify(ctx));
  } catch {
    // Private mode, or a full quota. The arrows stay hidden; nothing breaks.
  }
}

export function readListContext(): ListContext | null {
  try {
    const raw = sessionStorage.getItem(LIST_CONTEXT_KEY);
    if (!raw) return null;
    const ctx = JSON.parse(raw) as ListContext;
    return Array.isArray(ctx?.paths) && ctx.paths.length > 0 ? ctx : null;
  } catch {
    return null;
  }
}

export interface ListPlace {
  index: number;      // 0-based
  total: number;
  prev: string;
  next: string;
  label: string;
}

/**
 * Where `path` sits in the remembered list, or null if it is not in it;
 * arriving from search, a guide, /saved or a shared link, where there is no
 * list to be third of and the switcher should not appear at all.
 *
 * Wraps at both ends, as the old build-order switcher did: a list you can walk
 * off the end of needs a disabled state, and there is nothing to disable when
 * every list is a loop.
 */
export function placeInList(ctx: ListContext | null, path: string): ListPlace | null {
  if (!ctx) return null;
  const norm = (p: string) => (p.endsWith('/') ? p : `${p}/`);
  const paths = ctx.paths.map(norm);
  const index = paths.indexOf(norm(path));
  if (index === -1) return null;
  const total = paths.length;
  return {
    index,
    total,
    prev: paths[(index - 1 + total) % total]!,
    next: paths[(index + 1) % total]!,
    label: `${ctx.filtered ? 'FILTERED · ' : ''}${index + 1} OF ${total}`,
  };
}
