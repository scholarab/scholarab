// Enhance complete server-rendered directories without replacing their cards.
import { sendEvent } from './events.ts';
import { normalizeSearchQuery, tokenIndexMayMatch } from './search-text.ts';
import { writeListContext } from './list-context.ts';
import { showConfetti } from './utils.ts';

export interface DirectoryItem {
  el: HTMLElement;
  id: number;
  name: string;
  search: string;
}

// Selection receives the search-matched pool; counts need membership, not order.
export interface DirectoryConfig<T extends DirectoryItem, S extends Record<string, string>, C = unknown> {
  itemType: 'scholarship' | 'program';
  defaultState: S;
  toggleKeys: string[];
  renderContext?(items: T[]): C;
  parseCard(el: HTMLElement): T;
  select(items: T[], state: S, ctx: C): T[];
  countFor(items: T[], state: S, ctx: C): number;
  summary(visible: T[], total: number): Record<string, string>;
  groups?: {
    key(item: T): string;
    label(key: string): string;
  };
  getSavedIds(): number[];
  toggleSave(id: number): number[];
  saveLabel(name: string, saved: boolean): string;
  onCardsParsed?(items: T[]): void;
}

interface SearchIndex { s: string[]; p: string[] }

let indexPromise: Promise<SearchIndex | null> | null = null;

function loadSearchIndex(): Promise<SearchIndex | null> {
  indexPromise ??= fetch('/search-index.json')
    .then(r => (r.ok ? r.json() : null))
    .then((j: unknown) => {
      const i = j as SearchIndex | null;
      return i && Array.isArray(i.s) && Array.isArray(i.p) ? i : null;
    })
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

  function withGroupHeaders(visible: T[]): HTMLElement[] {
    const g = config.groups;
    if (!g) return visible.map(v => v.el);
    const keys = visible.map(v => g.key(v));
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
    root.querySelectorAll<HTMLElement>('[data-fkey] [data-chip-count]').forEach(slot => {
      const chip = slot.closest<HTMLElement>('[data-fkey]')!;
      const next = { ...state, [chip.dataset.fkey!]: chip.dataset.fval ?? '' };
      const n = config.countFor(searched, next, ctx);
      slot.textContent = String(n);
      chip.classList.toggle('is-empty', n === 0 && !chip.classList.contains('on'));
    });

    const empty = root.querySelector<HTMLElement>('[data-dir-empty]');
    if (empty) empty.hidden = visible.length > 0;
    if (visible.length > 0 || q.length < 3) resetFallback();
    else resolveEmptySearch(q, ql, items.some(it => it.search.includes(ql)));
  }

  function resetFallback() {
    const slot = root?.querySelector<HTMLElement>('[data-dir-elsewhere]');
    if (slot) { slot.hidden = true; slot.textContent = ''; }
    const sub = root?.querySelector<HTMLElement>('[data-dir-empty-sub]');
    if (sub) sub.hidden = false;
  }

  function resolveEmptySearch(q: string, ql: string, onThisPage: boolean) {
    const kind = config.itemType;
    void loadSearchIndex().then(index => {
      if (!root || normalizeSearchQuery(query) !== ql) return;

      const here = index ? tokenIndexMayMatch(kind === 'scholarship' ? index.s : index.p, ql) : onThisPage;
      const there = index ? tokenIndexMayMatch(kind === 'scholarship' ? index.p : index.s, ql) : false;

      const slot = root.querySelector<HTMLElement>('[data-dir-elsewhere]');
      const sub = root.querySelector<HTMLElement>('[data-dir-empty-sub]');
      if (slot) {
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
        if (sub) sub.hidden = target !== null;
      }
      if (!here && !there) {
        emptyTimer = setTimeout(
          () => sendEvent('search_empty', undefined, undefined, `${q} | ${location.pathname}`),
          1000,
        );
      }
    });
  }

  // Pointer/context-menu activation must store context before a new tab copies it.
  for (const event of ['pointerdown', 'contextmenu', 'click']) document.addEventListener(event, e => {
    const link = (e.target as Element | null)?.closest?.('.sabl-name');
    if (link && root?.contains(link)) {
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
  document.addEventListener('astro:page-load', () => {
    root = document.querySelector<HTMLElement>(rootSelector);
    if (!root) return;
    headers.clear();
    root.querySelectorAll<HTMLElement>('[data-dir-group]').forEach(h => headers.set(h.dataset.dirGroup!, h));
    items = [...root.querySelectorAll<HTMLElement>('[data-dir-card]')].map(config.parseCard);
    const params = new URLSearchParams(location.search);
    state = { ...config.defaultState };
    for (const key of Object.keys(state)) {
      const value = params.get(key);
      if (value !== null) state = { ...state, [key]: value };
    }
    query = params.get('q') ?? '';
    const input = root.querySelector<HTMLInputElement>('[data-dir-search]');
    if (input) input.value = query;
    config.onCardsParsed?.(items);
    paintSaved();
    render();
  });
}
