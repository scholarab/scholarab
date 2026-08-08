// Vanilla controller for the public directory pages (/scholarships, /programs).
// The page ships fully server-rendered cards; this module only shows/hides and
// reorders existing DOM nodes, replicating what the old React islands did.
import { sendEvent } from './events.ts';
import { showConfetti } from './utils.ts';

// Collapsed/expanded state of the sticky filter panel, shared by /scholarships
// and /programs so the choice carries across the two pages.
const FILTERS_KEY = 'scholarab_filters_collapsed';

export interface DirectoryItem {
  el: HTMLElement;
  id: number;
  name: string;
  /** Lowercased searchable fields joined with \n (queries can't contain \n). */
  search: string;
}

export interface DirectoryConfig<T extends DirectoryItem, S extends Record<string, string>> {
  /** What these cards are — the `save` event needs it to name the item. */
  itemType: 'scholarship' | 'program';
  defaultState: S;
  /** Chip keys where re-clicking the active (non-default) value toggles it back off. */
  toggleKeys: string[];
  parseCard(el: HTMLElement): T;
  /** Visible items in display order for the given state + lowercased trimmed query. */
  select(items: T[], state: S, query: string): T[];
  countLine(shown: number, total: number): string;
  stat?(visible: T[], all: T[]): string;
  getSavedIds(): number[];
  toggleSave(id: number): number[];
  saveLabel(name: string, saved: boolean): string;
  /** Runs after cards are (re)parsed on every astro:page-load — e.g. recompute day chips. */
  onCardsParsed?(items: T[]): void;
  /** Adjust the fresh default state on load — e.g. apply ?category= from the URL. */
  initialState?(state: S): S;
}

export function initDirectory<T extends DirectoryItem, S extends Record<string, string>>(
  rootSelector: string,
  config: DirectoryConfig<T, S>,
) {
  let root: HTMLElement | null = null;
  let items: T[] = [];
  let state: S = { ...config.defaultState };
  let query = '';
  let emptyTimer: ReturnType<typeof setTimeout> | undefined;
  let stickyObserver: IntersectionObserver | undefined;

  // Drop-shadow under the controls only once they have actually stuck to the
  // top (paired with `top: -1px` in the stylesheet).
  function watchSticky() {
    stickyObserver?.disconnect();
    const panel = root?.querySelector<HTMLElement>('[data-dir-controls]');
    if (!panel || typeof IntersectionObserver === 'undefined') return;
    stickyObserver = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry) panel.classList.toggle('stuck', entry.intersectionRatio < 1);
      },
      { threshold: [1] },
    );
    stickyObserver.observe(panel);
  }

  function applyCollapsed(collapsed: boolean) {
    if (!root) return;
    const panel = root.querySelector<HTMLElement>('[data-dir-controls]');
    const btn = root.querySelector<HTMLElement>('[data-dir-collapse]');
    if (panel) panel.classList.toggle('collapsed', collapsed);
    if (btn) {
      const text = collapsed ? 'Show filters' : 'Hide filters';
      btn.setAttribute('aria-expanded', String(!collapsed));
      btn.setAttribute('aria-label', text);
      const label = btn.querySelector('[data-dir-collapse-label]');
      if (label) label.textContent = text;
    }
  }

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

  function render() {
    if (!root) return;
    if (emptyTimer) { clearTimeout(emptyTimer); emptyTimer = undefined; }

    const q = query.trim();
    const ql = q.toLowerCase();
    const visible = config.select(items, state, ql);
    const grid = root.querySelector<HTMLElement>('[data-dir-grid]');
    if (grid) {
      const shown = new Set(visible.map(v => v.el));
      for (const it of items) it.el.hidden = !shown.has(it.el);
      grid.append(...visible.map(v => v.el));
      grid.hidden = visible.length === 0;
    }

    const count = root.querySelector('[data-dir-count]');
    if (count) count.textContent = config.countLine(visible.length, items.length);
    const stat = root.querySelector('[data-dir-stat]');
    if (stat && config.stat) stat.textContent = config.stat(visible, items);

    root.querySelectorAll<HTMLElement>('[data-fkey]').forEach(chip => {
      const on = state[chip.dataset.fkey!] === chip.dataset.fval;
      chip.classList.toggle('on', on);
      chip.setAttribute('aria-pressed', String(on));
    });

    const empty = root.querySelector<HTMLElement>('[data-dir-empty]');
    if (empty) empty.hidden = visible.length > 0;

    // Content-gap signal: only report a query that matches nothing in the FULL
    // directory, not one starved by an active category/grade filter.
    if (q.length >= 3 && visible.length === 0 && !items.some(it => it.search.includes(ql))) {
      emptyTimer = setTimeout(() => sendEvent('search_empty', undefined, undefined, q), 1000);
    }
  }

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

    if (t.closest('[data-dir-collapse]')) {
      const panel = root.querySelector<HTMLElement>('[data-dir-controls]');
      const next = !panel?.classList.contains('collapsed');
      applyCollapsed(next);
      try { localStorage.setItem(FILTERS_KEY, next ? '1' : '0'); } catch { /* private mode */ }
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
  // reset filter state, and re-derive anything clock- or storage-dependent.
  document.addEventListener('astro:page-load', () => {
    root = document.querySelector<HTMLElement>(rootSelector);
    if (!root) return;
    items = [...root.querySelectorAll<HTMLElement>('[data-dir-card]')].map(config.parseCard);
    state = { ...config.defaultState };
    if (config.initialState) state = config.initialState(state);
    query = '';
    const input = root.querySelector<HTMLInputElement>('[data-dir-search]');
    if (input) input.value = '';
    config.onCardsParsed?.(items);
    let collapsed = false;
    try { collapsed = localStorage.getItem(FILTERS_KEY) === '1'; } catch { /* private mode */ }
    applyCollapsed(collapsed);
    watchSticky();
    paintSaved();
    render();
  });
}
