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
 * Finder's four views (Ilia, 2026-09-23), persisted like lean mode and for the
 * same reason: it is a standing preference about how a reader likes to read a
 * list. Kept on <html> and re-applied by Layout.astro before the first paint.
 * `list` is the default and is stored as no attribute at all.
 */
const VIEWS = ['grid', 'list', 'columns', 'gallery'] as const;
type View = (typeof VIEWS)[number];
const VIEW_KEY = 'sa_view';
/** Columns is two panes side by side; below this a phone reads it as a list. */
const WIDE = '(min-width: 901px)';

function storedView(): View {
  const v = document.documentElement.getAttribute('data-view');
  return (VIEWS as readonly string[]).includes(v ?? '') ? (v as View) : 'list';
}

/** The view actually on screen: a phone keeps a stored Columns as a list. */
function effectiveView(): View {
  const v = storedView();
  return v === 'columns' && !matchMedia(WIDE).matches ? 'list' : v;
}

function setView(v: View) {
  const root = document.documentElement;
  if (v === 'list') root.removeAttribute('data-view');
  else root.setAttribute('data-view', v);
  try {
    if (v === 'list') localStorage.removeItem(VIEW_KEY);
    else localStorage.setItem(VIEW_KEY, v);
  } catch { /* storage blocked: the choice holds for this page only */ }
  paintViewButtons();
}

function paintViewButtons() {
  const on = effectiveView();
  for (const btn of document.querySelectorAll<HTMLElement>('[data-dir-view]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.dirView === on));
  }
}

/** Columns and Gallery show one listing large beside or above the rest. */
const previewing = () => {
  const v = effectiveView();
  return v === 'columns' || v === 'gallery';
};

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
  // Columns and Gallery: the listing in the preview pane, and the matches it
  // can step through (the unfolded ones, of which `page` is on screen).
  let selected: T | null = null;
  let pool: T[] = [];
  let page: T[] = [];

  function setSaveState(btn: HTMLElement, saved: boolean) {
    // The drawn bookmark carries the state through `.on` (CSS fills it), so
    // there is no glyph to swap. A button that has no icon still gets the two
    // characters, which is what the admin list and any future caller use.
    btn.classList.toggle('on', saved);
    if (!btn.querySelector('svg')) btn.textContent = saved ? '★' : '☆';
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

  /**
   * The preview pane of Columns and Gallery: the selected row, large. Built
   * from clones of the row's own cells, so it says exactly what the row says
   * (today's countdown, the Apply/Visit word, the saved state) with no second
   * copy of the listing in the HTML. The pane lives before the grid, so
   * Gallery needs no reordering to put it on top.
   */
  function paintPreview() {
    if (!root) return;
    const grid = root.querySelector<HTMLElement>('[data-dir-grid]');
    if (!grid) return;
    let pane = root.querySelector<HTMLElement>('[data-dir-preview]');
    root.querySelectorAll('.sabl-card.is-selected').forEach(el => {
      el.classList.remove('is-selected');
      el.querySelector('.sabl-name')?.removeAttribute('aria-current');
    });
    if (!previewing() || !page.length) {
      if (pane) { pane.hidden = true; pane.replaceChildren(); }
      return;
    }
    if (!pane) {
      pane = document.createElement('section');
      pane.className = 'sabl-pv';
      pane.dataset.dirPreview = '';
      pane.setAttribute('aria-label', 'Selected listing');
      grid.before(pane);
    }
    const sel: T = selected && page.includes(selected) ? selected : page[0]!;
    selected = sel;
    const card = sel.el;
    card.classList.add('is-selected');
    const link = card.querySelector<HTMLAnchorElement>('.sabl-name');
    link?.setAttribute('aria-current', 'true');

    const at = pool.indexOf(sel);
    const top = document.createElement('div');
    top.className = 'sabl-pv-top';
    const kicker = document.createElement('p');
    kicker.className = 'sabl-pv-kicker';
    // Inside a group the position counts that group, not the whole pool:
    // "Open now · 1 of 1542" under a heading saying 1083 open was two numbers
    // for one list (critique 2026-09-23).
    const grouped = config.groups && isGrouped(visible) ? config.groups : null;
    const siblings = grouped ? pool.filter(x => grouped.key(x) === grouped.key(sel)) : pool;
    const group = grouped ? `${grouped.label(grouped.key(sel))} · ` : '';
    kicker.textContent = `${group}${siblings.indexOf(sel) + 1} of ${siblings.length}`;
    const nav = document.createElement('div');
    nav.className = 'sabl-pv-nav';
    for (const [step, label, glyph] of [[-1, 'Previous listing', 'M7.5 1.5 3 6l4.5 4.5'], [1, 'Next listing', 'M4.5 1.5 9 6l-4.5 4.5']] as const) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sabl-pv-step';
      b.dataset.dirStep = String(step);
      b.setAttribute('aria-label', label);
      b.disabled = step < 0 ? at <= 0 : at >= pool.length - 1;
      b.innerHTML = `<svg viewBox="0 0 12 12" width="14" height="14" fill="none" aria-hidden="true"><path d="${glyph}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      nav.append(b);
    }
    top.append(kicker, nav);

    const name = document.createElement('h2');
    name.className = 'sabl-pv-name';
    if (link) {
      const a = document.createElement('a');
      a.className = 'sabl-name';
      a.href = link.getAttribute('href')!;
      a.textContent = link.textContent;
      name.append(a);
    }

    const body = card.querySelector('.sabl-row-main')?.cloneNode(true) as HTMLElement | undefined;
    body?.querySelector('.sabl-name-h')?.remove();
    body?.classList.replace('sabl-row-main', 'sabl-pv-body');

    const figures = document.createElement('div');
    figures.className = 'sabl-pv-figures';
    for (const cell of card.querySelectorAll('.sabl-amount, .sabl-card-top-left, .sabl-row-when')) {
      // A program that is not paid has an empty badge slot; a gap for it
      // would push the date off the pane's edge.
      if (cell.textContent?.trim()) figures.append(cell.cloneNode(true));
    }

    const actions = card.querySelector('.sabl-card-actions')?.cloneNode(true) as HTMLElement | undefined;
    // Programs already end on a Details link; a scholarship's only link out
    // is the sponsor's, so the pane adds the way to the full listing.
    if (actions && link && ![...actions.querySelectorAll('a')].some(a => a.getAttribute('href') === link.getAttribute('href'))) {
      const more = document.createElement('a');
      more.className = 'sabl-apply sabl-pv-more';
      more.href = link.getAttribute('href')!;
      more.textContent = 'Full details';
      actions.append(more);
    }

    pane.replaceChildren(...[top, name, body, figures, actions].filter((n): n is HTMLElement => !!n));
    pane.hidden = false;
  }

  /** Step the preview through the list; past the last card on screen it
      reveals the next step of the list, as "Show more" would. */
  function stepSelection(by: number, focusRow: boolean) {
    if (!selected) return;
    const next = pool[pool.indexOf(selected) + by];
    if (!next) return;
    if (!page.includes(next)) shown += pageSize;
    selected = next;
    render();
    if (focusRow) next.el.querySelector<HTMLElement>('.sabl-name')?.focus({ preventScroll: true });
    next.el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
    paintPreview();

    const more = root.querySelector<HTMLElement>('[data-dir-more]');
    if (more) {
      const remaining = pool.length - page.length;
      more.hidden = remaining <= 0;
      const line = more.querySelector<HTMLElement>('[data-dir-more-line]');
      if (line) line.textContent = `Showing ${page.length} of ${pool.length.toLocaleString('en-CA')}`;
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

    root.querySelectorAll<HTMLSelectElement>('select[data-fselect]').forEach(sel => {
      sel.value = String(state[sel.dataset.fselect!] ?? '');
    });
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
    config.afterCounts?.(root, searched, state, q, ctx);
    root.querySelectorAll<HTMLElement>('[data-dir-filters-done]').forEach(b => {
      b.textContent = visible.length === 0 ? 'No results. Change a filter'
        : `Show ${visible.length} result${visible.length === 1 ? '' : 's'}`;
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
    // The preview pane's title and Full details go to the same listing.
    const card = link?.closest<HTMLElement>('[data-dir-card], [data-dir-preview]');
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
      // The row and its copy in the preview pane are two buttons for one save.
      root.querySelectorAll<HTMLElement>(`[data-dir-save][data-id="${id}"]`).forEach(b => setSaveState(b, nowSaved));
      // Only the save counts, not the un-save: the metric is "people who
      // shortlisted this", and sendEvent dedupes it per item per tab session.
      if (nowSaved) { showConfetti(save); sendEvent('save', config.itemType, id); }
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

    const view = t.closest<HTMLElement>('[data-dir-view]');
    if (view) {
      setView(view.dataset.dirView as View);
      render();
      return;
    }

    const stepBtn = t.closest<HTMLElement>('[data-dir-step]');
    if (stepBtn) {
      stepSelection(Number(stepBtn.dataset.dirStep), false);
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

  // A picker in place of a chip row (sort): same state key, set on change.
  document.addEventListener('change', e => {
    const sel = (e.target as HTMLElement).closest?.<HTMLSelectElement>('select[data-fselect]');
    if (!root || !sel || !root.contains(sel)) return;
    state = { ...state, [sel.dataset.fselect as keyof S & string]: sel.value };
    shown = pageSize;
    render();
  });

  // Columns and Gallery, as in Finder: a click selects a listing into the
  // preview, a double click opens it. Capture phase, so the router never
  // starts a navigation for the title link a single click lands on. The row's
  // own Save and Apply keep working, and a modified click still opens a tab.
  let opening = false;
  document.addEventListener('click', e => {
    const t = e.target as Element | null;
    if (opening || !root || !previewing() || !t?.closest) return;
    const card = t.closest<HTMLElement>('[data-dir-card]');
    if (!card || !root.contains(card) || t.closest('.sabl-card-actions')) return;
    const a = t.closest('a');
    if (a && !a.classList.contains('sabl-name')) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const item = items.find(it => it.el === card);
    if (!item || item === selected) return;
    selected = item;
    paintPreview();
    // On a phone the pane sits above the strip; bring it back into view.
    root.querySelector<HTMLElement>('[data-dir-preview]')?.scrollIntoView({ block: 'nearest' });
  }, true);

  document.addEventListener('dblclick', e => {
    const card = (e.target as Element | null)?.closest?.<HTMLElement>('[data-dir-card]');
    if (!root || !previewing() || !card || !root.contains(card) || (e.target as Element).closest('.sabl-card-actions')) return;
    opening = true;
    card.querySelector<HTMLAnchorElement>('.sabl-name')?.click();
    opening = false;
  });

  // Arrow keys walk the selection while focus is in the list or the pane.
  document.addEventListener('keydown', e => {
    const t = e.target as Element | null;
    if (!root || !previewing() || !t?.closest || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!t.closest('[data-dir-grid], [data-dir-preview]') || t.matches('input, select, textarea')) return;
    const by = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!by) return;
    e.preventDefault();
    stepSelection(by, !!t.closest('[data-dir-grid]'));
  });

  // Crossing the phone breakpoint turns Columns into the list and back.
  matchMedia(WIDE).addEventListener('change', () => {
    if (!root?.isConnected) return;
    paintViewButtons();
    render();
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
    paintViewButtons();
    selected = null;
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
