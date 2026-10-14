import { useMemo, useState } from 'react'
import { Scoreboard } from './primitives'
import type { ScoreCell } from '../../lib/admin-scoreboard'

export interface AnalyticsData {
  /** Every event, bucketed by Alberta calendar month. */
  monthly: { month: string; event: string; n: number }[]
  perItem: { month: string; event: string; itemType: string | null; itemId: number | null; n: number }[]
  daily: { day: string; n: number }[]
  emptySearches: { month: string; q: string | null; n: number }[]
  /** Saves by the button used: page, row or quiz. null = before 2026-09-26. */
  saveFrom?: { month: string; from: string | null; n: number }[]
  /** Live email list: people = distinct addresses, reminders = rows. */
  subscribers: { people: number; reminders: number; pending?: number }
  monthlySubs: { month: string; people: number; reminders: number }[]
  perItemSubs: { month: string; itemType: string; itemId: number; n: number }[]
  /** Google Search Console totals per month, from the committed snapshot.
      A different metric from the events above: clicks are search visits, and
      they are the only measured numbers that exist before Jul 17 2026. */
  search: { month: string; clicks: number; impressions: number; position: number | null; days: number }[]
  /** The day the search snapshot was taken, so a stale one is visible. */
  searchGenerated?: string
  titles: { scholarship: Record<number, string>; program: Record<number, string> }
  /** "YYYY-MM" for today in Alberta, so the tabs reach the month we are in
      even before anything has happened in it. Supplied by the page. */
  currentMonth?: string
  error?: boolean
}

const SAVE_PLACES: [string, string][] = [
  ['page', 'Listing page'],
  ['row', 'Directory row'],
  ['quiz', 'Quiz results'],
  ['none', 'Not recorded (before Sep 26 2026)'],
]

interface Props {
  data: AnalyticsData
}

const EVENT_LABELS: Record<string, string> = {
  detail_view: 'Detail views',
  apply_click: 'Apply clicks',
  save: 'Saves',
  quiz_complete: 'Quiz completions',
  alert_subscribe: 'Alert signups',
  app_status: 'Saved awards marked (working, submitted, won)',
}

/** Compact column headers for the by-month table; the tile labels are too long. */
const MONTH_COLUMNS: { key: string; label: string }[] = [
  { key: 'detail_view', label: 'Views' },
  { key: 'apply_click', label: 'Applies' },
  { key: 'save', label: 'Saves' },
  { key: 'quiz_start', label: 'Quiz start' },
  { key: 'quiz_complete', label: 'Quiz done' },
  { key: 'search_empty', label: 'No results' },
  { key: 'alert_subscribe', label: 'Alerts' },
]

/**
 * The first month each counter was actually recording, so a month before it
 * can say so instead of showing a zero. A zero is a claim that nobody did the
 * thing; these months are ones where nothing was watching. The events table
 * itself starts 2026-07-17, and the dates after that are the fixes from the
 * Aug 2026 accuracy audit, where save turned out never to have fired from most
 * of the site.
 *
 * app_step ("Applications started") is gone: the application-step ticker it
 * counted was deleted with /app in Aug 2026, so the tile could only ever show
 * its one historical row.
 */
const EVENT_COVERED_FROM: Record<string, string> = {
  detail_view: '2026-07',
  apply_click: '2026-07',
  quiz_start: '2026-07',
  quiz_complete: '2026-07',
  search_empty: '2026-07',
  save: '2026-08',
  alert_subscribe: '2026-08',
  app_status: '2026-10',
}

interface SearchTotals {
  clicks: number
  impressions: number
  /** Clicks per impression, or null with nothing to divide by. */
  ctr: number | null
  /** Average rank, weighted by impressions. Null when the month is empty. */
  position: number | null
}

const SEARCH_COLUMNS: { key: keyof SearchTotals; label: string; format: (v: number | null) => string }[] = [
  { key: 'clicks', label: 'Search', format: v => (v ?? 0).toLocaleString() },
  { key: 'impressions', label: 'Impr.', format: v => (v ?? 0).toLocaleString() },
  { key: 'ctr', label: 'CTR', format: v => (v === null ? '-' : `${(v * 100).toFixed(1)}%`) },
  { key: 'position', label: 'Pos.', format: v => (v === null ? '-' : v.toFixed(1)) },
]

const ALL = 'all'

/** "2026-07" → "Jul 2026". Parsed as UTC so the label can't slip a month. */
/** "2026-10-12" as "Mon, Oct 12", so a weekend dip reads as one. */
function dayLabel(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-CA', {
    month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

interface ItemRow {
  key: string
  title: string
  itemType: string
  views: number
  applies: number
  rate: number | null
  saves: number
  alerts: number
  onList: number
}

type SortKey = keyof Pick<ItemRow, 'title' | 'itemType' | 'views' | 'applies' | 'rate' | 'saves' | 'alerts' | 'onList'>

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'title',    label: 'Item',       numeric: false },
  { key: 'views',    label: 'Views',      numeric: true },
  { key: 'applies',  label: 'Applies',    numeric: true },
  { key: 'rate',     label: 'Apply rate', numeric: true },
  { key: 'saves',    label: 'Saves',      numeric: true },
  { key: 'alerts',   label: 'Alerts',     numeric: true },
  { key: 'onList',   label: 'On list',    numeric: true },
]

function buildItemRows(data: AnalyticsData, month: string): ItemRow[] {
  const map = new Map<string, ItemRow>()
  const inScope = (m: string) => month === ALL || m === month

  const rowFor = (itemType: string, itemId: number): ItemRow => {
    const key = `${itemType}:${itemId}`
    let row = map.get(key)
    if (!row) {
      row = {
        key,
        title: (itemType === 'program' ? data.titles.program : data.titles.scholarship)[itemId] ?? `#${itemId}`,
        itemType,
        views: 0, applies: 0, rate: null, saves: 0, alerts: 0, onList: 0,
      }
      map.set(key, row)
    }
    return row
  }

  for (const e of data.perItem) {
    if (e.itemId == null || !e.itemType || !inScope(e.month)) continue
    const row = rowFor(e.itemType, e.itemId)
    if (e.event === 'detail_view') row.views += e.n
    else if (e.event === 'apply_click') row.applies += e.n
    else if (e.event === 'save') row.saves += e.n
    else if (e.event === 'alert_subscribe') row.alerts += e.n
  }

  // An item can have live reminders without a single event in the period;
  // signups from before it, and everything lost while the event write was
  // being dropped. Those items still belong in the table.
  for (const s of data.perItemSubs) {
    if (!inScope(s.month)) continue
    rowFor(s.itemType, s.itemId).onList += s.n
  }

  for (const row of map.values()) {
    row.rate = row.views > 0 ? row.applies / row.views : null
  }
  return [...map.values()]
}

export default function AnalyticsPanel({ data }: Props) {
  const [month, setMonth] = useState<string>(ALL)
  const [sortKey, setSortKey] = useState<SortKey>('applies')
  const [sortDesc, setSortDesc] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | 'scholarship' | 'program'>('all')
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  // Newest first, and never skip a quiet month: a gap in the list would read as
  // "no data collected" rather than "nobody did anything". The same reasoning
  // runs the list forward to the current month, whether or not it has rows yet
  // -- a September that only appears once somebody clicks something is a panel
  // that looks a day stale every time a month turns over.
  const months = useMemo(() => {
    // The list starts where the events table does, not where the oldest row of
    // any kind does. Email signups and Search Console both reach back further,
    // but a month with no events in it is a screen of blanks whatever else is
    // known about it, so Mar to Jun 2026 are left off rather than shown empty.
    const events = data.monthly.map(m => m.month).filter(Boolean)
    const floor = events.length > 0 ? events.reduce((a, b) => (a < b ? a : b)) : null
    const seen = [
      ...events,
      ...data.monthlySubs.map(m => m.month),
      ...data.search.map(m => m.month),
    ].filter(m => Boolean(m) && (floor === null || m >= floor))
    if (seen.length === 0) return data.currentMonth ? [data.currentMonth] : []
    const first = seen.reduce((a, b) => (a < b ? a : b))
    const newest = seen.reduce((a, b) => (a > b ? a : b))
    // Only ever forward. A clock behind the data would otherwise drop the
    // months past it off the end of the list.
    const last = data.currentMonth && data.currentMonth > newest ? data.currentMonth : newest
    const out: string[] = []
    const [fy, fm] = first.split('-').map(Number)
    const cursor = new Date(Date.UTC(fy!, fm! - 1, 1))
    while (true) {
      const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`
      out.push(key)
      if (key >= last) break
      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    }
    return out.reverse()
  }, [data.monthly, data.monthlySubs, data.search, data.currentMonth])

  /** Event counts for one month, or every month when `m` is ALL. */
  const countsFor = useMemo(() => {
    const byMonth = new Map<string, Record<string, number>>()
    const total: Record<string, number> = {}
    for (const r of data.monthly) {
      const bucket = byMonth.get(r.month) ?? {}
      bucket[r.event] = (bucket[r.event] ?? 0) + r.n
      byMonth.set(r.month, bucket)
      total[r.event] = (total[r.event] ?? 0) + r.n
    }
    return (m: string): Record<string, number> => (m === ALL ? total : byMonth.get(m) ?? {})
  }, [data.monthly])

  const subsFor = useMemo(() => {
    const byMonth = new Map<string, { people: number; reminders: number }>()
    for (const r of data.monthlySubs) byMonth.set(r.month, { people: r.people, reminders: r.reminders })
    return (m: string) => (m === ALL ? data.subscribers : byMonth.get(m) ?? { people: 0, reminders: 0 })
  }, [data.monthlySubs, data.subscribers])

  const searchFor = useMemo(() => {
    // Only the months the panel shows. Search Console has Mar to Jun too, but
    // counting them in the all-time total would leave it larger than the sum
    // of the rows above it, with nothing on screen to explain the difference.
    const shown = new Set(months)
    const rows = data.search.filter(r => shown.has(r.month))

    const derive = (clicks: number, impressions: number, position: number | null): SearchTotals => ({
      clicks, impressions, position,
      ctr: impressions > 0 ? clicks / impressions : null,
    })

    const byMonth = new Map(
      rows.map(r => [r.month, derive(r.clicks, r.impressions, r.position)]),
    )

    // All time is not an average of the monthly averages: a quiet March
    // ranking 3rd would otherwise outvote an August of 14,000 impressions.
    // Weighting by impressions is the same thing Search Console reports.
    let clicks = 0, impressions = 0, posSum = 0, posImpressions = 0
    for (const r of rows) {
      clicks += r.clicks
      impressions += r.impressions
      if (r.position !== null) { posSum += r.position * r.impressions; posImpressions += r.impressions }
    }
    const total = derive(clicks, impressions, posImpressions > 0 ? posSum / posImpressions : null)

    const empty: SearchTotals = { clicks: 0, impressions: 0, ctr: null, position: null }
    return (m: string) => (m === ALL ? total : byMonth.get(m) ?? empty)
  }, [data.search, months])

  const counts = countsFor(month)
  const subs = subsFor(month)
  const search = searchFor(month)
  // The month directly before the selected one, for the "vs" line on each tile
  const prevMonth = month === ALL ? null : months[months.indexOf(month) + 1] ?? null
  const prevCounts = prevMonth ? countsFor(prevMonth) : null
  const prevSearch = prevMonth ? searchFor(prevMonth) : null

  const allRows = useMemo(() => buildItemRows(data, month), [data, month])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = allRows.filter(r =>
      (typeFilter === 'all' || r.itemType === typeFilter) &&
      (q === '' || r.title.toLowerCase().includes(q))
    )
    const dir = sortDesc ? -1 : 1
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      let cmp: number
      if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv)
      // null rates (no views) always sort below real rates, in either direction
      else if (av == null || bv == null) return av == null && bv == null ? 0 : av == null ? 1 : -1
      else cmp = (av as number) - (bv as number)
      if (cmp !== 0) return cmp * dir
      return b.views - a.views
    })
  }, [allRows, typeFilter, query, sortKey, sortDesc])

  // Rows arrive as "query | /path" since 2026-09-09. Aggregate on the query,
  // or the same dead end typed on three pages reads as three smaller ones,
  // and keep the paths as a second line: where students hunt for a term is
  // its own signal about which hub is missing a facet.
  const searches = useMemo(() => {
    const merged = new Map<string, { n: number; paths: Map<string, number> }>()
    for (const s of data.emptySearches) {
      if (!s.q || (month !== ALL && s.month !== month)) continue
      const [q, path] = s.q.split(' | ')
      const key = (q ?? s.q).trim()
      if (!key) continue
      const row = merged.get(key) ?? { n: 0, paths: new Map<string, number>() }
      row.n += s.n
      if (path) row.paths.set(path, (row.paths.get(path) ?? 0) + s.n)
      merged.set(key, row)
    }
    return [...merged.entries()]
      .sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))
      .map(([q, row]) => ({
        q,
        n: row.n,
        paths: [...row.paths.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p),
      }))
  }, [data.emptySearches, month])

  const saves = useMemo(() => {
    const by: Record<string, number> = {}
    for (const s of data.saveFrom ?? []) {
      if (month !== ALL && s.month !== month) continue
      const key = s.from ?? 'none'
      by[key] = (by[key] ?? 0) + s.n
    }
    let views = 0
    for (const m of data.monthly) {
      if (m.event === 'detail_view' && (month === ALL || m.month === month)) views += m.n
    }
    const total = Object.values(by).reduce((a, b) => a + b, 0)
    return {
      total,
      per100: views > 0 ? (total / views) * 100 : null,
      rows: SAVE_PLACES.map(([key, label]) => ({ key, label, n: by[key] ?? 0 })).filter(r => r.n > 0 || r.key !== 'none'),
    }
  }, [data.saveFrom, data.monthly, month])

  // How it works: how many opened it and how many went on to the quiz from
  // it. Every count is people per tab session, as sendEvent dedupes.
  const tour = useMemo(() => {
    let opens = 0, cta = 0
    for (const m of data.monthly) {
      if (month !== ALL && m.month !== month) continue
      if (m.event === 'tour_open') opens += m.n
      else if (m.event === 'tour_cta') cta += m.n
    }
    return { opens, cta, pct: opens > 0 ? `${Math.round((cta / opens) * 100)}%` : '' }
  }, [data.monthly, month])

  // Every calendar day in the period, newest first, quiet days at 0: the
  // rows only exist for days with events, so a dead day used to vanish
  // instead of reading as a gap (Ilia, 2026-10-12, "every single day").
  const dailyRows = useMemo(() => {
    const byDay = new Map(data.daily.map(d => [d.day, d.n]))
    const days = data.daily.map(d => d.day).filter(d => month === ALL || d.startsWith(month))
    if (days.length === 0) return []
    const first = month === ALL ? days[0] : `${month}-01`
    const last = days[days.length - 1]
    const out: { day: string; n: number }[] = []
    for (let t = Date.parse(`${first}T00:00:00Z`); t <= Date.parse(`${last}T00:00:00Z`); t += 86400000) {
      const day = new Date(t).toISOString().slice(0, 10)
      out.push({ day, n: byDay.get(day) ?? 0 })
    }
    return out.reverse()
  }, [data.daily, month])

  if (data.error) {
    return (
      <p className="adm-alert">
        Couldn&apos;t load analytics. Check that the events table exists and DATABASE_URL is set.
      </p>
    )
  }

  const handleSort = (key: SortKey, numeric: boolean) => {
    if (sortKey === key) setSortDesc(d => !d)
    else { setSortKey(key); setSortDesc(numeric) } // numeric cols start desc, text cols asc
  }

  const visible = showAll ? rows : rows.slice(0, 15)
  const maxDaily = Math.max(1, ...dailyRows.map(d => d.n))
  const periodLabel = month === ALL ? 'all time' : monthLabel(month)
  const n = (v: number) => v.toLocaleString('en-CA')

  // The scoreboard for the chosen period: the same strip every admin page
  // carries, here driven by the period picker inside it.
  const cells: ScoreCell[] = [
    ...Object.entries(EVENT_LABELS).map(([event, label]): ScoreCell => {
      const from = EVENT_COVERED_FROM[event]
      // A month that predates the counter reads "not counted", never 0.
      const uncounted = month !== ALL && from !== undefined && month < from
      const value = counts[event] ?? 0
      const starts = counts['quiz_start'] ?? 0
      const prev = prevCounts && !(prevMonth && from && prevMonth < from) ? prevCounts[event] ?? 0 : null
      return {
        key: event,
        label: event === 'app_status' ? 'Marked in My combo' : event === 'alert_subscribe' ? 'Alert signups' : event === 'quiz_complete' ? 'Quiz done' : label,
        value: uncounted ? null : value,
        note: uncounted
          ? `Not counted until ${monthLabel(from!)}`
          : event === 'quiz_complete' && starts > 0
            ? `${Math.round((value / starts) * 100)}% of ${n(starts)} starts`
            : prev !== null ? `${n(prev)} in ${monthLabel(prevMonth!)}` : '',
        trend: !uncounted && prev !== null && prev > 0 ? (value >= prev ? 'up' : 'down') : null,
      }
    }),
    // Search Console, not the events table: the only measured numbers that
    // exist for the months before Jul 17 2026.
    ...SEARCH_COLUMNS.filter(col => col.key === 'clicks' || col.key === 'impressions').map((col): ScoreCell => {
      const prev = prevSearch && prevMonth ? prevSearch[col.key] : null
      const value = search[col.key] ?? 0
      return {
        key: col.key,
        label: col.key === 'clicks' ? 'Google clicks' : 'Google impressions',
        value,
        note: prev !== null ? `${col.format(prev)} in ${monthLabel(prevMonth!)}` : '',
        trend: prev !== null && prev > 0 ? (value >= prev ? 'up' : 'down') : null,
      }
    }),
    // Live list, not a windowed event count: unsubscribing removes the row,
    // so all time is who is actually on email right now.
    {
      key: 'email',
      label: month === ALL ? 'On email' : 'Joined email',
      value: subs.people,
      note: `${n(subs.reminders)} reminder${subs.reminders === 1 ? '' : 's'} set${month === ALL && (data.subscribers.pending ?? 0) > 0 ? `, ${data.subscribers.pending} unconfirmed` : ''}`,
      trend: null,
    },
  ]

  return (
    <div>
      <div className="adm-full-bleed">
        <div className="adm-periodbar" role="group" aria-label="Period">
          <button type="button" className="adm-facet" aria-pressed={month === ALL} onClick={() => setMonth(ALL)}>All time</button>
          {months.map(m => (
            <button key={m} type="button" className="adm-facet" aria-pressed={month === m} onClick={() => setMonth(m)}>{monthLabel(m)}</button>
          ))}
        </div>
        <Scoreboard title={month === ALL ? 'All time' : monthLabel(month)} sub={month === ALL ? 'Since Jul 17 2026' : 'Alberta time'} cells={cells} />
      </div>

      <div className="adm-head" style={{ marginTop: 36 }}>
        <div>
          <h1 className="adm-title">Analytics</h1>
          <p className="adm-sub">Anonymous counts by Alberta month. One count per item per tab session, with no cookies, IPs or user ids.</p>
        </div>
      </div>

      <section className="adm-block">
        <h2 className="adm-h2">Every month <small>click a month to see it above</small></h2>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Month</th>
                {MONTH_COLUMNS.map(c => <th key={c.key} data-num>{c.label}</th>)}
                <th data-num>On email</th>
                {SEARCH_COLUMNS.map(c => <th key={c.key} data-num>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {months.length === 0 && (
                <tr><td colSpan={MONTH_COLUMNS.length + SEARCH_COLUMNS.length + 2} data-dim>
                  No events yet. Data appears as students use the site.
                </td></tr>
              )}
              {months.map(m => {
                const c = countsFor(m)
                return (
                  <tr key={m} data-click onClick={() => setMonth(m)} aria-selected={month === m}>
                    <td>{monthLabel(m)}</td>
                    {MONTH_COLUMNS.map(col => {
                      const from = EVENT_COVERED_FROM[col.key]
                      const uncounted = from !== undefined && m < from
                      return (
                        <td key={col.key} data-num data-dim={uncounted ? '' : undefined} title={uncounted ? `Not counted until ${monthLabel(from)}` : undefined}>
                          {uncounted ? 'n/a' : n(c[col.key] ?? 0)}
                        </td>
                      )
                    })}
                    <td data-num data-dim>{n(subsFor(m).reminders)}</td>
                    {SEARCH_COLUMNS.map(col => (
                      <td key={col.key} data-num data-dim>{col.format(searchFor(m)[col.key])}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
            {months.length > 0 && (
              <tfoot>
                <tr>
                  <td>Total</td>
                  {MONTH_COLUMNS.map(col => <td key={col.key} data-num>{n(countsFor(ALL)[col.key] ?? 0)}</td>)}
                  <td data-num>{n(data.subscribers.reminders)}</td>
                  {SEARCH_COLUMNS.map(col => <td key={col.key} data-num>{col.format(searchFor(ALL)[col.key])}</td>)}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <details className="adm-details">
          <summary><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" /></svg>How to read this table</summary>
          <p className="adm-note">
            On email counts signups from that month that are still active, read from the list itself, so the Total is
            the list as it stands today rather than the sum of the months above it. n/a is a month before that
            column existed, which is not the same as a zero. The events table starts Jul 17 2026, Saves only
            began recording Aug 4 2026, Started Aug 8 2026, and Alerts was being dropped before Aug 4 2026, so
            it under-reports every month up to then. The panel starts at Jul 2026 for the same reason. Mar
            to Jun have Search Console figures and 19 email signups, but no events, so they are left off
            rather than shown as a screen of blanks. Search and Impr. come from Google Search Console rather than this
            site, which is why Mar to mid-Jul have numbers at all. They count search visits and are not
            comparable to Views. Pos. is the average rank of the pages that were shown, weighted by
            impressions, so a rising number can mean new pages entering low rather than old ones
            slipping. Mar 2026 covers 10 days, the property&apos;s first.{' '}
            {data.searchGenerated ? `Search figures last pulled ${data.searchGenerated}.` : null}
          </p>
        </details>
      </section>

      <section className="adm-block">
        <div className="adm-head" style={{ marginBottom: 12, alignItems: 'center' }}>
          <h2 className="adm-h2" style={{ margin: 0 }}>By listing <small>{periodLabel}</small></h2>
          <div className="adm-actions">
            <div className="adm-periods" role="group" aria-label="Listing type">
              {(['all', 'scholarship', 'program'] as const).map(t => (
                <button key={t} type="button" className="adm-facet" aria-pressed={typeFilter === t} onClick={() => setTypeFilter(t)}>
                  {t === 'all' ? 'All' : t === 'scholarship' ? 'Scholarships' : 'Programs'}
                </button>
              ))}
            </div>
            <input
              type="search"
              aria-label="Filter by name"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filter by name"
              className="adm-input"
              style={{ width: 220, height: 36 }}
            />
          </div>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th key={col.key} data-num={col.numeric ? '' : undefined}
                    aria-sort={sortKey === col.key ? (sortDesc ? 'descending' : 'ascending') : undefined}>
                    <button type="button" onClick={() => handleSort(col.key, col.numeric)}>
                      {col.label}
                      <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" style={{ opacity: sortKey === col.key ? 1 : 0, transform: sortDesc ? 'none' : 'rotate(180deg)' }}>
                        <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="#4AA873" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={COLUMNS.length} data-dim>
                  {allRows.length === 0 ? `Nothing recorded in ${periodLabel}.` : 'Nothing matches this filter.'}
                </td></tr>
              )}
              {visible.map(row => (
                <tr key={row.key}>
                  <td>{row.title}{row.itemType === 'program' && <small>Program</small>}</td>
                  <td data-num>{n(row.views)}</td>
                  <td data-num>{n(row.applies)}</td>
                  <td data-num data-dim>{row.rate !== null ? `${Math.round(row.rate * 100)}%` : '·'}</td>
                  <td data-num>{n(row.saves)}</td>
                  <td data-num>{n(row.alerts)}</td>
                  <td data-num>{n(row.onList)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="adm-pager" style={{ alignItems: 'flex-start', gap: 24 }}>
          <p className="adm-note" style={{ margin: 0 }}>
            Applies include clicks from list rows, which skip the detail page, so rates above 100% are possible.
            On list counts reminders signed up in this period and still active.
          </p>
          {rows.length > 15 && (
            <button type="button" onClick={() => setShowAll(s => !s)} className="adm-btn adm-btn-ghost">
              {showAll ? 'Show top 15' : `Show all ${rows.length}`}
            </button>
          )}
        </div>
      </section>

      <div className="adm-split">
        <section>
          <h2 className="adm-h2">Searches with no results <small>{periodLabel}{searches.length > 0 && `, ${n(searches.length)} different`}</small></h2>
          <div className="adm-table-wrap adm-scroll">
            <table className="adm-table">
              <tbody>
                {searches.length === 0 && (
                  <tr><td data-dim>Nothing yet. These are scholarships students looked for and didn&apos;t find.</td></tr>
                )}
                {searches.map(({ q, n: count, paths }) => (
                  <tr key={q}>
                    <td>{q}{paths.length > 0 && <small>{paths.join('   ')}</small>}</td>
                    <td data-num data-dim style={{ verticalAlign: 'top' }}>{count}&times;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Which save button gets used */}
          <div className="adm-block">
            <h2 className="adm-h2">
              Where saves happen <small>{periodLabel}{saves.per100 !== null && `, ${saves.per100.toFixed(1)} per 100 views`}</small>
            </h2>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <tbody>
                  {saves.rows.map(r => (
                    <tr key={r.key}>
                      <td>{r.label}</td>
                      <td data-num>{n(r.n)}</td>
                      <td data-num data-dim style={{ width: 64 }}>{saves.total > 0 ? `${Math.round((r.n / saves.total) * 100)}%` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </section>

        <section>
          <div className="adm-block">
            <h2 className="adm-h2">
              Events per day <small>{periodLabel}, newest first</small>
            </h2>
            <div className="adm-bars adm-scroll">
              {dailyRows.length === 0 && <p className="adm-note">No activity in this period.</p>}
              {dailyRows.map(d => (
                <div key={d.day} data-zero={d.n === 0 ? '' : undefined}>
                  <span>{dayLabel(d.day)}</span>
                  <i style={{ width: `${(d.n / maxDaily) * 100}%` }} />
                  <span>{n(d.n)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="adm-block">
            <h2 className="adm-h2">How it works <small>{periodLabel}</small></h2>
            <div className="adm-table-wrap">
              <table className="adm-table" data-tour-table>
                <tbody>
                  <tr>
                    <td>Opened</td>
                    <td data-num>{tour.opens}</td>
                    <td style={{ width: 64 }}></td>
                  </tr>
                  <tr>
                    <td>Went on to the quiz</td>
                    <td data-num>{tour.cta}</td>
                    <td data-num data-dim style={{ width: 64 }}>{tour.pct}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
