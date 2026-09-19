// Vanilla controller for the public directory pages (/scholarships, /programs).
// The page ships fully server-rendered cards; this module only shows/hides and
// reorders existing DOM nodes, replicating what the old React islands did.
import { sendEvent } from './events.ts';
import { normalizeSearchQuery, tokenIndexMayMatch } from './search-text.ts';
import { writeListContext } from './list-context.ts';
import { showConfetti } from './utils.ts';
import { DIRECTORY_PAGE_SIZE } from './list-core.ts';

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
  /** Chip keys where re-clicking the active (non-default) value toggles it back off. */
  toggleKeys: string[];
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
  countFor(items: T[], state: S, ctx: C): number;
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
  };
  getSavedIds(): number[];
  toggleSave(id: number): number[];
  saveLabel(name: string, saved: boolean): string;
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
function setFiltersOpen(open: boolean) {
  const root = document.documentElement;
  if (open) root.setAttribute('data-filters', '');
  else root.removeAttribute('data-filters');
  for (const btn of document.querySelectorAll<HTMLElement>('[data-dir-filters]')) {
    btn.setAttribute('aria-expanded', String(open));
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
  const pageSize = config.pageSize ?? DIRECTORY_PAGE_SIZE;
  let shown = pageSize;

  function setSaveState(btn: HTMLElement, saved: boolean) {
    btn.classList.toggle('on', saved);
    btn.textContent = saved ? '★' : '☆';
    btn.setAttribute('aria-pressed', String(saved));
    btn.setAttribute('aria-label', config.saveLabel(btn.dataset.name ?? '', saved));
  }

  function paintSaved() {
    if (!root) return;
    const saved = new Set(config.getSavedIds());
    root.querySelectorAll<HTMLElement>('[data-dir-save]').forEach(btn => {
      setSaveState(btn, saved.has(Number(btn.dataset.id)));
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

  const CARET = '<svg class="sabl-group-caret" viewBox="0 0 12 8" width="12" height="8" fill="none"><path d="M1 1.5 6 6.5 11 1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function headerFor(key: string, count: number): HTMLElement {
    let el = headers.get(key);
    if (!el) {
      el = root?.querySelector<HTMLElement>(`[data-dir-group="${key}"]`) ?? undefined;
      if (!el) {
        el = document.createElement('button');
        el.setAttribute('type', 'button');
        el.className = 'sabl-group';
        el.dataset.dirGroup = key;
        el.innerHTML = '<span class="sabl-group-name"><span class="sabl-group-label"></span><span class="sabl-group-count"></span></span>'
          + `<span class="sabl-group-toggle" aria-hidden="true"><span data-dir-group-word></span>${CARET}</span>`;
      }
      headers.set(key, el);
    }
    el.hidden = false;
    const open = !collapsed.has(key);
    el.setAttribute('aria-expanded', String(open));
    const word = el.querySelector('[data-dir-group-word]');
    if (word) word.textContent = open ? 'Hide' : 'Show';
    el.querySelector('.sabl-group-label')!.textContent = config.groups!.label(key);
    el.querySelector('.sabl-group-count')!.textContent = String(count);
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

    const q = query.trim();
    // Normalized the same way the cards' blobs were, so punctuation a student
    // omits (or adds) does not decide whether they find anything.
    const ql = normalizeSearchQuery(q);
    const ctx = config.renderContext?.(items) as C;
    const searched = ql ? items.filter(it => it.search.includes(ql)) : items;
    visible = config.select(searched, state, ctx);
    // A shut section's cards come off the page entirely, so they do not eat
    // the "Show more" budget either: shutting CLOSED on a 24-card step buys
    // twenty-four open ones rather than twenty-four fewer cards.
    const g = config.groups;
    const pool = g && collapsed.size && isGrouped(visible)
      ? visible.filter(v => !collapsed.has(g.key(v)))
      : visible;
    const page = pool.slice(0, shown);
    const grid = root.querySelector<HTMLElement>('[data-dir-grid]');
    if (grid) {
      const onScreen = new Set(page.map(v => v.el));
      for (const it of items) {
        const hidden = !onScreen.has(it.el);
        if (it.el.hidden !== hidden) it.el.hidden = hidden;
        // The server's pre-JS cut (see global.css); `hidden` owns it now.
        if (it.el.hasAttribute('data-dir-later')) it.el.removeAttribute('data-dir-later');
      }
      for (const header of headers.values()) header.removeAttribute('data-dir-later');
      // Moving nodes already in order causes relayout without a visual change.
      // The server supplies the default order, and query-only filtering preserves
      // it, so compare node identities and move only the misplaced survivors.
      // Keep hidden cards in the document; move only misplaced visible nodes.
      for (const header of headers.values()) header.hidden = true;
      const want = withGroupHeaders(page, visible);
      let cursor = grid.firstElementChild;
      for (const node of want) {
        while (cursor && (cursor as HTMLElement).hidden) cursor = cursor.nextElementSibling;
        if (node !== cursor) grid.insertBefore(node, cursor);
        else cursor = cursor.nextElementSibling;
      }
      grid.hidden = visible.length === 0;
    }

    const more = root.querySelector<HTMLElement>('[data-dir-more]');
    if (more) {
      const remaining = pool.length - page.length;
      more.hidden = remaining <= 0;
      const line = more.querySelector<HTMLElement>('[data-dir-more-line]');
      if (line) line.textContent = `SHOWING ${page.length} OF ${pool.length}`;
      const btn = more.querySelector<HTMLElement>('[data-dir-more-btn]');
      if (btn) btn.textContent = `Show ${Math.min(pageSize, remaining)} more`;
      // "Show all" only earns its place when it does something the other
      // button would not do in one press.
      const all = more.querySelector<HTMLElement>('[data-dir-all]');
      if (all) {
        all.hidden = remaining <= pageSize;
        all.textContent = `Show all ${pool.length}`;
      }
    }

    for (const [key, text] of Object.entries(config.summary(visible, items.length))) {
      const slot = root.querySelector<HTMLElement>(`[data-dir-${key}]`);
      if (slot) {
        slot.textContent = text;
        if (key === 'stat-soon') slot.hidden = text === '';
      }
    }

    root.querySelectorAll<HTMLElement>('[data-fkey]').forEach(chip => {
      const on = state[chip.dataset.fkey!] === chip.dataset.fval;
      chip.classList.toggle('on', on);
      chip.setAttribute('aria-pressed', String(on));
    });
    // A chip's number answers "how many would I be left with if I pressed this",
    // so it is computed against the rest of the current state rather than the
    // whole corpus: with STATUS=Open showing, Arts reads the arts awards that are
    // open, not every arts award on file. A static number would contradict the
    // result line the moment a second filter went on.
    //
    // SORT is deliberately absent. Reordering changes nothing about how many
    // cards are on screen, so a count there would be the same figure three times.
    //
    // Counts are recomputed rather than cached because every one of them
    // depends on every other filter; there is no subset that survives a click
    // elsewhere in the block. Each is a filter pass over the shared search pool,
    // sharing this render's status cache and skipping the sort, since a count
    // needs the size of the set and not its order.
    root.querySelectorAll<HTMLElement>('[data-fkey] [data-chip-count]').forEach(slot => {
      const chip = slot.closest<HTMLElement>('[data-fkey]')!;
      const next = { ...state, [chip.dataset.fkey!]: chip.dataset.fval ?? '' };
      const n = config.countFor(searched, next, ctx);
      slot.textContent = String(n);
      // A chip that would empty the page still works, but it should not look
      // like an equal offer beside one holding forty listings.
      chip.classList.toggle('is-empty', n === 0 && !chip.classList.contains('on'));
    });

    const empty = root.querySelector<HTMLElement>('[data-dir-empty]');
    if (empty) empty.hidden = visible.length > 0;
    // Name what the button undoes. "Clear all filters" with no filter on,
    // after a search that found nothing, pointed at the wrong culprit.
    const clear = root.querySelector<HTMLElement>('[data-dir-clear]');
    if (clear) clear.textContent = active > 0 && q ? 'Clear search and filters' : active > 0 ? 'Clear filters' : 'Clear search';
    if (visible.length > 0 || q.length < 3) resetFallback();
    else resolveEmptySearch(q, ql, items.some(it => it.search.includes(ql)));
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

      const here = index ? tokenIndexMayMatch(kind === 'scholarship' ? index.s : index.p, ql) : onThisPage;
      const there = index ? tokenIndexMayMatch(kind === 'scholarship' ? index.p : index.s, ql) : false;

      const slot = root.querySelector<HTMLElement>('[data-dir-elsewhere]');
      const sub = root.querySelector<HTMLElement>('[data-dir-empty-sub]');
      if (slot) {
        // Own directory first: same page, same filters, just a wider slice.
        const target = here
          ? { href: kind === 'scholarship' ? '/scholarships/' : '/programs/', label: kind === 'scholarship' ? 'all scholarships' : 'all research programs' }
          : there
            ? { href: kind === 'scholarship' ? '/programs/' : '/scholarships/', label: kind === 'scholarship' ? 'research programs' : 'scholarships' }
            : null;
        slot.textContent = '';
        slot.hidden = target === null;
        if (target) {
          const a = document.createElement('a');
          a.className = 'sabl-empty-link';
          a.href = `${target.href}?q=${encodeURIComponent(q)}`;
          a.textContent = `Search ${target.label} for "${q}"`;
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
      writeListContext({ paths: visible.map(v => v.el.querySelector<HTMLAnchorElement>('.sabl-name')!.getAttribute('href')!), filtered: query.trim() !== '' || Object.keys(state).some(k => state[k] !== config.defaultState[k]) });
    }
  });

  document.addEventListener('click', e => {
    const t = e.target as Element | null;
    if (!root || !t?.closest || !root.contains(t)) return;

    const save = t.closest<HTMLElement>('[data-dir-save]');
    if (save) {
      const id = Number(save.dataset.id);
      const next = config.toggleSave(id);
      const nowSaved = next.includes(id);
      setSaveState(save, nowSaved);
      // Only the save counts, not the un-save: the metric is "people who
      // shortlisted this", and sendEvent dedupes it per item per tab session.
      if (nowSaved) { showConfetti(save); sendEvent('save', config.itemType, id); }
      return;
    }

    if (t.closest('[data-dir-filters]')) {
      setFiltersOpen(!document.documentElement.hasAttribute('data-filters'));
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
      if (step.closest<HTMLElement>('[data-dir-more]')?.hidden || step.hidden) {
        visible[before]?.el.querySelector<HTMLElement>('.sabl-name')?.focus({ preventScroll: true });
      }
      return;
    }

    const chip = t.closest<HTMLElement>('[data-fkey]');
    if (chip) {
      const k = chip.dataset.fkey as keyof S & string;
      const v = chip.dataset.fval ?? '';
      const toggleOff = config.toggleKeys.includes(k) && state[k] === v && v !== config.defaultState[k];
      state = { ...state, [k]: toggleOff ? config.defaultState[k] : v };
      shown = pageSize;
      render();
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
    // The layout sets this in <head>; repeated here so a page built on another
    // layout still gets its "Show more" block (global.css hides it without).
    document.documentElement.classList.add('js');
    headers.clear();
    collapsed.clear();
    root.querySelectorAll<HTMLElement>('[data-dir-group]').forEach(h => headers.set(h.dataset.dirGroup!, h));
    items = [...root.querySelectorAll<HTMLElement>('[data-dir-card]')].map(config.parseCard);
    const params = new URLSearchParams(location.search);
    state = { ...config.defaultState };
    // Deep links like /scholarships?category=STEM pre-select that track chip.
    for (const key of Object.keys(state)) {
      const value = params.get(key);
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
