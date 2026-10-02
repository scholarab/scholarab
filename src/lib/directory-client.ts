// Vanilla controller for the public directory pages (/scholarships, /programs).
// The page ships fully server-rendered cards; this module only shows/hides and
// reorders existing DOM nodes, replicating what the old React islands did.
import { sendEvent } from './events.ts';
import { normalizeSearchQuery, tokenIndexMayMatch, correctQuery, searchTokens, searchRows } from './search-text.ts';
import { writeListContext } from './list-context.ts';
import { showConfetti } from './utils.ts';
import { DIRECTORY_PAGE_SIZE, showingLine } from './list-core.ts';

export interface DirectoryItem {
  el: HTMLElement;
  id: number;
  name: string;
  /** Lowercased searchable fields joined with \n (queries can't contain \n). */
  search: string;
}

// Selection receives the search-matched pool; counts need membership, not order.
export interface DirectoryConfig<T extends DirectoryItem, S extends Record<string, string>, C = unknown> {
  /** What these cards are; the `save` event needs it to name the item. */
  itemType: 'scholarship' | 'program';
  defaultState: S;
  /**
   * Derived once per render and handed to every select()/countFor() call in it.
   *
   * The scholarship list returns a status-per-id map: classifying a row costs
   * two date comparisons, and a counted row asks for the whole corpus once per
   * chip. Without this, one keystroke rebuilt that map eighteen times.
   */
  renderContext?(items: T[]): C;
  parseCard(el: HTMLElement): T;
  /** Visible items in display order; items already match the normalized query. */
  select(items: T[], state: S, ctx: C): T[];
  /**
   * How many items a state would leave visible, when that can be answered more
   * cheaply than by building the list. Chip counts use it; they need the size
   * of the set and never its order, so sorting for them is work thrown away.
   */
  countFor(items: T[], state: S, ctx: C, key?: string): number;
  /**
   * Count, headline, its label, and a second, quieter figure beside it.
   * An empty secondary figure hides the line.
   *
   * The scholarship stat counts only money open today, so a cycle that has not
   * opened yet contributes nothing: 33 Calgary awards landed in August 2026 and
   * the header did not move, because they open in March 2027. This says what is
   * waiting rather than letting the page look flat.
   */
  summary(visible: T[], total: number): Record<string, string>;
  /** Labelled seams between runs in the grid. `key` must be the sort's primary
   *  key, or one group would be split across two headers. */
  groups?: {
    key(item: T): string;
    label(key: string): string;
    /** Runs shut on every load, heading and count still showing (critique
     *  2026-09-25: the scholarship list opened on closed and unconfirmed
     *  awards). The server marks their cards data-dir-shut to match. */
    shut?: string[];
  };
  getSavedIds(): number[];
  toggleSave(id: number): number[];
  saveLabel(name: string, saved: boolean): string;
  /**
   * Counts that are not filter chips, recomputed with them on every render.
   * The scholarship SCOPE row is links to hubs, not buttons, so the chip loop
   * never reached it and it kept the whole-corpus figure under every filter.
   */
  afterCounts?(root: HTMLElement, searched: T[], state: S, query: string, ctx: C): void;
  /** Runs after cards are (re)parsed on every astro:page-load; e.g. recompute day chips. */
  onCardsParsed?(items: T[]): void;
  /** Cards shown before "Show more"; DIRECTORY_PAGE_SIZE unless a test says otherwise. */
  pageSize?: number;
}

/** Where a reader was when they left the list for a listing, so Back lands there. */
const SCROLL_KEY = 'sab:dir-scroll';

/**
 * The wide layout: TRACK and STATUS put away, cards across the whole
 * page (Ilia, 2026-09-15). Kept on <html> rather than in this module, because
 * the inline script in Layout.astro reads the same key before the first paint
 * so the page never renders one layout and then the other. Unlike a shut
 * status section this IS persisted: it is a standing preference about how much
 * of the page a reader wants, not a thing they did to one list.
 */
const LEAN_KEY = 'sa_lean';

function setLean(on: boolean) {
  const root = document.documentElement;
  if (on) root.setAttribute('data-lean', '');
  else root.removeAttribute('data-lean');
  try {
    if (on) localStorage.setItem(LEAN_KEY, '1');
    else localStorage.removeItem(LEAN_KEY);
  } catch { /* storage blocked: the choice holds for this page only */ }
  for (const btn of document.querySelectorAll<HTMLElement>('[data-dir-lean]')) {
    btn.setAttribute('aria-pressed', String(on));
    const word = btn.querySelector('[data-dir-lean-word]');
    if (word) word.textContent = on ? 'Show filters' : 'Hide filters';
  }
}

/**
 * The phone layout: filters and sort fold behind one "Filters" button, so the
 * first card is on the first screen instead of under 38 chips. Not persisted
 * and separate from lean mode, which is a desktop preference about a column;
 * this is a disclosure a reader opens, uses and forgets.
 */
const NARROW = '(max-width: 900px)';

function setFiltersOpen(open: boolean) {
  const root = document.documentElement;
  const was = root.hasAttribute('data-filters');
  if (open) root.setAttribute('data-filters', '');
  else root.removeAttribute('data-filters');
  for (const btn of document.querySelectorAll<HTMLElement>('[data-dir-filters]')) {
    btn.setAttribute('aria-expanded', String(open));
  }
  // On a phone the panel is a sheet over the page (global.css), so focus
  // goes into it and stays there (the rest of the directory is inert while it
  // is up), then comes back to the button that opened it.
  if (open === was) return;
  const narrow = matchMedia(NARROW).matches;
  // The header and footer too: a screen reader's cursor walked out of the
  // sheet into them. And the sheet says what it is while it is one.
  for (const el of document.querySelectorAll<HTMLElement>('.sabl-head, .sabl-col, .sabh, .sabf-footer')) el.inert = open && narrow;
  const rail = document.querySelector<HTMLElement>('.sabl-rail');
  if (open && narrow) { rail?.setAttribute('role', 'dialog'); rail?.setAttribute('aria-modal', 'true'); }
  else { rail?.removeAttribute('role'); rail?.removeAttribute('aria-modal'); }
  if (!narrow) return;
  // The first picker, not the sheet's Clear filters above it: opening the
  // sheet is for choosing, and Clear sits one Shift+Tab away.
  if (open) (rail?.querySelector<HTMLElement>('select') ?? rail?.querySelector<HTMLElement>('button, a[href]'))?.focus({ preventScroll: true });
  else if (!document.activeElement || rail?.contains(document.activeElement)) {
    document.querySelector<HTMLElement>('[data-dir-filters]')?.focus({ preventScroll: true });
  }
}

interface SearchIndex { s: string[]; p: string[] }

/**
 * Every word in either directory, fetched once per page and only after a
 * search has already come up empty.
 *
 * A directory page holds a slice of the corpus (see the facet hubs), so
 * "nothing matches" on the page in front of you says nothing about the site.
 * Until this existed the empty state offered "try clearing a filter" for a
 * term whose sixteen matches were on another page, and logged the term as a
 * content gap on the way past.
 */
let indexPromise: Promise<SearchIndex | null> | null = null;

function loadSearchIndex(): Promise<SearchIndex | null> {
  indexPromise ??= fetch('/search-index.json')
    .then(r => (r.ok ? r.json() : null))
    .then((j: unknown) => {
      const i = j as SearchIndex | null;
      return i && Array.isArray(i.s) && Array.isArray(i.p) ? i : null;
    })
    // An unreachable index must not turn into a broken empty state; the
    // caller falls back to the generic copy.
    .catch(() => null);
  return indexPromise;
}

export function initDirectory<T extends DirectoryItem, S extends Record<string, string>, C = unknown>(
  rootSelector: string,
  config: DirectoryConfig<T, S, C>,
) {
  let root: HTMLElement | null = null;
  let items: T[] = [];
  let state: S = { ...config.defaultState };
  let query = '';
  let visible: T[] = [];
  let emptyTimer: ReturnType<typeof setTimeout> | undefined;
  // The list reveals in steps rather than all at once: every match is still
  // counted, searched, summed and handed to the detail arrows (`visible`), but
  // only the first `shown` are on screen. Any change to what matches starts the
  // count over; only the buttons raise it.
  // Per page: a city hub's list asks for a shorter first step (data-dir-step).
  let pageSize = config.pageSize ?? DIRECTORY_PAGE_SIZE;
  let shown = pageSize;
  let pool: T[] = [];
  // Every word on this page's listings, built on the first search that finds
  // nothing, for correctQuery.
  let pageVocab: Set<string> | undefined;
  let page: T[] = [];

  function setSaveState(btn: HTMLElement, saved: boolean) {
    // The drawn bookmark carries the state through `.on` (CSS fills it), so
    // there is no glyph to swap. A button that has no icon still gets the two
    // characters, which is what the admin list and any future caller use.
    btn.classList.toggle('on', saved);
    if (!btn.querySelector('svg')) btn.textContent = saved ? '★' : '☆';
    const label = btn.querySelector('[data-save-label]');
    if (label) label.textContent = saved ? 'Saved' : 'Save';
    btn.setAttribute('aria-pressed', String(saved));
    btn.setAttribute('aria-label', config.saveLabel(btn.closest('[data-dir-card]')?.querySelector('.sabl-name')?.textContent ?? '', saved));
  }

  function paintSaved() {
    if (!root) return;
    const saved = new Set(config.getSavedIds());
    root.querySelectorAll<HTMLElement>('[data-dir-save]').forEach(btn => {
      setSaveState(btn, saved.has(Number(btn.closest<HTMLElement>('[data-dir-card]')?.dataset.id)));
    });
  }

  // Cached so the same header node is reused across renders instead of being
  // rebuilt; the server already shipped one per group, and reusing it keeps
  // the no-JS render and the hydrated render byte-identical.
  const headers = new Map<string, HTMLElement>();

  /**
   * Group keys the reader has shut (Ilia, 2026-09-15: "so you can close them
   * like columns"). A shut run keeps its heading and its count -- the count is
   * of every match, not of what is on screen -- and drops its cards.
   *
   * Deliberately not persisted. It resets on every load, so a reader who shuts
   * CLOSED and comes back a week later does not find a page that is quietly
   * hiding a third of itself with no memory of having been told to.
   */
  const collapsed = new Set<string>();
  /** Has the reader clicked a heading this load? Until they do, the shut
   *  runs are the config's default, recomputed for every result: a filter or
   *  search whose every match sits in a shut run (?status=closed) opens those
   *  runs, instead of answering with headings over an empty page. */
  let readerShut = false;

  const CARET = '<svg class="sabl-group-caret" viewBox="0 0 12 8" width="12" height="8" fill="none"><path d="M1 1.5 6 6.5 11 1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function headerFor(key: string, count: number): HTMLElement {
    let el = headers.get(key);
    if (!el) {
      el = root?.querySelector<HTMLElement>(`[data-dir-group="${key}"]`) ?? undefined;
      if (!el) {
        // A heading holding the toggle, so heading navigation lands on the
        // sections and the 1,500 rows under them are a level down.
        el = document.createElement('h2');
        el.className = 'sabl-group-h';
        el.dataset.dirGroup = key;
        el.innerHTML = '<button type="button" class="sabl-group"><span class="sabl-group-name"><span class="sabl-group-label"></span><span class="sabl-group-count"></span></span>'
          + `<span class="sabl-group-toggle" aria-hidden="true"><span data-dir-group-word></span>${CARET}</span></button>`;
      }
      headers.set(key, el);
    }
    el.hidden = false;
    const open = !collapsed.has(key);
    (el.querySelector('.sabl-group') ?? el).setAttribute('aria-expanded', String(open));
    const word = el.querySelector('[data-dir-group-word]');
    if (word) word.textContent = open ? 'Hide' : 'Show';
    el.querySelector('.sabl-group-label')!.textContent = config.groups!.label(key);
    el.querySelector('.sabl-group-count')!.textContent = count.toLocaleString('en-CA');
    return el;
  }

  /** Is this list split into headed sections at all? One group is no grouping:
   *  a lone "OPEN NOW" bar over the whole grid is a label with nothing to
   *  distinguish it from, and there would be nothing to fold it away from. */
  function isGrouped(all: T[]): boolean {
    const g = config.groups;
    return !!g && new Set(all.map(v => g.key(v))).size >= 2;
  }

  /**
   * The on-screen cards with a header node spliced in ahead of each run.
   * Grouping and the header counts come from every match, not just the cards
   * revealed so far: "CLOSING LATER 90" stays 90 while only six are showing.
   *
   * A run gets a heading once one of its cards is on screen, or once it is
   * shut: a shut run has no cards left to announce it, and without its heading
   * there would be no way to open it again. A run the reader has not paged
   * down to yet still gets nothing.
   */
  function withGroupHeaders(page: T[], all: T[]): HTMLElement[] {
    const g = config.groups;
    if (!g || !isGrouped(all)) return page.map(v => v.el);

    const counts = new Map<string, number>();
    const order: string[] = [];
    for (const v of all) {
      const k = g.key(v);
      if (!counts.has(k)) order.push(k);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    const out: HTMLElement[] = [];
    for (const key of order) {
      const cards = page.filter(v => g.key(v) === key);
      if (!cards.length && !collapsed.has(key)) continue;
      out.push(headerFor(key, counts.get(key) ?? 0));
      for (const v of cards) out.push(v.el);
    }
    return out;
  }

  function render() {
    if (!root) return;
    if (emptyTimer) { clearTimeout(emptyTimer); emptyTimer = undefined; }

    const url = new URL(location.href);
    for (const [key, value] of Object.entries({ ...state, q: query })) {
      if (value && value !== config.defaultState[key]) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    // In the URL, so Back from a listing and a reload both come back to the
    // same number of cards instead of collapsing to the first 24.
    if (shown > pageSize) url.searchParams.set('show', String(shown));
    else url.searchParams.delete('show');
    if (url.href !== location.href) history.replaceState(history.state, '', url);

    // How many filters are on, for the folded phone button. Sort is an order,
    // not a filter, and it sits inside the same fold, so it does not count.
    const active = Object.keys(state).filter(k => k !== 'sort' && state[k] !== config.defaultState[k]).length;
    root.querySelectorAll<HTMLElement>('[data-dir-filter-n]').forEach(n => {
      n.textContent = String(active);
      n.hidden = active === 0;
    });
    root.querySelectorAll<HTMLElement>('[data-dir-reset]').forEach(b => { b.hidden = active === 0; });

    const q = query.trim();
    // Normalized the same way the cards' blobs were, so punctuation a student
    // omits (or adds) does not decide whether they find anything.
    const ql = normalizeSearchQuery(q);
    const ctx = config.renderContext?.(items) as C;
    let searched = ql ? searchRows(items, it => it.search, ql) : items;
    // Nothing as typed: try the words the student most likely meant, from
    // this page's own listings, and say so above the results rather than
    // quietly swapping the query.
    let meant: string | null = null;
    if (ql && searched.length === 0) {
      pageVocab ??= new Set(items.flatMap(it => searchTokens(it.search)));
      const c = correctQuery(ql, pageVocab);
      const found = c ? searchRows(items, it => it.search, c) : [];
      if (found.length > 0) { meant = c; searched = found; }
    }
    const note = root.querySelector<HTMLElement>('[data-dir-corrected]');
    if (note) {
      note.hidden = meant === null;
      note.textContent = meant === null ? '' : `No listing says "${q}". Showing results for "${meant}".`;
    }
    visible = config.select(searched, state, ctx);
    // A shut section's cards come off the page entirely, so they do not eat
    // the "Show more" budget either: shutting CLOSED on a 24-card step buys
    // twenty-four open ones rather than twenty-four fewer cards.
    const g = config.groups;
    if (g && !readerShut) {
      const shut = g.shut ?? [];
      collapsed.clear();
      if (visible.some(v => !shut.includes(g.key(v)))) for (const k of shut) collapsed.add(k);
    }
    pool = g && collapsed.size && isGrouped(visible)
      ? visible.filter(v => !collapsed.has(g.key(v)))
      : visible;
    page = pool.slice(0, shown);
    const grid = root.querySelector<HTMLElement>('[data-dir-grid]');
    if (grid) {
      const onScreen = new Set(page.map(v => v.el));
      for (const it of items) {
        const hidden = !onScreen.has(it.el);
        if (it.el.hidden !== hidden) it.el.hidden = hidden;
        // The server's pre-JS cut (see global.css); `hidden` owns it now.
        if (it.el.hasAttribute('data-dir-later')) it.el.removeAttribute('data-dir-later');
        if (it.el.hasAttribute('data-dir-shut')) it.el.removeAttribute('data-dir-shut');
      }
      for (const header of headers.values()) header.removeAttribute('data-dir-later');
      // Moving nodes already in order causes relayout without a visual change.
      // The server supplies the default order, and query-only filtering preserves
      // it, so compare node identities and move only the misplaced survivors.
      // Keep hidden cards in the document; move only misplaced visible nodes.
      for (const header of headers.values()) header.hidden = true;
      const want = withGroupHeaders(page, visible);
      const moreEl = root.querySelector<HTMLElement>('[data-dir-more]');
      let cursor = grid.firstElementChild;
      for (const node of want) {
        while (cursor && ((cursor as HTMLElement).hidden || cursor === moreEl)) cursor = cursor.nextElementSibling;
        if (node !== cursor) grid.insertBefore(node, cursor);
        else cursor = cursor.nextElementSibling;
      }
      // "Show more" goes straight under the last card it extends, above the
      // shut sections after it: below the grid it sat under CLOSED and three
      // other headers, a screen away from its list (critique 2026-09-26).
      const lastCard = page.at(-1)?.el;
      if (moreEl && lastCard && lastCard.nextElementSibling !== moreEl) grid.insertBefore(moreEl, lastCard.nextElementSibling);
      grid.hidden = visible.length === 0;
    }

    const more = root.querySelector<HTMLElement>('[data-dir-more]');
    if (more) {
      const remaining = pool.length - page.length;
      more.hidden = remaining <= 0;
      const line = more.querySelector<HTMLElement>('[data-dir-more-line]');
      if (line) line.textContent = showingLine(page, pool, g && (v => g.key(v)), g && (k => g.label(k)));
      const btn = more.querySelector<HTMLElement>('[data-dir-more-btn]');
      if (btn) btn.textContent = `Show ${Math.min(pageSize, remaining)} more`;
      // "Show all" only earns its place when it does something the other
      // button would not do in one press. No number: beside "Showing 13 of
      // 126" and "Show 24 more", a third count (the whole pool, 137) read as
      // a contradiction (critique 2026-09-27).
      const all = more.querySelector<HTMLElement>('[data-dir-all]');
      if (all) { all.hidden = remaining <= pageSize; all.textContent = 'Show all'; }
    }

    for (const [key, text] of Object.entries(config.summary(visible, items.length))) {
      const slot = root.querySelector<HTMLElement>(`[data-dir-${key}]`);
      if (slot) {
        slot.textContent = text;
        if (key === 'stat-soon') slot.hidden = text === '';
      }
    }

    root.querySelectorAll<HTMLSelectElement>('select[data-fselect]').forEach(sel => {
      sel.value = String(state[sel.dataset.fselect!] ?? '');
    });
    root.querySelectorAll<HTMLOptionElement>('option[data-filter-label]').forEach(option => {
      const key = option.closest<HTMLSelectElement>('select')!.dataset.fselect!;
      const next = { ...state, [key]: option.value };
      const count = config.countFor(searched, next, ctx, key);
      option.textContent = `${option.dataset.filterLabel} (${count.toLocaleString('en-CA')})`;
    });
    config.afterCounts?.(root, searched, state, q, ctx);
    root.querySelectorAll<HTMLElement>('[data-dir-filters-done]').forEach(b => {
      b.textContent = visible.length === 0 ? 'No results. Change a filter'
        : `Show ${visible.length.toLocaleString('en-CA')} result${visible.length === 1 ? '' : 's'}`;
    });

    const empty = root.querySelector<HTMLElement>('[data-dir-empty]');
    if (empty) empty.hidden = visible.length > 0;
    // Name what the button undoes. "Clear all filters" with no filter on,
    // after a search that found nothing, pointed at the wrong culprit.
    const clear = root.querySelector<HTMLElement>('[data-dir-clear]');
    if (clear) clear.textContent = active > 0 && q ? 'Clear search and filters' : active > 0 ? 'Clear filters' : 'Clear search';
    if (visible.length > 0 || q.length < 3) resetFallback();
    else resolveEmptySearch(q, ql, searchRows(items, it => it.search, ql).length > 0);
  }

  /** Put the empty state back to its generic copy. */
  function resetFallback() {
    const slot = root?.querySelector<HTMLElement>('[data-dir-elsewhere]');
    if (slot) { slot.hidden = true; slot.textContent = ''; }
    const sub = root?.querySelector<HTMLElement>('[data-dir-empty-sub]');
    if (sub) sub.hidden = false;
  }

  /**
   * Decide what "nothing matches" actually means, then say so.
   *
   * Three different situations used to share one message and one event:
   * the term exists on another page of this same directory (a facet slice),
   * it exists in the other directory, or the site really does not have it.
   * Only the third is a content gap, and only the third gets logged.
   */
  function resolveEmptySearch(q: string, ql: string, onThisPage: boolean) {
    const kind = config.itemType;
    void loadSearchIndex().then(index => {
      // Still the same query? A slow index must not overwrite a later render.
      if (!root || normalizeSearchQuery(query) !== ql) return;

      const own = index ? (kind === 'scholarship' ? index.s : index.p) : null;
      const other = index ? (kind === 'scholarship' ? index.p : index.s) : null;
      let here = own ? tokenIndexMayMatch(own, ql) : onThisPage;
      let there = other ? tokenIndexMayMatch(other, ql) : false;
      // Misspelled, and the right word is only on another page: offer the
      // corrected search there, and do not log a typo as a content gap.
      let term = q;
      if (!here && !there && own && other) {
        const mine = correctQuery(ql, own);
        const theirs = mine ? null : correctQuery(ql, other);
        if (mine) { here = true; term = mine; }
        else if (theirs) { there = true; term = theirs; }
      }

      const slot = root.querySelector<HTMLElement>('[data-dir-elsewhere]');
      const sub = root.querySelector<HTMLElement>('[data-dir-empty-sub]');
      if (slot) {
        // Own directory first: same page, same filters, just a wider slice.
        const target = here
          ? { href: kind === 'scholarship' ? '/scholarships/' : '/programs/', label: kind === 'scholarship' ? 'all scholarships' : 'all programs' }
          : there
            ? { href: kind === 'scholarship' ? '/programs/' : '/scholarships/', label: kind === 'scholarship' ? 'programs' : 'scholarships' }
            : null;
        slot.textContent = '';
        slot.hidden = target === null;
        if (target) {
          const a = document.createElement('a');
          a.className = 'sabl-empty-link';
          a.href = `${target.href}?q=${encodeURIComponent(term)}`;
          a.textContent = `Search ${target.label} for "${term}"`;
          slot.append(a);
        }
        // The generic "clear a filter" line is wrong whenever the match is on
        // another page: no filter on this one is hiding it.
        if (sub) sub.hidden = target !== null;
      }
      // A real gap: nowhere on the site, in either directory.
      if (!here && !there) {
        emptyTimer = setTimeout(
          () => sendEvent('search_empty', undefined, undefined, `${q} | ${location.pathname}`),
          1000,
        );
      }
    });
  }

  // Hand the detail pages the order the reader is actually looking at, so
  // their ‹ › arrows walk this list instead of the JSON's build order.
  // Both a card title and its Details button can open that same listing;
  // sponsor links must not be mistaken for detail navigation.
  // Pointer/context-menu activation must store context before a new tab copies it.
  for (const event of ['pointerdown', 'contextmenu', 'click']) document.addEventListener(event, e => {
    const link = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href]');
    const card = link?.closest<HTMLElement>('[data-dir-card]');
    const detail = card?.querySelector<HTMLAnchorElement>('.sabl-name');
    if (link && card && detail && root?.contains(card)
      && link.origin === detail.origin && link.pathname === detail.pathname) {
      // The router restores scroll before this page's cards are revealed, so a
      // position deep in a long list gets clamped to the first 24. Kept here
      // and re-applied once the list is back at full length.
      try {
        sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ url: location.pathname + location.search, y: scrollY }));
      } catch { /* storage blocked: Back lands a little higher, nothing breaks */ }
      writeListContext({ paths: pool.map(v => v.el.querySelector<HTMLAnchorElement>('.sabl-name')!.getAttribute('href')!), filtered: query.trim() !== '' || Object.keys(state).some(k => state[k] !== config.defaultState[k]) });
    }
  });

  document.addEventListener('click', e => {
    const t = e.target as Element | null;
    if (!root || !t?.closest || !root.contains(t)) return;

    // A tap on the scrim around the phone sheet puts the sheet away. The
    // scrim is the page's ::after, so a tap on it lands on .sabl-page itself;
    // a click a keyboard sends to a control behind the sheet still works.
    if (document.documentElement.hasAttribute('data-filters') && matchMedia(NARROW).matches
      && t.matches('.sabl-page')) {
      setFiltersOpen(false);
      return;
    }

    const save = t.closest<HTMLElement>('[data-dir-save]');
    if (save) {
      const id = Number(save.closest<HTMLElement>('[data-dir-card]')?.dataset.id);
      const next = config.toggleSave(id);
      const nowSaved = next.includes(id);
      setSaveState(save, nowSaved);
      // Only the save counts, not the un-save: the metric is "people who
      // shortlisted this", and sendEvent dedupes it per item per tab session.
      if (nowSaved) { showConfetti(save); sendEvent('save', config.itemType, id, 'row'); }
      return;
    }

    if (t.closest('[data-dir-filters]')) {
      setFiltersOpen(!document.documentElement.hasAttribute('data-filters'));
      return;
    }

    // The phone panel's way out: fold it and land on the list it just shaped.
    // Inline, the results changed about 1,000px below the chip being tapped.
    if (t.closest('[data-dir-filters-done]')) {
      setFiltersOpen(false);
      root.querySelector<HTMLElement>('[data-dir-grid], [data-dir-empty]:not([hidden])')
        ?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }

    const lean = t.closest<HTMLElement>('[data-dir-lean]');
    if (lean) {
      setLean(!document.documentElement.hasAttribute('data-lean'));
      return;
    }

    // A section heading is its own show/hide control: the whole bar toggles,
    // not just the word on the right of it.
    const group = t.closest<HTMLElement>('[data-dir-group]');
    if (group) {
      const key = group.dataset.dirGroup!;
      if (!collapsed.delete(key)) collapsed.add(key);
      readerShut = true;
      render();
      return;
    }

    const step = t.closest<HTMLElement>('[data-dir-more-btn], [data-dir-all]');
    if (step) {
      const before = Math.min(shown, visible.length);
      shown = step.matches('[data-dir-all]') ? Math.max(pageSize, visible.length) : shown + pageSize;
      render();
      // Once everything is out the block hides, taking the pressed button with
      // it. Focus goes to the first card that press revealed rather than
      // dropping to <body>, which would send a keyboard user back to the top.
      // While it stays, it has moved under the new cards, and a moved node
      // drops focus, so the button takes it back.
      if (step.closest<HTMLElement>('[data-dir-more]')?.hidden || step.hidden) {
        visible[before]?.el.querySelector<HTMLElement>('.sabl-name')?.focus({ preventScroll: true });
      } else if (document.activeElement !== step) {
        step.focus({ preventScroll: true });
      }
      return;
    }

    // The sheet's Clear filters: every filter back to its default, keeping
    // the sort and the words in the search box, which are not filters.
    if (t.closest('[data-dir-reset]')) {
      state = { ...config.defaultState, sort: state.sort };
      shown = pageSize;
      render();
      root.querySelector<HTMLElement>('.sabl-rail select')?.focus({ preventScroll: true });
      return;
    }

    if (t.closest('[data-dir-clear]')) {
      state = { ...config.defaultState };
      query = '';
      shown = pageSize;
      const input = root.querySelector<HTMLInputElement>('[data-dir-search]');
      if (input) input.value = '';
      render();
    }
  });

  // A picker in place of a chip row (sort): same state key, set on change.
  document.addEventListener('change', e => {
    const sel = (e.target as HTMLElement).closest?.<HTMLSelectElement>('select[data-fselect]');
    if (!root || !sel || !root.contains(sel)) return;
    state = { ...state, [sel.dataset.fselect as keyof S & string]: sel.value };
    shown = pageSize;
    render();
  });

  // The phone sheet keeps the keyboard: Escape closes it, and Tab cycles
  // through its own controls instead of wandering to the footer behind it.
  document.addEventListener('keydown', e => {
    if (!root?.isConnected || !document.documentElement.hasAttribute('data-filters')) return;
    if (e.key === 'Escape') { setFiltersOpen(false); return; }
    if (e.key !== 'Tab' || !matchMedia(NARROW).matches) return;
    const rail = root.querySelector<HTMLElement>('.sabl-rail');
    // summary too: the glossary under the pickers ("What these mean") was
    // skipped, so a keyboard could not open it inside the sheet (critique 2026-10-02).
    const stops = [...(rail?.querySelectorAll<HTMLElement>('select, button, a[href], input, summary') ?? [])].filter(el => el.offsetParent !== null);
    if (!stops.length) return;
    const at = stops.indexOf(document.activeElement as HTMLElement);
    const next = e.shiftKey ? (at <= 0 ? stops.length - 1 : at - 1) : (at === -1 || at === stops.length - 1 ? 0 : at + 1);
    e.preventDefault();
    stops[next]!.focus();
  });

  // Print every row of the current result, not the first step of it: a
  // counsellor printing a hub got 24 of 161 (critique 2026-09-29).
  let beforePrint: number | null = null;
  addEventListener('beforeprint', () => {
    if (!root?.isConnected || beforePrint !== null) return;
    beforePrint = shown;
    shown = items.length;
    render();
  });
  addEventListener('afterprint', () => {
    if (beforePrint === null) return;
    shown = beforePrint;
    beforePrint = null;
    if (root?.isConnected) render();
  });

  // A sheet opened on a phone must not leave the desktop list inert.
  matchMedia(NARROW).addEventListener('change', () => {
    if (root?.isConnected && !matchMedia(NARROW).matches) setFiltersOpen(false);
  });

  document.addEventListener('input', e => {
    const input = e.target as HTMLInputElement | null;
    if (!root || !input?.matches?.('[data-dir-search]') || !root.contains(input)) return;
    query = input.value;
    shown = pageSize;
    render();
  });

  // Fires on first load and after every view-transition swap: re-grab nodes,
  // restore URL filter state, and re-derive anything clock- or storage-dependent.
  document.addEventListener('astro:page-load', () => {
    root = document.querySelector<HTMLElement>(rootSelector);
    if (!root) return;
    pageSize = Number(root.querySelector<HTMLElement>('[data-dir-step]')?.dataset.dirStep) || config.pageSize || DIRECTORY_PAGE_SIZE;
    // The layout sets this in <head>; repeated here so a page built on another
    // layout still gets its "Show more" block (global.css hides it without).
    document.documentElement.classList.add('js');
    headers.clear();
    collapsed.clear();
    readerShut = false;
    for (const k of config.groups?.shut ?? []) collapsed.add(k);
    root.querySelectorAll<HTMLElement>('[data-dir-group]').forEach(h => headers.set(h.dataset.dirGroup!, h));
    items = [...root.querySelectorAll<HTMLElement>('[data-dir-card]')].map(config.parseCard);
    const params = new URLSearchParams(location.search);
    state = { ...config.defaultState };
    // Deep links like /scholarships?category=STEM pre-select that track chip.
    for (const key of Object.keys(state)) {
      let value = params.get(key);
      // ?status=ongoing was the "Open any time" chip until 2026-10-01; it is
      // part of "Open now" since, so old links land on that list.
      if (key === 'status' && value === 'ongoing') value = 'active';
      if (value !== null) state = { ...state, [key]: value };
    }
    // ?q= arrives from the other directory's empty state, which offers this
    // page as the wider search. Landing here with an empty box would drop the
    // query the student already typed.
    query = params.get('q') ?? '';
    // A hand-edited ?show=abc or ?show=3 falls back to the first step.
    const showParam = Number(params.get('show'));
    shown = Number.isFinite(showParam) && showParam > pageSize ? Math.floor(showParam) : pageSize;
    const input = root.querySelector<HTMLInputElement>('[data-dir-search]');
    if (input) input.value = query;
    // The attribute is already right (Layout.astro set it in <head>); this is
    // the button catching up with it after a swap brought a fresh one in.
    setLean(document.documentElement.hasAttribute('data-lean'));
    setFiltersOpen(false);
    config.onCardsParsed?.(items);
    paintSaved();
    render();
    restoreScroll();
  });

  /** One-shot: put a reader back where they left this exact list. */
  function restoreScroll() {
    let saved: { url?: string; y?: number } | null;
    try {
      saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? 'null');
      sessionStorage.removeItem(SCROLL_KEY);
    } catch { return; }
    if (!saved || saved.url !== location.pathname + location.search || typeof saved.y !== 'number') return;
    const y = saved.y;
    // Only when the page is back at a length the router could not have
    // restored into on its own; a first-24 list needs no help.
    if (shown <= pageSize) return;
    scrollTo(0, y);
    // The router's own restore can land after this handler, clamped to the
    // short page it measured. That only ever leaves the page too high, so for
    // a quarter of a second, pull it back down if it is above the spot.
    let checks = 0;
    const recheck = () => {
      if (scrollY < y - 2) scrollTo(0, y);
      if (++checks < 5) setTimeout(recheck, 50);
    };
    requestAnimationFrame(recheck);
  }
}
