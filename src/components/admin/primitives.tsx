// Shared pieces for the admin managers. Behaviour stays in the managers;
// these only draw. Styles are the .adm-* rules in styles/admin.css.
import { useEffect, useRef, type ReactNode } from 'react'
import type { Scoreboard as ScoreboardData, ScoreCell } from '../../lib/admin-scoreboard'

/** One stroke, one weight, drawn here rather than pulled in for four glyphs. */
export function Icon({ name, size = 16 }: { name: 'search' | 'close' | 'chevron' | 'prev' | 'next' | 'open'; size?: number }) {
  const d = {
    search: <><circle cx="7" cy="7" r="4.6" /><path d="M10.6 10.6 14 14" /></>,
    close: <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />,
    chevron: <path d="M6 3.5 10.5 8 6 12.5" />,
    prev: <path d="M10 3.5 5.5 8 10 12.5" />,
    next: <path d="M6 3.5 10.5 8 6 12.5" />,
    open: <path d="M3 8h9.5M8.5 4l4 4-4 4" />,
  }[name]
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d}
    </svg>
  )
}

export function AdminSearch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="adm-search">
      <Icon name="search" />
      <input
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="adm-input"
      />
    </div>
  )
}

export function AdminTabBar({ tabs, counts, active, onSelect, label }: {
  tabs: string[]
  counts: Record<string, number>
  active: string
  onSelect: (tab: string) => void
  label: string
}) {
  return (
    <div className="adm-facets" role="group" aria-label={label}>
      {tabs.map(t => (
        <button key={t} type="button" className="adm-facet" onClick={() => onSelect(t)} aria-pressed={active === t}>
          {t}<span>{(counts[t] ?? 0).toLocaleString('en-CA')}</span>
        </button>
      ))}
    </div>
  )
}

export function AdminPagination({ page, totalPages, total, totalWord, onPage }: {
  page: number
  totalPages: number
  total: number
  /** The word after the count; 'results' (scholarships) or 'total' (programs). */
  totalWord: string
  onPage: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="adm-pager">
      <span>Page {page + 1} of {totalPages}, {total.toLocaleString('en-CA')} {totalWord}</span>
      <div>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0}>
          <Icon name="prev" />Previous
        </button>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={() => onPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>
          Next<Icon name="next" />
        </button>
      </div>
    </div>
  )
}

/** Escape closes, focus moves in on open and back out on close. */
function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')
    ;(first ?? ref.current)?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); before?.focus?.() }
    // Only on open: re-running on every render would steal focus while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return ref
}

/** The editor and the publish review: a sheet from the right, the list still in view. */
export function AdminSheet({ id, title, sub, onClose, footer, children }: {
  id: string
  title: string
  sub?: ReactNode
  onClose: () => void
  footer: ReactNode
  children: ReactNode
}) {
  const ref = useDialog(onClose)
  return (
    <>
      <div className="adm-scrim" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} className="adm-sheet" tabIndex={-1}>
        <div className="adm-sheet-head">
          <div>
            <h2 id={`${id}-title`}>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button type="button" className="adm-x" onClick={onClose} aria-label="Close" data-close><Icon name="close" size={18} /></button>
        </div>
        <div className="adm-sheet-body">{children}</div>
        <div className="adm-sheet-foot">{footer}</div>
      </div>
    </>
  )
}

export function AdminDeleteModal({ idPrefix, entityLabel, itemName, saving, onCancel, onConfirm }: {
  idPrefix: string
  entityLabel: string
  itemName: string | undefined
  saving: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const ref = useDialog(onCancel)
  return (
    <>
      <div className="adm-scrim" onClick={onCancel} style={{ zIndex: 52 }} />
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby={`${idPrefix}-delete-title`} className="adm-confirm" style={{ zIndex: 53 }}>
        <h2 id={`${idPrefix}-delete-title`}>Delete this {entityLabel}?</h2>
        <p>{itemName ? `${itemName} comes off the site` : 'It comes off the site'} at the next publication. Until then it stays in the drafts.</p>
        <div>
          <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel} disabled={saving}>Keep it</button>
          <button type="button" className="adm-btn adm-btn-delete" onClick={onConfirm} disabled={saving}>{saving ? 'Deleting' : 'Delete'}</button>
        </div>
      </div>
    </>
  )
}

/** Collapsible group inside a sheet. */
export function AdminSection({ title, open, onToggle, aside, children }: {
  title: string
  open: boolean
  onToggle: () => void
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="adm-section">
      <div className="adm-section-toggle">
        <button type="button" onClick={onToggle} aria-expanded={open}>
          <Icon name="chevron" />{title}
        </button>
        {aside}
      </div>
      {open && children}
    </div>
  )
}

/** "2026-10-09" as the big day and a short month line, like the public rows. */
export function DeadlineFigure({ date, today }: { date?: string | null; today: string }) {
  if (!date) return <div className="adm-when" data-none><b>&ndash;</b><span>No date</span></div>
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return <div className="adm-when" data-none><b>&ndash;</b><span>{date}</span></div>
  const month = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-CA', { month: 'short', timeZone: 'UTC' })
  return (
    <div className="adm-when" data-past={date < today ? '' : undefined} title={date < today ? 'Deadline has passed' : undefined}>
      <b>{d}</b><span>{month} {y}</span>
    </div>
  )
}

/** Today in Alberta as YYYY-MM-DD, the timezone every deadline is written in. */
export function albertaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Edmonton', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

/** The strip of figures under the bar. The analytics page passes its own
    period cells and controls; every other page shows this month so far. */
export function Scoreboard({ title, sub, cells, children }: {
  title: string
  sub?: string
  cells: ScoreCell[]
  children?: ReactNode
}) {
  return (
    <section className="adm-score" aria-label="Scoreboard" style={{ ['--adm-score-n' as string]: cells.length }}>
      <div className="adm-score-head">
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
        {children}
      </div>
      {cells.map(c => (
        <div key={c.key} className="adm-cell">
          <span className="adm-cell-fig" data-empty={c.value === null ? '' : undefined}>
            {c.value === null ? 'n/a' : c.value.toLocaleString('en-CA')}
          </span>
          <span className="adm-cell-label">{c.label}</span>
          <span className="adm-cell-note" data-trend={c.trend ?? undefined}>{c.note}</span>
        </div>
      ))}
    </section>
  )
}

export type { ScoreboardData }
