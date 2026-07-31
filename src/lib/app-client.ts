// DOM controller for /app — the mobile app screen from the claude.ai/design
// file "ScholarAB Mobile App". Vanilla, per the de-React convention: only
// /match and /admin ship React.
//
// The design's own state lives in a DCLogic component with a `saved` map and a
// hand-written DATA array. Here the listings are the real database rows
// serialized into the page, `saved` is the site's existing localStorage
// tracker (so the app and /saved and every detail page stay in sync), and the
// Match screen runs the real eligibility matcher over the stored quiz answers.
import { getSaved, toggleSaved } from './tracker.ts'
import { sendEvent } from './events.ts'
import { matchAll } from './eligibility-matcher.ts'
import { downloadICS } from './ics.ts'
import { prefersReducedMotion } from './utils.ts'
import {
  expandItem, chipFor, statusOf, daysUntil, midnight, initialsOf, orgLine, hashTags,
  feedStamp, applySteps, shortMoney, moneyTotal, openListings, byDeadline, searchListings,
  filterCategory, categoryKeys, nearbyListings, profileFromAnswers, profileChips,
  weekStrip, deadlineWeeks, timePressure, longDate, shortDate,
  QUIZ_STORAGE_KEY, type WireItem, type Listing, type StoredQuiz,
} from './app-core.ts'

// ── Constants ─────────────────────────────────────────────────────────────────

const SITE = 'https://www.scholarab.ca'
const FEED_LIMIT = 10

type Tab = 'feed' | 'due' | 'match' | 'saved' | 'me'
type FeedMode = 'foryou' | 'closing' | 'nearby'

// The design's three feed palettes, cycled card to card.
interface Palette {
  bg: string; fg: string; body: string; dim: string; amountFg: string; tagFg: string
  ctaBg: string; ctaFg: string; railBg: string; avBg: string; avFg: string
  plusBg: string; plusFg: string; onBg: string; onFg: string; offBg: string; offFg: string
}

const PALETTES: Palette[] = [
  { bg: '#0B1512', fg: '#F2F0E9', body: 'rgba(242,240,233,0.68)', dim: 'rgba(242,240,233,0.5)', amountFg: '#2FD3A0', tagFg: '#2FD3A0', ctaBg: '#2FD3A0', ctaFg: '#0B1512', railBg: 'rgba(242,240,233,0.13)', avBg: '#0E3B2C', avFg: '#2FD3A0', plusBg: '#2FD3A0', plusFg: '#0B1512', onBg: '#2FD3A0', onFg: '#0B1512', offBg: 'rgba(242,240,233,0.13)', offFg: '#F2F0E9' },
  { bg: '#0E3B2C', fg: '#F2F0E9', body: 'rgba(242,240,233,0.72)', dim: 'rgba(242,240,233,0.55)', amountFg: '#F2F0E9', tagFg: '#2FD3A0', ctaBg: '#2FD3A0', ctaFg: '#0B1512', railBg: 'rgba(242,240,233,0.13)', avBg: '#0B1512', avFg: '#2FD3A0', plusBg: '#2FD3A0', plusFg: '#0B1512', onBg: '#2FD3A0', onFg: '#0B1512', offBg: 'rgba(242,240,233,0.13)', offFg: '#F2F0E9' },
  { bg: '#FAF7F0', fg: '#141915', body: 'rgba(20,25,21,0.65)', dim: 'rgba(20,25,21,0.55)', amountFg: '#141915', tagFg: '#0E8C64', ctaBg: '#141915', ctaFg: '#FAF7F0', railBg: 'rgba(20,25,21,0.09)', avBg: '#0B1512', avFg: '#2FD3A0', plusBg: '#0E8C64', plusFg: '#F2F0E9', onBg: '#0E8C64', onFg: '#FAF7F0', offBg: 'rgba(20,25,21,0.09)', offFg: '#141915' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function listingUrl(l: Listing): string {
  return `${SITE}/scholarships/${l.slug}/`
}

function readQuiz(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(QUIZ_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredQuiz
    return parsed && typeof parsed.answers === 'object' ? parsed.answers : null
  } catch {
    return null
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

export function initApp(): void {
  let root: HTMLElement | null = null
  let items: Listing[] = []
  let today = midnight()

  let tab: Tab = 'feed'
  let feedMode: FeedMode = 'foryou'
  let query = ''
  let category = 'ALL'
  let openId: number | null = null
  /** Match screen tick-boxes; seeded from the matcher the first time it renders. */
  let picks: Record<number, boolean> = {}
  let picksSeeded = false
  let toastTimer: ReturnType<typeof setTimeout> | null = null
  let toast = ''
  /** Bumped whenever something re-renders the active screen from scratch. */
  let renderedKey = ''

  const byId = new Map<number, Listing>()

  // ── Derived data ────────────────────────────────────────────────────────────

  const savedIds = (): number[] => getSaved().filter(id => byId.has(id))
  const isSaved = (id: number): boolean => getSaved().includes(id)

  function open(): Listing[] {
    return openListings(items, today)
  }

  function matchedIds(): number[] | null {
    const profile = profileFromAnswers(readQuiz())
    if (!profile) return null
    const pool = open()
    return matchAll(profile, pool.map(l => ({ id: l.id, region: l.region, eligibility: l.eligibility })))
      .map(m => m.id)
  }

  function feedListings(): Listing[] {
    const pool = open()
    if (feedMode === 'closing') return [...pool].sort(byDeadline).slice(0, FEED_LIMIT)
    if (feedMode === 'nearby') {
      const city = readQuiz()?.city ?? null
      return nearbyListings(pool, city).sort(byDeadline).slice(0, FEED_LIMIT)
    }
    const ids = matchedIds()
    if (!ids) return [...pool].sort(byDeadline).slice(0, FEED_LIMIT)
    return ids.map(id => byId.get(id)!).filter(Boolean).slice(0, FEED_LIMIT)
  }

  function dueListings(): Listing[] {
    return filterCategory(searchListings(open(), query), category).sort(byDeadline)
  }

  function matchListings(): Listing[] {
    const ids = matchedIds()
    if (!ids) return []
    return ids.map(id => byId.get(id)!).filter(Boolean).slice(0, 25)
  }

  // ── Toast ───────────────────────────────────────────────────────────────────

  function say(msg: string): void {
    toast = msg
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toast = ''; paintToast() }, 2200)
    paintToast()
  }

  function paintToast(): void {
    const host = root?.querySelector<HTMLElement>('[data-sabx-toast]')
    if (!host) return
    host.innerHTML = toast ? `<div class="sabx-toast"><span>${esc(toast)}</span></div>` : ''
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  function go(next: Tab): void {
    tab = next
    openId = null
    render()
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  function save(id: number): void {
    const next = toggleSaved(id)
    const on = next.includes(id)
    if (on) sendEvent('save', 'scholarship', id)
    navigator.vibrate?.(12)
    say(on ? 'Saved · we can email you before it closes' : 'Removed from saved')
    // The Saved screen and the tab badge are counts, so they always repaint;
    // the feed and the list only need their own buttons patched, which keeps
    // the snap scroller from jumping back to the first card.
    if (tab === 'saved' || tab === 'me') render()
    else { paintSaves(); paintBadge() }
  }

  function paintSaves(): void {
    if (!root) return
    for (const el of root.querySelectorAll<HTMLElement>('[data-save-id]')) {
      const on = isSaved(Number(el.dataset.saveId))
      el.setAttribute('aria-pressed', String(on))
      el.setAttribute('aria-label', on ? 'Remove from saved' : 'Save')
      const label = el.querySelector<HTMLElement>('[data-save-label]')
      if (label) label.textContent = on ? 'Saved' : 'Save'
      if (on && !prefersReducedMotion()) {
        const dot = el.querySelector<HTMLElement>('[data-save-dot]') ?? el
        dot.classList.remove('sabx-pop')
        void dot.offsetWidth
        dot.classList.add('sabx-pop')
      }
    }
  }

  function paintSaveAll(): void {
    const btn = root?.querySelector<HTMLButtonElement>('[data-save-all]')
    if (!btn) return
    const n = matchListings().filter(l => picks[l.id]).length
    btn.disabled = n === 0
    btn.textContent = n === 0 ? 'Pick at least one'
      : n === 1 ? 'Save 1 & track its deadline'
      : `Save ${n} & track deadlines`
  }

  function paintBadge(): void {
    const badge = root?.querySelector<HTMLElement>('[data-sabx-badge]')
    if (!badge) return
    const n = savedIds().length
    badge.textContent = String(n)
    badge.hidden = n === 0
  }

  // ── Screen: feed ────────────────────────────────────────────────────────────

  function feedCard(l: Listing, i: number): string {
    const p = PALETTES[i % PALETTES.length]!
    const chip = chipFor(l, today)
    const on = isSaved(l.id)
    const vars = `--f-on-bg:${p.onBg};--f-on-fg:${p.onFg};--f-off-bg:${p.offBg};--f-off-fg:${p.offFg}`
    return `
      <article class="sabx-card" style="background:${p.bg};color:${p.fg};${vars}">
        <div class="sabx-card-stamp" style="color:${p.dim}">${esc(feedStamp(l))}</div>
        <div class="sabx-card-amount" style="color:${p.amountFg}">${esc(l.amount)}</div>
        <div class="sabx-card-foot">
          <div class="sabx-card-chip" style="background:${chip.feedBg};color:${chip.feedFg}">${esc(chip.text)}</div>
          <div class="sabx-card-org">${esc(orgLine(l))}</div>
          <button class="sabx-card-name" data-open="${l.id}">${esc(l.title)}</button>
          <p class="sabx-card-blurb" style="color:${p.body}">${esc(l.audience ?? 'Open to Alberta high school students. Full criteria on the official page.')}</p>
          <div class="sabx-card-tags" style="color:${p.tagFg}">${esc(hashTags(l))}</div>
          <button class="sabx-card-cta" style="background:${p.ctaBg};color:${p.ctaFg}" data-open="${l.id}">Check if I qualify <span>→</span></button>
        </div>
        <div class="sabx-rail">
          <div class="sabx-rail-av" aria-hidden="true">
            <span style="background:${p.avBg};border:2px solid ${p.fg};color:${p.avFg}">${esc(initialsOf(l.title))}</span>
          </div>
          <button class="sabx-rail-btn" data-save-id="${l.id}" aria-pressed="${on}" aria-label="${on ? 'Remove from saved' : 'Save'}">
            <span data-save-dot><i class="sabx-bookmark"></i></span>
            <span class="sabx-rail-label" style="color:${p.dim}" data-save-label>${on ? 'Saved' : 'Save'}</span>
          </button>
          <button class="sabx-rail-btn" data-open="${l.id}" aria-label="Open details">
            <span style="background:${p.railBg};color:${p.fg}">?</span>
            <span class="sabx-rail-label" style="color:${p.dim}">Details</span>
          </button>
          <button class="sabx-rail-btn" data-share="${l.id}" aria-label="Share">
            <span style="background:${p.railBg};color:${p.fg}">↗</span>
            <span class="sabx-rail-label" style="color:${p.dim}">share</span>
          </button>
        </div>
      </article>`
  }

  function renderFeed(): string {
    const list = feedListings()
    const total = open().length
    const rest = Math.max(0, total - list.length)
    const matched = matchedIds() !== null
    const modes: [FeedMode, string][] = [['closing', 'Closing'], ['foryou', 'For you'], ['nearby', 'Nearby']]

    const end = `
      <div class="sabx-feed-end">
        <div class="sabx-feed-end-eyebrow">${matched && feedMode === 'foryou' ? 'END OF YOUR MATCHES' : 'END OF THE FEED'}</div>
        <div class="sabx-feed-end-title">${matched && feedMode === 'foryou' ? "That's everything you qualify for today." : "That's the top of the list."}</div>
        <p class="sabx-feed-end-body">${rest > 0
          ? `${rest} more open listing${rest === 1 ? '' : 's'} ${rest === 1 ? 'is' : 'are'} in the full directory. Browse them all, or narrow it down with the match quiz.`
          : 'Every open listing is in the directory. Narrow it down with the match quiz.'}</p>
        <div class="sabx-feed-end-btns">
          <button class="sabx-btn-mint" data-go="due">Browse all ${total} →</button>
          <a class="sabx-btn-ghost" href="/match/">${matched ? 'Redo my match' : 'Take the match quiz'}</a>
        </div>
      </div>`

    const cards = list.length > 0
      ? list.map(feedCard).join('')
      : `<div class="sabx-feed-end">
           <div class="sabx-feed-end-eyebrow">NOTHING HERE YET</div>
           <div class="sabx-feed-end-title">No open listings in this feed.</div>
           <p class="sabx-feed-end-body">Try another tab, or browse the full directory.</p>
           <div class="sabx-feed-end-btns"><button class="sabx-btn-mint" data-go="due">Browse all ${total} →</button></div>
         </div>`

    return `
      <section class="sabx-screen sabx-feed">
        <div class="sabx-feed-nav" role="tablist" aria-label="Feed">
          ${modes.map(([m, label]) => `
            <button class="sabx-feed-tab" role="tab" data-feed="${m}" aria-selected="${feedMode === m}">
              <span>${label}</span><i></i>
            </button>`).join('')}
          <button class="sabx-feed-search" data-go="due" aria-label="Search all listings">⌕</button>
        </div>
        <div class="sabx-feed-scroll" data-sabx-feedscroll>${cards}${list.length > 0 ? end : ''}</div>
        ${list.length > 0 ? '<div class="sabx-swipe-hint"><span>↑ SWIPE FOR NEXT AWARD</span></div>' : ''}
      </section>`
  }

  // ── Screen: due / browse ────────────────────────────────────────────────────

  function renderDue(): string {
    const list = dueListings()
    const total = open().length
    const rings = [...open()].filter(l => l.deadline && statusOf(l, today) === 'active').sort(byDeadline).slice(0, 5)
    const cats = ['ALL', ...categoryKeys(open())]

    const ringHtml = rings.map(l => {
      const days = daysUntil(l.deadline!, today)
      // Sweep proportional to urgency: a full ring means the deadline is today.
      const pct = Math.max(6, Math.min(100, Math.round(((60 - Math.min(days, 60)) / 60) * 100)))
      return `
        <button class="sabx-ring" data-open="${l.id}">
          <span class="sabx-ring-dial" style="background:conic-gradient(from 200deg,#2FD3A0,#0E8C64 ${pct}%,rgba(20,25,21,0.13) ${pct}%)">
            <span class="sabx-ring-inner">
              <span class="sabx-ring-n">${days}</span>
              <span class="sabx-ring-unit">${days === 1 ? 'DAY' : 'DAYS'}</span>
            </span>
          </span>
          <span class="sabx-ring-label">${esc(shortMoney(l.amount))}</span>
        </button>`
    }).join('')

    const rowHtml = list.map(l => {
      const chip = chipFor(l, today)
      const on = isSaved(l.id)
      return `
        <div class="sabx-row">
          <button class="sabx-row-main" data-open="${l.id}">
            <span class="sabx-row-meta">
              <span class="sabx-row-tag">${esc((l.category ?? 'SCHOLARSHIP').toUpperCase())}</span>
              <span class="sabx-row-chip" style="background:${chip.bg};color:${chip.fg}">${esc(chip.text)}</span>
            </span>
            <span class="sabx-row-name">${esc(l.title)}</span>
            <span class="sabx-row-org">${esc(orgLine(l))}</span>
          </button>
          <div class="sabx-row-side">
            <div class="sabx-row-amount">${esc(shortMoney(l.amount))}</div>
            <button class="sabx-row-save" data-save-id="${l.id}" aria-pressed="${on}" aria-label="${on ? 'Remove from saved' : 'Save'}">
              <i class="sabx-bookmark" data-save-dot></i>
            </button>
          </div>
        </div>`
    }).join('')

    return `
      <section class="sabx-screen sabx-due">
        <div class="sabx-scroll">
          <div class="sabx-due-head">
            <span class="sabx-wordmark">Scholar<span>AB</span></span>
            <span class="sabx-count-chip">${list.length === total ? `${total} OPEN` : `${list.length} SHOWN`}</span>
          </div>
          ${rings.length > 0 ? `<div class="sabx-rings">${ringHtml}</div>` : ''}
          <div class="sabx-search-wrap">
            <div class="sabx-search">
              <span class="sabx-search-icon" aria-hidden="true">⌕</span>
              <input type="search" data-sabx-query value="${esc(query)}" placeholder="Search ${total} listings…" aria-label="Search listings" enterkeyhint="search" />
              ${query ? '<button data-clear-query aria-label="Clear search" class="sabx-search-icon">✕</button>' : ''}
            </div>
            <div class="sabx-chips">
              ${cats.map(c => `<button class="sabx-chip" data-cat="${esc(c)}" aria-pressed="${category === c}">${c === 'ALL' ? `ALL ${total}` : esc(c)}</button>`).join('')}
            </div>
          </div>
          <div class="sabx-list">
            ${rowHtml}
            ${list.length === 0 ? `
              <div class="sabx-empty">
                <div class="sabx-empty-title">Nothing matches that.</div>
                <div class="sabx-empty-sub">Try a shorter word, or clear the filter.</div>
              </div>` : ''}
          </div>
        </div>
      </section>`
  }

  // ── Screen: match ───────────────────────────────────────────────────────────

  function renderMatch(): string {
    const answers = readQuiz()
    const list = matchListings()
    const chips = profileChips(answers)

    if (!answers || list.length === 0) {
      return `
        <section class="sabx-screen sabx-match">
          <div class="sabx-match-head">
            <button class="sabx-match-back" data-go="feed" aria-label="Back">‹</button>
            <span class="sabx-match-title">Your matches</span>
            <button class="sabx-match-skip" data-go="feed">Skip</button>
          </div>
          <div class="sabx-match-scroll">
            <div class="sabx-empty-big" style="margin-top:40px">
              <div class="sabx-section-label">${answers ? '0 MATCHES' : 'QUIZ NOT TAKEN'}</div>
              <h3>${answers ? 'Nothing open fits that profile right now.' : 'Six questions, then this fills up.'}</h3>
              <p>${answers
                ? 'Listings open and close all year. Browse the full directory in the meantime.'
                : 'The quiz checks your grade, region and field against every listing so this screen only shows what you can actually win.'}</p>
              <a class="sabx-btn-ink" href="/match/">${answers ? 'Redo the quiz' : 'Take the quiz'}</a>
            </div>
          </div>
        </section>`
    }

    if (!picksSeeded) {
      for (const l of list) picks[l.id] = true
      picksSeeded = true
    }

    const picked = list.filter(l => picks[l.id])
    const rows = list.map(l => {
      const chip = chipFor(l, today)
      const on = !!picks[l.id]
      return `
        <button class="sabx-match-row" data-pick="${l.id}" aria-pressed="${on}">
          <span class="sabx-match-av">${esc(initialsOf(l.title))}</span>
          <span class="sabx-match-body">
            <span class="sabx-match-name">${esc(l.title)}</span>
            <span class="sabx-match-meta">${esc(shortMoney(l.amount))} · ${esc(chip.text)}</span>
          </span>
          <span class="sabx-pick">✓</span>
        </button>`
    }).join('')

    return `
      <section class="sabx-screen sabx-match">
        <div class="sabx-match-head">
          <button class="sabx-match-back" data-go="feed" aria-label="Back">‹</button>
          <span class="sabx-match-title">Your matches</span>
          <button class="sabx-match-skip" data-go="feed">Skip</button>
        </div>
        <div class="sabx-match-scroll">
          <div class="sabx-profile-chips">
            ${chips.map(c => `<span class="sabx-profile-chip">${esc(c)}</span>`).join('')}
            <a class="sabx-profile-chip edit" href="/match/">+ EDIT</a>
          </div>
          <div class="sabx-match-total">
            <b>${list.length}</b><span>you actually qualify for</span>
          </div>
          <div class="sabx-match-card">${rows}</div>
          <div class="sabx-match-note">FIT CHECKED AGAINST GRADE, REGION AND FIELD — NOT KEYWORDS.</div>
        </div>
        <div class="sabx-match-foot">
          <button class="sabx-save-all" data-save-all ${picked.length === 0 ? 'disabled' : ''}>${
            picked.length === 0 ? 'Pick at least one'
            : picked.length === 1 ? 'Save 1 & track its deadline'
            : `Save ${picked.length} & track deadlines`
          }</button>
        </div>
      </section>`
  }

  // ── Screen: saved ───────────────────────────────────────────────────────────

  function renderSaved(): string {
    const list = savedIds().map(id => byId.get(id)!).sort(byDeadline)
    const deadlines = list.map(l => l.deadline).filter((d): d is string => !!d)
    const week = weekStrip(today, new Set(deadlines))
    const weeks = deadlineWeeks(today, deadlines)
    const next = list.find(l => l.deadline && statusOf(l, today) === 'active')
    const nextDays = next?.deadline ? daysUntil(next.deadline, today) : null

    const weekHtml = week.map(d => `
      <div class="sabx-week-day ${d.kind}">
        <span class="sabx-week-dow">${d.dow}</span>
        <span class="sabx-week-num">${d.num}</span>
        <span class="sabx-week-dot"></span>
      </div>`).join('')

    const cardsHtml = list.map(l => {
      const chip = chipFor(l, today)
      const pct = timePressure(l, today)
      const days = l.deadline && statusOf(l, today) === 'active' ? daysUntil(l.deadline, today) : null
      return `
        <div class="sabx-sv-card">
          <button class="sabx-sv-top" data-open="${l.id}">
            <span style="flex:1">
              <span class="sabx-sv-name">${esc(l.title)}</span>
              <span class="sabx-sv-meta">${l.deadline ? `DUE ${esc(shortDate(l.deadline))}` : 'NO FIXED DATE'} · ${esc((l.region ?? 'ALBERTA').toUpperCase())}</span>
            </span>
            <span class="sabx-sv-amount">${esc(shortMoney(l.amount))}</span>
          </button>
          <div class="sabx-sv-foot">
            <div class="sabx-sv-track"><div class="sabx-sv-fill" style="width:${pct}%"></div></div>
            <span class="sabx-sv-steps">${days === null ? esc(chip.text) : `${days}D LEFT`}</span>
            <button class="sabx-sv-remove" data-save-id="${l.id}" aria-pressed="true">Remove</button>
          </div>
        </div>`
    }).join('')

    return `
      <section class="sabx-screen sabx-saved">
        <div class="sabx-scroll">
          <div class="sabx-saved-head">
            <h2 class="sabx-saved-h1">Saved</h2>
            <span class="sabx-saved-count">${list.length === 1 ? '1 BOOKMARK' : `${list.length} BOOKMARKS`}</span>
          </div>
          <div class="sabx-week">${weekHtml}</div>
          <div class="sabx-pace">
            <div class="sabx-pace-head">
              <div class="sabx-pace-label">NEXT DEADLINE</div>
              <div class="sabx-pace-value">${nextDays === null ? '—' : nextDays === 0 ? 'Today' : `${nextDays} day${nextDays === 1 ? '' : 's'}`}</div>
            </div>
            <div class="sabx-pace-bars">${weeks.map(on => `<i class="${on ? 'on' : ''}"></i>`).join('')}</div>
            <div class="sabx-pace-note">${next
              ? `${esc(next.title)} closes ${esc(longDate(next.deadline!))}. Filled bars are the next five weeks with a saved deadline in them.`
              : 'Save a listing and its deadline shows up across the next five weeks.'}</div>
          </div>
          ${list.length > 0 ? `
            <div class="sabx-section-label">YOUR SHORTLIST</div>
            ${cardsHtml}
            <button class="sabx-btn-ink" data-export-ics style="width:100%;box-sizing:border-box;margin-top:6px">Add these deadlines to my calendar</button>
          ` : `
            <div class="sabx-empty-big">
              <div class="sabx-section-label">0 BOOKMARKS</div>
              <h3>Nothing saved yet.</h3>
              <p>Save from the feed and every deadline shows up here, with a calendar export and email reminders.</p>
              <button class="sabx-btn-ink" data-go="feed">Open the feed</button>
            </div>`}
        </div>
      </section>`
  }

  // ── Screen: me ──────────────────────────────────────────────────────────────

  function renderMe(): string {
    const answers = readQuiz()
    const chips = profileChips(answers)
    const saved = savedIds().map(id => byId.get(id)!)
    const inPlay = saved.reduce((a, l) => a + l.amountValue, 0)
    const closing = saved.filter(l => l.deadline && statusOf(l, today) === 'active' && daysUntil(l.deadline, today) <= 7).length

    const rows: [string, string, string][] = [
      ['Browse every scholarship', `All ${open().length} open listings, filterable`, '/scholarships/'],
      ['Research programs', 'Summer and enrichment placements', '/programs/'],
      ['Suggest a scholarship', 'Found one we missed? Send it in', 'mailto:contact.scholarab@gmail.com?subject=Scholarship%20suggestion'],
      ['How listings get checked', 'Every deadline verified by hand', '/about/'],
    ]

    return `
      <section class="sabx-screen sabx-me">
        <div class="sabx-scroll">
          <div class="sabx-me-hero">
            <div class="sabx-me-top">
              <div class="sabx-me-av" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2FD3A0" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              </div>
              <div style="flex:1;min-width:0">
                <div class="sabx-me-name">${answers ? 'Your profile' : 'No profile yet'}</div>
                <div class="sabx-me-sub">${answers ? 'STORED ON THIS DEVICE ONLY' : 'TAKE THE QUIZ TO BUILD ONE'}</div>
              </div>
            </div>
            <div class="sabx-me-chips">
              ${chips.map(c => `<span class="sabx-me-chip">${esc(c)}</span>`).join('')}
              <a class="sabx-me-chip edit" href="/match/">+ EDIT</a>
            </div>
            <div class="sabx-me-btns">
              <a class="sabx-me-btn" href="/match/">${answers ? 'Edit profile' : 'Take the quiz'}</a>
              <button class="sabx-me-btn primary" data-share-app>Share ScholarAB</button>
            </div>
          </div>

          <div class="sabx-stats">
            <button class="sabx-stat" data-go="saved"><b>${saved.length}</b><span>SAVED</span></button>
            <div class="sabx-stat"><b>${closing}</b><span>CLOSING ≤7D</span></div>
            <div class="sabx-stat green"><b>${moneyTotal(inPlay)}</b><span>IN PLAY</span></div>
          </div>

          <div class="sabx-me-row" style="padding:18px 20px">
            <div class="sabx-me-row-body">
              <div class="sabx-me-row-label">Deadline reminders</div>
              <div class="sabx-me-row-sub">Email 30, 14 and 3 days before a listing closes. Set one from any listing.</div>
            </div>
          </div>

          <div class="sabx-me-rows">
            ${rows.map(([label, sub, href]) => `
              <a class="sabx-me-row" href="${esc(href)}"${href.startsWith('mailto:') ? '' : ''}>
                <span class="sabx-me-row-body">
                  <span class="sabx-me-row-label">${esc(label)}</span>
                  <span class="sabx-me-row-sub">${esc(sub)}</span>
                </span>
                <span class="sabx-me-row-arrow">›</span>
              </a>`).join('')}
            <div class="sabx-me-foot">MADE IN MEDICINE HAT · FREE FOREVER</div>
          </div>
        </div>
      </section>`
  }

  // ── Detail sheet ────────────────────────────────────────────────────────────

  function renderSheet(): string {
    if (openId === null) return ''
    const l = byId.get(openId)
    if (!l) return ''
    const chip = chipFor(l, today)
    const status = statusOf(l, today)
    const on = isSaved(l.id)
    const canRemind = status === 'active' && !!l.deadline

    return `
      <div class="sabx-sheet-layer" role="dialog" aria-modal="true" aria-label="${esc(l.title)}">
        <button class="sabx-sheet-scrim" data-close-sheet aria-label="Close"></button>
        <div class="sabx-sheet">
          <button class="sabx-sheet-grab" data-close-sheet aria-label="Close"><i></i></button>
          <div class="sabx-sheet-body">
            <div class="sabx-sheet-meta">
              <span class="sabx-sheet-tag">${esc((l.category ?? 'SCHOLARSHIP').toUpperCase())} · ${esc((l.region ?? 'ALBERTA').toUpperCase())}</span>
              <span class="sabx-sheet-chip" style="background:${chip.bg};color:${chip.fg}">${esc(chip.text)}</span>
            </div>
            <div class="sabx-sheet-amount">${esc(l.amount)}</div>
            <div class="sabx-sheet-name">${esc(l.title)}</div>
            <div class="sabx-sheet-org">${esc(orgLine(l))}</div>
            <p class="sabx-sheet-blurb">${esc(l.audience ?? 'Open to Alberta high school students. Full criteria are on the official page.')}</p>

            <div class="sabx-sheet-facts">
              <div class="sabx-sheet-fact">
                <div class="sabx-sheet-fact-label">DEADLINE</div>
                <div class="sabx-sheet-fact-value">${l.deadline ? esc(longDate(l.deadline)) : 'No fixed date'}</div>
              </div>
              <div class="sabx-sheet-fact">
                <div class="sabx-sheet-fact-label">APPLY</div>
                <div class="sabx-sheet-fact-value">${l.guidance ? 'Through your school' : 'Official website'}</div>
              </div>
            </div>

            <div class="sabx-section-label">WHAT YOU NEED</div>
            ${applySteps(l).map(t => `<div class="sabx-step"><i></i><span>${esc(t)}</span></div>`).join('')}

            ${canRemind ? `
              <div class="sabx-remind">
                <div class="sabx-remind-label">GET A DEADLINE REMINDER</div>
                <div class="sabx-remind-sub">We email you 30, 14 and 3 days before it closes. Nothing else, ever.</div>
                <form class="sabx-remind-form" data-remind-form data-item-id="${l.id}">
                  <input type="email" name="email" required autocomplete="email" placeholder="your@email.com" aria-label="Your email" />
                  <button type="submit">Remind me</button>
                </form>
                <div class="sabx-remind-msg" data-remind-msg hidden></div>
              </div>` : ''}

            <div class="sabx-verified">
              <div class="sabx-verified-label">${l.verified ? `HAND-CHECKED ${esc(shortDate(l.verified))}` : 'HAND-CHECKED'}</div>
              <div class="sabx-verified-body">A student opened the official page, read the criteria and typed this in. If it's wrong, tell us and it gets fixed the same week.</div>
            </div>
          </div>

          <div class="sabx-sheet-foot">
            <button class="sabx-sheet-save" data-save-id="${l.id}" aria-pressed="${on}" aria-label="${on ? 'Remove from saved' : 'Save'}">
              <i class="sabx-bookmark" data-save-dot></i>
            </button>
            ${status === 'closed'
              ? '<span class="sabx-sheet-cta disabled">Closed</span>'
              : `<a class="sabx-sheet-cta" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-apply="${l.id}">${
                  status === 'future' ? 'See the official page' : l.guidance ? 'Learn more' : 'Open application'
                } <span>↗</span></a>`}
          </div>
        </div>
      </div>`
  }

  // ── Tab bar ─────────────────────────────────────────────────────────────────

  function renderTabBar(): string {
    const dark = tab === 'feed'
    const n = savedIds().length
    const t = (id: Tab, icon: string, label: string, extra = '') => `
      <button class="sabx-tab${id === 'match' ? ' match' : ''}" data-go="${id}" aria-current="${tab === id ? 'page' : 'false'}">
        ${icon}
        <span class="sabx-tab-label">${label}</span>
        ${id === 'match' ? '' : '<span class="sabx-tab-dot"></span>'}
        ${extra}
      </button>`

    return `
      <nav class="sabx-tabbar${dark ? ' dark' : ''}" aria-label="App sections">
        ${t('feed', '<span class="sabx-ic-feed"></span>', 'FEED')}
        ${t('due', '<span class="sabx-ic-due"></span>', 'DUE')}
        ${t('match', '<span class="sabx-ic-match">+</span>', 'MATCH')}
        ${t('saved', '<span class="sabx-ic-saved"></span>', 'SAVED', `<span class="sabx-tab-badge" data-sabx-badge${n === 0 ? ' hidden' : ''}>${n}</span>`)}
        ${t('me', '<span class="sabx-ic-me"></span>', 'ME')}
      </nav>`
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  /** What has to change for the screen's DOM to be rebuilt from scratch. */
  function screenKey(): string {
    switch (tab) {
      case 'feed':  return `feed:${feedMode}`
      case 'due':   return `due:${query}:${category}`
      // Not keyed on `picks` — those are patched in place by paintSaveAll.
      case 'match': return `match:${matchListings().length}`
      case 'saved': return `saved:${savedIds().join(',')}`
      case 'me':    return `me:${savedIds().join(',')}`
    }
  }

  function render(): void {
    if (!root) return
    const screenHost = root.querySelector<HTMLElement>('[data-sabx-screen]')!
    const key = screenKey()
    if (key !== renderedKey) {
      renderedKey = key
      screenHost.innerHTML =
        tab === 'feed' ? renderFeed()
        : tab === 'due' ? renderDue()
        : tab === 'match' ? renderMatch()
        : tab === 'saved' ? renderSaved()
        : renderMe()
    }

    root.querySelector<HTMLElement>('[data-sabx-sheet]')!.innerHTML = renderSheet()
    root.querySelector<HTMLElement>('[data-sabx-tabbar]')!.innerHTML = renderTabBar()

    const chrome = tab === 'feed' ? { fg: '#F2F0E9', dim: 'rgba(242,240,233,0.55)' } : { fg: '#141915', dim: 'rgba(20,25,21,0.45)' }
    const status = root.querySelector<HTMLElement>('[data-sabx-status]')
    if (status) {
      status.style.color = chrome.fg
      status.style.setProperty('--sabx-chrome-dim', chrome.dim)
    }
    root.querySelector<HTMLElement>('[data-sabx-homebar]')!.className = `sabx-homebar${tab === 'feed' ? ' dark' : ''}`

    paintToast()
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  function onClick(e: MouseEvent): void {
    const t = e.target as Element | null
    if (!root || !t?.closest || !root.contains(t)) return

    const goBtn = t.closest<HTMLElement>('[data-go]')
    if (goBtn) { go(goBtn.dataset.go as Tab); return }

    const feedBtn = t.closest<HTMLElement>('[data-feed]')
    if (feedBtn) {
      feedMode = feedBtn.dataset.feed as FeedMode
      render()
      return
    }

    const openBtn = t.closest<HTMLElement>('[data-open]')
    if (openBtn) {
      openId = Number(openBtn.dataset.open)
      sendEvent('detail_view', 'scholarship', openId)
      render()
      return
    }

    if (t.closest('[data-close-sheet]')) { openId = null; render(); return }

    const saveBtn = t.closest<HTMLElement>('[data-save-id]')
    if (saveBtn) { save(Number(saveBtn.dataset.saveId)); return }

    const pickBtn = t.closest<HTMLElement>('[data-pick]')
    if (pickBtn) {
      const id = Number(pickBtn.dataset.pick)
      picks = { ...picks, [id]: !picks[id] }
      // Patched in place rather than re-rendered: a full rebuild would scroll
      // the list back to the top on every tap, which makes the bottom of a
      // 19-row match list unusable.
      pickBtn.setAttribute('aria-pressed', String(!!picks[id]))
      if (picks[id] && !prefersReducedMotion()) {
        const mark = pickBtn.querySelector<HTMLElement>('.sabx-pick')
        if (mark) { mark.classList.remove('sabx-pop'); void mark.offsetWidth; mark.classList.add('sabx-pop') }
      }
      paintSaveAll()
      return
    }

    if (t.closest('[data-save-all]')) {
      const chosen = matchListings().filter(l => picks[l.id])
      if (chosen.length === 0) { say('Tap a row to pick it'); return }
      let added = 0
      for (const l of chosen) {
        if (!isSaved(l.id)) { toggleSaved(l.id); sendEvent('save', 'scholarship', l.id); added++ }
      }
      tab = 'saved'
      render()
      say(added === 0 ? 'Already in your shortlist' : `${added} saved · deadlines tracked`)
      return
    }

    const catBtn = t.closest<HTMLElement>('[data-cat]')
    if (catBtn) { category = catBtn.dataset.cat!; render(); return }

    if (t.closest('[data-clear-query]')) {
      query = ''
      render()
      root.querySelector<HTMLInputElement>('[data-sabx-query]')?.focus()
      return
    }

    const shareBtn = t.closest<HTMLElement>('[data-share]')
    if (shareBtn) {
      const l = byId.get(Number(shareBtn.dataset.share))
      if (l) void share(l.title, listingUrl(l))
      return
    }

    if (t.closest('[data-share-app]')) { void share('ScholarAB', `${SITE}/`); return }

    if (t.closest('[data-export-ics]')) {
      const list = savedIds().map(id => byId.get(id)!)
      downloadICS(list.map(l => ({ id: l.id, title: l.title, amount: l.amount, url: l.url, deadline: l.deadline })), [])
      say('Calendar file downloaded')
      return
    }

    const apply = t.closest<HTMLElement>('[data-apply]')
    if (apply) sendEvent('apply_click', 'scholarship', Number(apply.dataset.apply))
  }

  async function share(title: string, url: string): Promise<void> {
    try {
      if (navigator.share) { await navigator.share({ title, url }); return }
      await navigator.clipboard.writeText(url)
      say('Link copied')
    } catch {
      // A cancelled share sheet rejects too — nothing to report either way.
    }
  }

  function onInput(e: Event): void {
    const input = (e.target as Element).closest<HTMLInputElement>('[data-sabx-query]')
    if (!input) return
    query = input.value
    const start = input.selectionStart
    render()
    // The list rebuild replaces the input, so restore focus and the caret.
    const fresh = root?.querySelector<HTMLInputElement>('[data-sabx-query]')
    if (fresh) {
      fresh.focus()
      if (start !== null) fresh.setSelectionRange(start, start)
    }
    if (query.trim().length >= 3 && dueListings().length === 0) sendEvent('search_empty', undefined, undefined, query.trim().toLowerCase())
  }

  // Capture phase + stopPropagation: Astro's ClientRouter listens for submit at
  // the document level and would swap the page out from under the form.
  async function onSubmit(e: Event): Promise<void> {
    const form = (e.target as Element).closest<HTMLFormElement>('[data-remind-form]')
    if (!form) return
    e.preventDefault()
    e.stopPropagation()
    const itemId = Number(form.dataset.itemId)
    const email = form.querySelector<HTMLInputElement>('input[name="email"]')!.value
    const btn = form.querySelector('button')!
    const msg = form.parentElement?.querySelector<HTMLElement>('[data-remind-msg]')
    btn.disabled = true
    btn.textContent = 'Saving…'
    const fail = (text: string) => {
      btn.disabled = false
      btn.textContent = 'Remind me'
      if (msg) { msg.textContent = text; msg.style.color = 'rgba(20,25,21,0.6)'; msg.hidden = false }
    }
    try {
      const res = await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, itemType: 'scholarship', itemId }),
      })
      const data = await res.json() as { error?: string }
      if (res.ok) {
        form.hidden = true
        if (msg) { msg.textContent = "✓ Set — we'll nudge you before the deadline."; msg.hidden = false }
      } else {
        fail(data.error || 'Something went wrong.')
      }
    } catch {
      fail('Something went wrong. Try again.')
    }
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && openId !== null) { openId = null; render() }
  }

  document.addEventListener('click', onClick)
  document.addEventListener('input', onInput)
  document.addEventListener('submit', e => void onSubmit(e), true)
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('storage', e => {
    if (e.key === 'scholarab_saved') { renderedKey = ''; render() }
  })

  document.addEventListener('astro:page-load', () => {
    root = document.querySelector<HTMLElement>('#sabx-app')
    if (!root) return

    const payload = document.getElementById('sabx-data')?.textContent
    if (!payload) return
    items = (JSON.parse(payload) as WireItem[]).map(expandItem)
    byId.clear()
    for (const l of items) byId.set(l.id, l)

    // Re-derive from the visitor's clock, not the build's: the page is
    // prerendered and served from a CDN, so every day chip here would
    // otherwise be as stale as the last deploy.
    today = midnight()

    tab = 'feed'
    feedMode = 'foryou'
    query = ''
    category = 'ALL'
    openId = null
    picks = {}
    picksSeeded = false
    renderedKey = ''
    render()

    const skeleton = root.querySelector<HTMLElement>('[data-sabx-skeleton]')
    if (skeleton) skeleton.hidden = true
  })
}
