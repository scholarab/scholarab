// Vanilla controller for the public directory pages (/scholarships, /programs).
// The page ships fully server-rendered cards; this module only shows/hides and
// reorders existing DOM nodes, replicating what the old React islands did.
import { sendEvent } from './events.ts';
import { normalizeSearchQuery, tokenIndexMayMatch } from './search-text.ts';
import { writeListContext } from './list-context.ts';
import { showConfetti } from './utils.ts';

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

  function headerFor(key: string, count: number): HTMLElement {
    let el = headers.get(key);
    if (!el) {
      el = root?.querySelector<HTMLElement>(`[data-dir-group="${key}"]`) ?? undefined;
      if (!el) {
        el = document.createElement('div');
        el.className = 'sabl-group';
        el.dataset.dirGroup = key;
        el.innerHTML = '<span class="sabl-group-label"></span><span class="sabl-group-count"></span>';
      }
      headers.set(key, el);
    }
    el.hidden = false;
    el.querySelector('.sabl-group-label')!.textContent = config.groups!.label(key);
    el.querySelector('.sabl-group-count')!.textContent = String(count);
    return el;
  }

  /** visible cards with a header node spliced in ahead of each run. */
  function withGroupHeaders(visible: T[]): HTMLElement[] {
    const g = config.groups;
    if (!g) return visible.map(v => v.el);
    const keys = visible.map(v => g.key(v));
    // One group is no grouping: a lone "OPEN NOW" bar over the whole grid is
    // a label with nothing to distinguish it from.
    if (new Set(keys).size < 2) return visible.map(v => v.el);

    const counts = new Map<string, number>();
    for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);

    const out: HTMLElement[] = [];
    let current: string | null = null;
    visible.forEach((v, i) => {
      if (keys[i] !== current) {
        current = keys[i]!;
        out.push(headerFor(current, counts.get(current) ?? 0));
      }
      out.push(v.el);
    });
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
    if (url.href !== location.href) history.replaceState(history.state, '', url);

    const q = query.trim();
    // Normalized the same way the cards' blobs were, so punctuation a student
    // omits (or adds) does not decide whether they find anything.
    const ql = normalizeSearchQuery(q);
    const ctx = config.renderContext?.(items) as C;
    const searched = ql ? items.filter(it => it.search.includes(ql)) : items;
    visible = config.select(searched, state, ctx);
    const grid = root.querySelector<HTMLElement>('[data-dir-grid]');
    if (grid) {
      const shown = new Set(visible.map(v => v.el));
      for (const it of items) {
        const hidden = !shown.has(it.el);
        if (it.el.hidden !== hidden) it.el.hidden = hidden;
      }
      // Moving nodes already in order causes relayout without a visual change.
      // The server supplies the default order, and query-only filtering preserves
      // it, so compare node identities and move only the misplaced survivors.
      // Keep hidden cards in the document; move only misplaced visible nodes.
      for (const header of headers.values()) header.hidden = true;
      const want = withGroupHeaders(visible);
      let cursor = grid.firstElementChild;
      for (const node of want) {
        while (cursor && (cursor as HTMLElement).hidden) cursor = cursor.nextElementSibling;
        if (node !== cursor) grid.insertBefore(node, cursor);
        else cursor = cursor.nextElementSibling;
      }
      grid.hidden = visible.length === 0;
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

    const chip = t.closest<HTMLElement>('[data-fkey]');
    if (chip) {
      const k = chip.dataset.fkey as keyof S & string;
      const v = chip.dataset.fval ?? '';
      const toggleOff = config.toggleKeys.includes(k) && state[k] === v && v !== config.defaultState[k];
      state = { ...state, [k]: toggleOff ? config.defaultState[k] : v };
      render();
      return;
    }

    if (t.closest('[data-dir-clear]')) {
      state = { ...config.defaultState };
      query = '';
      const input = root.querySelector<HTMLInputElement>('[data-dir-search]');
      if (input) input.value = '';
      render();
    }
  });

  document.addEventListener('input', e => {
    const input = e.target as HTMLInputElement | null;
    if (!root || !input?.matches?.('[data-dir-search]') || !root.contains(input)) return;
    query = input.value;
    render();
  });

  // Fires on first load and after every view-transition swap: re-grab nodes,
  // restore URL filter state, and re-derive anything clock- or storage-dependent.
  document.addEventListener('astro:page-load', () => {
    root = document.querySelector<HTMLElement>(rootSelector);
    if (!root) return;
    headers.clear();
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
    const input = root.querySelector<HTMLInputElement>('[data-dir-search]');
    if (input) input.value = query;
    config.onCardsParsed?.(items);
    paintSaved();
    render();
  });
}
