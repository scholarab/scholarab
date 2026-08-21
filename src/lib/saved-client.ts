// Vanilla controller for /saved: all cards are server-rendered hidden, and
// this module unhides the bookmarked ones from localStorage, handles the
// remove animation flow, and renders the deadline calendar on demand —
// replicating the old SavedList/DeadlineCalendar React islands exactly.
import { getSaved, toggleSaved, getSavedPrograms, toggleSavedProgram } from './tracker.ts';
import { showToast, getToday, prefersReducedMotion } from './utils.ts';
import { getScholarshipStatus } from './list-core.ts';
import { sendEvent } from './events.ts';
import { downloadICS } from './ics.ts';
import type { ICSScholarship, ICSProgram } from './ics.ts';

// ── Chip/label helpers (shared with the SavedDirectory frontmatter) ───────────

export function savedShortDate(iso: string): string {
  return new Date(iso + 'T00:00:00')
    .toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysChip(deadline: string): { label: string; cls: string } {
  const days = Math.max(0, Math.round((new Date(deadline + 'T00:00:00').getTime() - getToday().getTime()) / 86400000));
  const label = days === 0 ? 'DUE TODAY' : `${days} ${days === 1 ? 'DAY' : 'DAYS'} LEFT`;
  return { label, cls: `sabl-days${days <= 7 ? ' urgent' : ''}` };
}

export function savedScholarshipChip(s: { deadline: string | null; openDate: string | null; active?: boolean }): { label: string; cls: string } {
  const status = getScholarshipStatus({ id: 0, deadline: s.deadline, openDate: s.openDate, active: s.active ?? true } as Parameters<typeof getScholarshipStatus>[0]);
  if (status === 'closed') return { label: 'CLOSED', cls: 'sabl-days neutral' };
  if (status === 'future') {
    return { label: s.openDate ? `OPENS ${savedShortDate(s.openDate).toUpperCase()}` : 'OPENING SOON', cls: 'sabl-days neutral' };
  }
  if (!s.deadline) return { label: 'ROLLING', cls: 'sabl-days neutral' };
  return daysChip(s.deadline);
}

export function savedProgramChip(p: { deadline: string | null }): { label: string; cls: string } {
  if (!p.deadline || p.deadline === 'TBA' || p.deadline === 'Ongoing') {
    return { label: 'ROLLING', cls: 'sabl-days neutral' };
  }
  return daysChip(p.deadline);
}

// ── Controller ────────────────────────────────────────────────────────────────

const BOUNCE_KEYFRAMES = [
  { transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(0.9)' },
  { transform: 'scale(1.05)' }, { transform: 'scale(1)' },
];

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

type CalItem = { title: string; url: string; amount?: string; type: 'scholarship' | 'program' };

export function initSaved() {
  let root: HTMLElement | null = null;
  let view: 'list' | 'calendar' = 'list';
  let calMonth = new Date();
  let calAdded = false;

  const wraps = () => root ? [...root.querySelectorAll<HTMLElement>('[data-sv-wrap]')] : [];

  function savedWraps(type: 'scholarship' | 'program') {
    const ids = new Set(type === 'scholarship' ? getSaved() : getSavedPrograms());
    return wraps().filter(w => w.dataset.type === type && ids.has(Number(w.dataset.id)));
  }

  function cardData(w: HTMLElement) {
    const card = w.querySelector<HTMLElement>('.sabl-card')!;
    return card.dataset;
  }

  function repaintChips() {
    for (const w of wraps()) {
      const card = w.querySelector<HTMLElement>('.sabl-card')!;
      const d = card.dataset;
      const chipEl = card.querySelector<HTMLElement>('[data-sv-chip]');
      const chip = w.dataset.type === 'scholarship'
        ? savedScholarshipChip({ deadline: d.deadline ?? null, openDate: d.openDate ?? null, active: d.inactive === undefined })
        : savedProgramChip({ deadline: d.deadline ?? null });
      if (chipEl) { chipEl.className = chip.cls; chipEl.textContent = chip.label; }
      const apply = card.querySelector<HTMLElement>('[data-sv-apply]');
      if (apply) {
        const status = getScholarshipStatus({ id: 0, deadline: d.deadline ?? null, openDate: d.openDate ?? null, active: d.inactive === undefined } as Parameters<typeof getScholarshipStatus>[0]);
        const applyLabel = apply.querySelector('[data-apply-label]');
        if (applyLabel) applyLabel.textContent = status === 'active' ? 'Apply' : 'Visit';
      }
    }
  }

  function setView(next: 'list' | 'calendar') {
    view = next;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-sv-view]').forEach(btn => {
      const on = btn.dataset.svView === view;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    updateVisibility();
  }

  function updateVisibility() {
    if (!root) return;
    const sh = savedWraps('scholarship');
    const pr = savedWraps('program');
    const total = sh.length + pr.length;
    const empty = total === 0;

    const countEl = root.querySelector('[data-sv-count]');
    if (countEl) {
      // Just the total. The per-type split used to be spelled out here and
      // then again 100px below in the two section heads — the same numbers
      // twice, which is where a mismatch would eventually come from.
      countEl.textContent =
        `${total} ${total === 1 ? 'item' : 'items'} bookmarked. Your shortlist lives here.`;
    }

    const emptyEl = root.querySelector<HTMLElement>('[data-sv-empty]');
    const listEl  = root.querySelector<HTMLElement>('[data-sv-list]');
    const calEl   = root.querySelector<HTMLElement>('[data-sv-cal]');
    if (emptyEl) emptyEl.hidden = !empty;
    if (listEl)  listEl.hidden  = empty || view !== 'list';
    if (calEl) {
      const showCal = !empty && view === 'calendar';
      calEl.hidden = !showCal;
      if (showCal) renderCalendar(calEl);
      else calEl.innerHTML = '';
    }

    const shHead = root.querySelector<HTMLElement>('[data-sv-sh-section]');
    const prHead = root.querySelector<HTMLElement>('[data-sv-pr-section]');
    if (shHead) shHead.hidden = sh.length === 0;
    if (prHead) prHead.hidden = pr.length === 0;
    const shLabel = root.querySelector('[data-sv-sh-label]');
    if (shLabel) shLabel.textContent = `SCHOLARSHIPS · ${sh.length}`;
    const prLabel = root.querySelector('[data-sv-pr-label]');
    if (prLabel) prLabel.textContent = `RESEARCH PROGRAMS · ${pr.length}`;
  }

  // Full repaint from localStorage: restores cards hidden by a remove
  // animation if they were re-saved elsewhere (storage event, page swap).
  function repaint() {
    if (!root) return;
    const shIds = new Set(getSaved());
    const prIds = new Set(getSavedPrograms());
    for (const w of wraps()) {
      const on = (w.dataset.type === 'scholarship' ? shIds : prIds).has(Number(w.dataset.id));
      w.hidden = !on;
      w.removeAttribute('style');
      const card = w.querySelector<HTMLElement>('.sabl-card');
      if (card) {
        delete card.dataset.removing;
        card.getAnimations?.().forEach(a => a.cancel());
      }
    }
    repaintChips();
    updateVisibility();
  }

  // ── Calendar (vanilla port of the old DeadlineCalendar island) ──────────────

  function calItems(): { sch: ICSScholarship[]; prg: ICSProgram[]; byDate: Map<string, CalItem[]> } {
    const sch: ICSScholarship[] = savedWraps('scholarship').map(w => {
      const d = cardData(w);
      return { id: Number(d.id), title: d.name ?? '', amount: d.amount, url: d.url ?? '', deadline: d.deadline ?? null };
    });
    const prg: ICSProgram[] = savedWraps('program').map(w => {
      const d = cardData(w);
      return { id: Number(d.id), name: d.name ?? '', url: d.url ?? '', deadline: d.deadline ?? null };
    });
    const byDate = new Map<string, CalItem[]>();
    for (const s of sch) {
      if (!s.deadline || s.deadline === 'TBA') continue;
      const items = byDate.get(s.deadline) ?? [];
      items.push({ title: s.title, url: s.url, amount: s.amount ?? undefined, type: 'scholarship' });
      byDate.set(s.deadline, items);
    }
    for (const p of prg) {
      if (!p.deadline || p.deadline === 'TBA' || p.deadline === 'Ongoing') continue;
      const items = byDate.get(p.deadline) ?? [];
      items.push({ title: p.name, url: p.url, type: 'program' });
      byDate.set(p.deadline, items);
    }
    return { sch, prg, byDate };
  }

  function renderCalendar(calEl: HTMLElement) {
    const { byDate } = calItems();
    const today = getToday();
    const year = calMonth.getFullYear();
    const mon = calMonth.getMonth();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dayStr = (d: number) => `${year}-${String(mon + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const firstDow = new Date(year, mon, 1).getDay();
    const days = new Date(year, mon + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    // Always 6 weeks so the calendar height doesn't change month to month
    while (cells.length < 42) cells.push(null);

    const monthLabel = calMonth.toLocaleString('en-CA', { month: 'long', year: 'numeric' });

    // How many saved deadlines sit either side of this month. Bare ← → arrows
    // gave no reason to press them, so a student with two saved deadlines
    // clicked through empty months hoping. The count turns the arrow into a
    // signpost, and the aria-label says it in words.
    const monthCount = (y: number, m: number) => {
      const prefix = `${y}-${String(m + 1).padStart(2, '0')}-`;
      let n = 0;
      for (const [ds, items] of byDate) if (ds.startsWith(prefix)) n += items.length;
      return n;
    };
    const navHtml = (dir: -1 | 1) => {
      const d = new Date(year, mon + dir, 1);
      const n = monthCount(d.getFullYear(), d.getMonth());
      const label = d.toLocaleString('en-CA', { month: 'long', year: 'numeric' });
      const attr = dir < 0 ? 'data-cal-prev' : 'data-cal-next';
      const aria = `${dir < 0 ? 'Previous' : 'Next'} month, ${label}`
        + (n > 0 ? `, ${n} deadline${n > 1 ? 's' : ''}` : ', no deadlines');
      return `<button type="button" class="sabs-cal-nav${n > 0 ? ' has-due' : ''}" ${attr} aria-label="${aria}">`
        + `<span aria-hidden="true">${dir < 0 ? '←' : '→'}</span>`
        + (n > 0 ? `<span class="sabl-mono sabs-cal-nav-count" aria-hidden="true">${n}</span>` : '')
        + '</button>';
    };

    const cellHtml = cells.map(d => {
      if (d === null) return '<div class="sabs-cal-cell blank"></div>';
      const ds = dayStr(d);
      const items = byDate.get(ds);
      const aria = items ? ` aria-label="${ds}: ${items.length} deadline${items.length > 1 ? 's' : ''}"` : '';
      return `<div class="sabs-cal-cell${items ? ' has-due' : ''}${ds === todayStr ? ' today' : ''}"${aria}>`
        + `<div class="sabs-cal-day">${d}</div>`
        + (items ? `<div class="sabl-mono sabs-cal-due">${items.length} DUE</div>` : '')
        + '</div>';
    }).join('');

    const monthDeadlines: { date: string; item: CalItem }[] = [];
    for (const d of cells) {
      if (d === null) continue;
      const ds = dayStr(d);
      for (const item of byDate.get(ds) ?? []) monthDeadlines.push({ date: ds, item });
    }

    const listHtml = monthDeadlines.length > 0
      ? '<div class="sabs-cal-list">' + monthDeadlines.map(({ date, item }) =>
          '<div class="sabs-cal-row">'
          + `<div class="sabl-mono sabs-cal-date">${new Date(date + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}</div>`
          + '<div>'
          + `<div class="sabs-cal-name">${esc(item.title)}</div>`
          + `<div class="sabl-mono sabs-cal-kind">${item.type === 'scholarship' ? `SCHOLARSHIP${item.amount ? ' · ' + esc(item.amount.toUpperCase()) : ''}` : 'RESEARCH PROGRAM'}</div>`
          + '</div>'
          + `<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" class="sabl-apply" style="font-size:13.5px">Apply<span class="sabl-ext" aria-hidden="true">↗</span></a>`
          + '</div>').join('')
        + '</div>'
      : '<div class="sabl-mono sabs-cal-none">No deadlines this month.</div>';

    calEl.innerHTML =
      '<div style="margin-top:48px">'
      + '<div class="sabs-cal-toolbar">'
      + '<div class="sabs-section-head sabl-mono" style="border-top:none;padding:0">'
      + '<span class="sabs-dot" style="background:#2FD3A0" aria-hidden="true"></span>'
      + '<span>DEADLINE CALENDAR</span>'
      + '</div>'
      + `<button type="button" class="sabs-cal-add" data-cal-add>${calAdded ? '✓ Added to calendar' : 'Add to calendar'}</button>`
      + '</div>'
      + '<div class="sabs-cal-card">'
      + '<div class="sabs-cal-head">'
      + navHtml(-1)
      + `<div class="sabs-cal-month">${monthLabel}</div>`
      + navHtml(1)
      + '</div>'
      + '<div class="sabs-cal-grid" style="margin-bottom:8px">'
      + ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => `<div class="sabl-mono sabs-cal-wd">${d}</div>`).join('')
      + '</div>'
      + `<div class="sabs-cal-grid">${cellHtml}</div>`
      + listHtml
      + '</div>'
      + '</div>';
  }

  // ── Remove flow (port of RemovableItem + RemoveButton) ──────────────────────

  function animateThen(anim: Animation | undefined, onDone: () => void) {
    if (anim?.finished?.then) anim.finished.then(onDone, onDone);
    else onDone();
  }

  function removeCard(btn: HTMLElement) {
    const card = btn.closest<HTMLElement>('.sabl-card');
    const wrap = btn.closest<HTMLElement>('[data-sv-wrap]');
    if (!card || !wrap || card.dataset.removing) return;
    if (!prefersReducedMotion()) {
      btn.animate?.(BOUNCE_KEYFRAMES, { duration: 380, easing: 'ease-out' });
    }
    showToast('Removed from saved');
    card.dataset.removing = 'true';

    const unsave = () => {
      const id = Number(wrap.dataset.id);
      if (wrap.dataset.type === 'scholarship') toggleSaved(id);
      else toggleSavedProgram(id);
      wrap.hidden = true;
      wrap.removeAttribute('style');
      delete card.dataset.removing;
      updateVisibility();
    };
    const collapse = () => {
      const finish = () => {
        wrap.style.height = '0';
        wrap.style.margin = '0';
        wrap.style.padding = '0';
        unsave();
      };
      if (prefersReducedMotion()) { finish(); return; }
      wrap.style.overflow = 'hidden';
      wrap.style.transformOrigin = 'top';
      const anim = wrap.animate?.(
        [{ transform: 'scaleY(1)', opacity: '1' }, { transform: 'scaleY(0)', opacity: '0' }],
        { duration: 220, easing: 'ease-in', fill: 'forwards' },
      );
      animateThen(anim, finish);
    };
    if (prefersReducedMotion()) { collapse(); return; }
    const anim = card.animate?.(
      [{ transform: 'scale(1)', opacity: '1' }, { transform: 'scale(0.95)', opacity: '0' }],
      { duration: 200, easing: 'ease-out', fill: 'forwards' },
    );
    animateThen(anim, collapse);
  }

  // ── Event wiring ────────────────────────────────────────────────────────────

  document.addEventListener('click', e => {
    const t = e.target as Element | null;
    if (!root || !t?.closest || !root.contains(t)) return;

    const viewBtn = t.closest<HTMLElement>('[data-sv-view]');
    if (viewBtn) {
      const next = viewBtn.dataset.svView as 'list' | 'calendar';
      if (next === 'calendar' && view !== 'calendar') { calMonth = new Date(getToday().getFullYear(), getToday().getMonth(), 1); calAdded = false; }
      setView(next);
      return;
    }

    const removeBtn = t.closest<HTMLElement>('[data-sv-remove]');
    if (removeBtn) { removeCard(removeBtn); return; }

    const apply = t.closest<HTMLElement>('[data-sv-apply]');
    if (apply) {
      const wrap = apply.closest<HTMLElement>('[data-sv-wrap]');
      if (wrap?.dataset.type === 'scholarship') sendEvent('apply_click', 'scholarship', Number(wrap.dataset.id));
      return;
    }

    if (t.closest('[data-cal-add]')) {
      const { sch, prg } = calItems();
      downloadICS(sch, prg);
      calAdded = true;
      const btn = root.querySelector('[data-cal-add]');
      if (btn) btn.textContent = '✓ Added to calendar';
      return;
    }

    const prev = t.closest('[data-cal-prev]');
    const nextBtn = t.closest('[data-cal-next]');
    if (prev || nextBtn) {
      calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + (prev ? -1 : 1), 1);
      const calEl = root.querySelector<HTMLElement>('[data-sv-cal]');
      if (calEl) renderCalendar(calEl);
    }
  });

  window.addEventListener('storage', e => {
    if (e.key === 'scholarab_saved' || e.key === 'scholarab_saved_programs') repaint();
  });

  document.addEventListener('astro:page-load', () => {
    root = document.querySelector<HTMLElement>('#sab-saved');
    if (!root) return;
    view = 'list';
    calAdded = false;
    repaint();
    setView('list');
    // Content is ready: swap the skeleton for the real page (same visible
    // sequence as the old React island, just resolved sooner).
    const skeleton = root.querySelector<HTMLElement>('[data-sv-skeleton]');
    const content = root.querySelector<HTMLElement>('[data-sv-content]');
    if (skeleton) skeleton.hidden = true;
    if (content) content.hidden = false;
  });
}
