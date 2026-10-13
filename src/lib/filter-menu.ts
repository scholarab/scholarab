// The desktop filter row's pickers as our own menus (Ilia, 2026-10-12, after
// polymarket.com's "24hr Volume" and "All"): a small button saying the
// current choice, and a rounded list under it with a check on that choice.
// The browser's own list was a plain grey column.
//
// Each menu drives a native <select data-fselect>, which stays the single
// source of state: picking sets its value and fires "change", the same event
// directory-client already listens to. The phone sheet keeps the native
// pickers (global.css), where the system wheel is the better control.

const CHECK = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEVRON = '<svg class="sabl-menu-chev" viewBox="0 0 10 6" width="10" height="6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SORT = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><path d="M5 2.5v11M2.5 11 5 13.5 7.5 11M11 13.5v-11M8.5 5 11 2.5 13.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let open: HTMLElement | null = null;

/** The words an option stands for, without its count. */
function nameOf(o: HTMLOptionElement): string {
  return o.dataset.filterLabel ?? o.textContent ?? '';
}

function close(focusButton = false) {
  if (!open) return;
  const btn = open.querySelector<HTMLButtonElement>('[data-menu-for]')!;
  open.querySelector<HTMLElement>('[data-menu-list]')!.hidden = true;
  btn.setAttribute('aria-expanded', 'false');
  if (focusButton) btn.focus();
  open = null;
}

/** Rebuilds a menu's list from its select, whose counts the directory rewrites on every render. */
function fill(wrap: HTMLElement, sel: HTMLSelectElement) {
  const list = wrap.querySelector<HTMLElement>('[data-menu-list]')!;
  list.replaceChildren(...[...sel.options].map(o => {
    const item = document.createElement('div');
    item.className = 'sabl-menu-opt';
    item.setAttribute('role', 'option');
    item.tabIndex = -1;
    item.dataset.value = o.value;
    item.setAttribute('aria-selected', String(o.value === sel.value));
    const name = document.createElement('span');
    name.textContent = nameOf(o);
    item.append(name);
    const count = o.textContent?.match(/\(([\d,]+)\)$/)?.[1];
    if (count) {
      const n = document.createElement('span');
      n.className = 'sabl-menu-n';
      n.textContent = count;
      item.append(n);
    }
    item.insertAdjacentHTML('beforeend', `<span class="sabl-menu-check">${CHECK}</span>`);
    return item;
  }));
}

/** The button's words follow the select, including changes the directory makes itself (Clear filters). */
export function syncFilterMenus(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-menu]').forEach(wrap => {
    const sel = wrap.querySelector<HTMLSelectElement>('select')!;
    const label = wrap.querySelector<HTMLElement>('[data-menu-label]')!;
    label.textContent = sel.selectedOptions[0] ? nameOf(sel.selectedOptions[0]) : '';
    wrap.classList.toggle('is-set', sel.selectedIndex > 0 && sel.dataset.fselect !== 'sort');
  });
}

function choose(wrap: HTMLElement, value: string) {
  const sel = wrap.querySelector<HTMLSelectElement>('select')!;
  close(true);
  if (sel.value === value) return;
  sel.value = value;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  syncFilterMenus(wrap.parentElement ?? wrap);
}

function show(wrap: HTMLElement, at: 'selected' | 'first' | 'last' = 'selected') {
  close();
  const sel = wrap.querySelector<HTMLSelectElement>('select')!;
  fill(wrap, sel);
  const list = wrap.querySelector<HTMLElement>('[data-menu-list]')!;
  list.hidden = false;
  wrap.querySelector('[data-menu-for]')!.setAttribute('aria-expanded', 'true');
  open = wrap;
  const items = [...list.querySelectorAll<HTMLElement>('[role="option"]')];
  const target = at === 'first' ? items[0] : at === 'last' ? items.at(-1) : items.find(i => i.getAttribute('aria-selected') === 'true') ?? items[0];
  target?.focus();
}

/** Wraps every filter-row select in a menu once; safe to call on every page load. */
export function initFilterMenus(root: ParentNode) {
  root.querySelectorAll<HTMLSelectElement>('.sabl-rail select[data-fselect]').forEach(sel => {
    if (sel.closest('[data-menu]')) return;
    const key = sel.dataset.fselect!;
    const wrap = document.createElement('div');
    wrap.className = 'sabl-menu';
    wrap.dataset.menu = key;
    sel.replaceWith(wrap);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sabl-menu-btn';
    btn.dataset.menuFor = key;
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', sel.getAttribute('aria-label') ?? sel.closest('label')?.querySelector('.sabl-row-label')?.textContent ?? key);
    btn.innerHTML = `${key === 'sort' ? SORT : ''}<span data-menu-label></span>${CHEVRON}`;
    const list = document.createElement('div');
    list.className = 'sabl-menu-list';
    list.dataset.menuList = key;
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    wrap.append(sel, btn, list);
  });
  syncFilterMenus(root);
}

// One set of listeners for the life of the page; the menus are found by
// their markup, so a view-transition swap needs nothing re-bound.
document.addEventListener('click', e => {
  const t = e.target as HTMLElement;
  const btn = t.closest<HTMLElement>('[data-menu-for]');
  if (btn) {
    const wrap = btn.closest<HTMLElement>('[data-menu]')!;
    if (open === wrap) close(); else show(wrap);
    return;
  }
  const opt = t.closest<HTMLElement>('.sabl-menu-opt');
  if (opt) { choose(opt.closest<HTMLElement>('[data-menu]')!, opt.dataset.value ?? ''); return; }
  if (open && !open.contains(t)) close();
});

document.addEventListener('keydown', e => {
  const t = e.target as HTMLElement;
  const btn = t.closest?.<HTMLElement>('[data-menu-for]');
  if (btn && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault();
    show(btn.closest<HTMLElement>('[data-menu]')!, e.key === 'ArrowUp' ? 'last' : 'selected');
    return;
  }
  const opt = t.closest?.<HTMLElement>('.sabl-menu-opt');
  if (!opt || !open) return;
  const items = [...open.querySelectorAll<HTMLElement>('.sabl-menu-opt')];
  const i = items.indexOf(opt);
  const go = (n: number) => { e.preventDefault(); items[Math.max(0, Math.min(items.length - 1, n))]?.focus(); };
  if (e.key === 'ArrowDown') go(i + 1);
  else if (e.key === 'ArrowUp') go(i - 1);
  else if (e.key === 'Home') go(0);
  else if (e.key === 'End') go(items.length - 1);
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(open, opt.dataset.value ?? ''); }
  // Escape shuts this menu only, not the filter row around it.
  else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(true); }
  else if (e.key === 'Tab') close();
}, true);
