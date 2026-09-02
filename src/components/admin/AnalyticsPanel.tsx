import { useMemo, useState } from 'react'

export interface AnalyticsData {
  /** Every event, bucketed by Alberta calendar month. */
  monthly: { month: string; event: string; n: number }[]
  perItem: { month: string; event: string; itemType: string | null; itemId: number | null; n: number }[]
  daily: { day: string; n: number }[]
  emptySearches: { month: string; q: string | null; n: number }[]
  /** Live email list: people = distinct addresses, reminders = rows. */
  subscribers: { people: number; reminders: number }
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

interface Props {
  data: AnalyticsData
}

const EVENT_LABELS: Record<string, string> = {
  detail_view: 'Detail views',
  apply_click: 'Apply clicks',
  save: 'Saves',
  app_step: 'Applications started',
  quiz_start: 'Quiz starts',
  quiz_complete: 'Quiz completions',
  search_empty: 'Empty searches',
  alert_subscribe: 'Alert signups',
}

/** Compact column headers for the by-month table; the tile labels are too long. */
const MONTH_COLUMNS: { key: string; label: string }[] = [
  { key: 'detail_view', label: 'Views' },
  { key: 'apply_click', label: 'Applies' },
  { key: 'save', label: 'Saves' },
  { key: 'app_step', label: 'Started' },
  { key: 'quiz_start', label: 'Quiz start' },
  { key: 'quiz_complete', label: 'Quiz done' },
  { key: 'search_empty', label: 'No results' },
  { key: 'alert_subscribe', label: 'Alerts' },
]

/**
 * The first month each counter was actually recording, so a month before it
 * can say so instead of showing a zero. A zero is a claim that nobody did the
 * thing; these months are ones where nothing was watching. The events table
 * itself starts 2026-07-17, and the two dates after that are the fixes from
 * the Aug 2026 accuracy audit, where save and app_step turned out never to
 * have fired from most of the site.
 */
const EVENT_COVERED_FROM: Record<string, string> = {
  detail_view: '2026-07',
  apply_click: '2026-07',
  quiz_start: '2026-07',
  quiz_complete: '2026-07',
  search_empty: '2026-07',
  save: '2026-08',
  app_step: '2026-08',
  alert_subscribe: '2026-08',
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

/** The table headers are cramped; the tiles have room to say what they mean. */
const SEARCH_TILE_LABELS: Record<keyof SearchTotals, string> = {
  clicks: 'Google search clicks',
  impressions: 'Search impressions',
  ctr: 'Search click rate',
  position: 'Average position',
}

const ALL = 'all'

/** "2026-07" → "Jul 2026". Parsed as UTC so the label can't slip a month. */
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
  started: number
  alerts: number
  onList: number
}

type SortKey = keyof Pick<ItemRow, 'title' | 'itemType' | 'views' | 'applies' | 'rate' | 'saves' | 'started' | 'alerts' | 'onList'>

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'title',    label: 'Item',       numeric: false },
  { key: 'itemType', label: 'Type',       numeric: false },
  { key: 'views',    label: 'Views',      numeric: true },
  { key: 'applies',  label: 'Applies',    numeric: true },
  { key: 'rate',     label: 'Apply rate', numeric: true },
  { key: 'saves',    label: 'Saves',      numeric: true },
  { key: 'started',  label: 'Started',    numeric: true },
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
        views: 0, applies: 0, rate: null, saves: 0, started: 0, alerts: 0, onList: 0,
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
    else if (e.event === 'app_step') row.started += e.n
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

const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${on ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`

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

  const searches = useMemo(() => {
    const merged = new Map<string, number>()
    for (const s of data.emptySearches) {
      if (!s.q || (month !== ALL && s.month !== month)) continue
      merged.set(s.q, (merged.get(s.q) ?? 0) + s.n)
    }
    return [...merged.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
  }, [data.emptySearches, month])

  const dailyRows = useMemo(() => {
    if (month === ALL) return data.daily.slice(-14)
    return data.daily.filter(d => d.day.startsWith(month))
  }, [data.daily, month])

  if (data.error) {
    return (
      <div className="text-white/50 text-sm">
        Couldn&apos;t load analytics. Check that the events table exists and DATABASE_URL is set.
      </div>
    )
  }

  const handleSort = (key: SortKey, numeric: boolean) => {
    if (sortKey === key) setSortDesc(d => !d)
    else { setSortKey(key); setSortDesc(numeric) } // numeric cols start desc, text cols asc
  }

  const visible = showAll ? rows : rows.slice(0, 25)
  const maxDaily = Math.max(1, ...dailyRows.map(d => d.n))
  const periodLabel = month === ALL ? 'all time' : monthLabel(month)

  return (
    <div>
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-white/40">
            Anonymous event counts by Alberta calendar month. Counted once per item per tab
            session, so one student shortlisting 26 awards is 26 saves, not 26 students, and
            the same student on wifi then cellular counts twice. No cookies, no IPs, no user ids.
          </p>
        </div>
      </div>

      {/* Period picker; drives every section below */}
      <div className="flex gap-1 border border-white/6 rounded-lg p-0.5 mb-6 flex-wrap w-fit">
        <button onClick={() => setMonth(ALL)} className={chip(month === ALL)}>All time</button>
        {months.map(m => (
          <button key={m} onClick={() => setMonth(m)} className={chip(month === m)}>{monthLabel(m)}</button>
        ))}
      </div>

      {/* Totals for the selected period */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {Object.entries(EVENT_LABELS).map(([event, label]) => {
          const from = EVENT_COVERED_FROM[event]
          // A month that predates the counter reads "not counted", never 0.
          const uncounted = month !== ALL && from !== undefined && month < from
          const n = counts[event] ?? 0
          const starts = counts['quiz_start'] ?? 0
          const completionRate = event === 'quiz_complete' && starts > 0
            ? `${Math.round((n / starts) * 100)}% of starts`
            : null
          const prev = prevCounts && !(prevMonth && from && prevMonth < from)
            ? prevCounts[event] ?? 0
            : null
          return (
            <div key={event} className="border border-white/6 rounded-xl p-4">
              <p
                className="text-2xl font-semibold"
                style={{ color: uncounted ? 'rgba(255,255,255,0.2)' : '#22d3a5' }}
              >
                {uncounted ? 'n/a' : n.toLocaleString()}
              </p>
              <p className="text-xs text-white/40 mt-1">{label}</p>
              <p className="text-xs text-white/25 mt-0.5">
                {uncounted
                  ? `not counted until ${monthLabel(from!)}`
                  : completionRate ?? (prev !== null ? `${prev.toLocaleString()} in ${monthLabel(prevMonth!)}` : periodLabel)}
              </p>
            </div>
          )
        })}

        {/* Search Console, not the events table. These four are the only
            measured numbers that exist for the months before Jul 17 2026,
            which is why they get tiles of their own rather than a footnote. */}
        {SEARCH_COLUMNS.map(col => {
          const value = search[col.key]
          const prev = prevSearch ? prevSearch[col.key] : null
          return (
            <div key={col.key} className="border border-white/6 rounded-xl p-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <p className="text-2xl font-semibold" style={{ color: '#22d3a5' }}>
                {col.format(value)}
              </p>
              <p className="text-xs text-white/40 mt-1">{SEARCH_TILE_LABELS[col.key]}</p>
              <p className="text-xs text-white/25 mt-0.5">
                {prev !== null && prevMonth
                  ? `${col.format(prev)} in ${monthLabel(prevMonth)}`
                  : periodLabel}
              </p>
            </div>
          )
        })}

        {/* Live list, not a windowed event count: unsubscribing removes the
            row, so all-time is who is actually on email right now. */}
        <div className="border rounded-xl p-4" style={{ borderColor: 'rgba(34,211,165,0.25)' }}>
          <p className="text-2xl font-semibold" style={{ color: '#22d3a5' }}>
            {subs.people.toLocaleString()}
          </p>
          <p className="text-xs text-white/40 mt-1">
            {month === ALL ? 'People on email' : 'People who joined'}
          </p>
          <p className="text-xs text-white/25 mt-0.5">
            {subs.reminders.toLocaleString()} reminder{subs.reminders === 1 ? '' : 's'} set
          </p>
        </div>
      </div>

      {/* Month-by-month totals */}
      <h2 className="text-sm font-semibold mb-2 text-white/70">Every month</h2>
      <div className="border border-white/6 rounded-xl overflow-x-auto mb-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/6 text-white/40 text-xs uppercase">
              <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Month</th>
              {MONTH_COLUMNS.map(c => (
                <th key={c.key} className="text-right px-4 py-3 font-medium whitespace-nowrap">{c.label}</th>
              ))}
              <th className="text-right px-4 py-3 font-medium whitespace-nowrap">On email</th>
              {SEARCH_COLUMNS.map(c => (
                <th key={c.key} className="text-right px-4 py-3 font-medium whitespace-nowrap">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.length === 0 && (
              <tr><td colSpan={MONTH_COLUMNS.length + SEARCH_COLUMNS.length + 2} className="px-4 py-6 text-white/30 text-center">
                No events yet. Data appears as students use the site.
              </td></tr>
            )}
            {months.map(m => {
              const c = countsFor(m)
              return (
                <tr
                  key={m}
                  onClick={() => setMonth(m)}
                  className={`border-b border-white/4 cursor-pointer transition ${month === m ? 'bg-white/5' : 'hover:bg-white/3'}`}
                >
                  <td className="px-4 py-2.5 whitespace-nowrap">{monthLabel(m)}</td>
                  {MONTH_COLUMNS.map(col => {
                    const from = EVENT_COVERED_FROM[col.key]
                    const uncounted = from !== undefined && m < from
                    return (
                      <td
                        key={col.key}
                        className="px-4 py-2.5 text-right"
                        style={uncounted ? { color: 'rgba(255,255,255,0.2)' } : undefined}
                        title={uncounted ? `Not counted until ${monthLabel(from)}` : undefined}
                      >
                        {uncounted ? 'n/a' : (c[col.key] ?? 0).toLocaleString()}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2.5 text-right text-white/60">{subsFor(m).reminders.toLocaleString()}</td>
                  {SEARCH_COLUMNS.map(col => (
                    <td key={col.key} className="px-4 py-2.5 text-right text-white/60">
                      {col.format(searchFor(m)[col.key])}
                    </td>
                  ))}
                </tr>
              )
            })}
            {months.length > 0 && (
              <tr className="border-t border-white/10 font-semibold">
                <td className="px-4 py-2.5 whitespace-nowrap">Total</td>
                {MONTH_COLUMNS.map(col => (
                  <td key={col.key} className="px-4 py-2.5 text-right">
                    {(countsFor(ALL)[col.key] ?? 0).toLocaleString()}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right" style={{ color: '#22d3a5' }}>
                  {data.subscribers.reminders.toLocaleString()}
                </td>
                {SEARCH_COLUMNS.map(col => (
                  <td key={col.key} className="px-4 py-2.5 text-right">
                    {col.format(searchFor(ALL)[col.key])}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-white/30 mb-8">
        On email counts signups from that month that are still active, read from the list itself, so the Total is
        the list as it stands today rather than the sum of the months above it. n/a is a month before that
        column existed, which is not the same as a zero: the events table starts Jul 17 2026, Saves only
        began recording Aug 4 2026, Started Aug 8 2026, and Alerts was being dropped before Aug 4 2026, so
        it under-reports every month up to then. The panel starts at Jul 2026 for the same reason: Mar
        to Jun have Search Console figures and 19 email signups, but no events, so they are left off
        rather than shown as a screen of blanks. Search and Impr. come from Google Search Console rather than this
        site, which is why Mar to mid-Jul have numbers at all; they count search visits and are not
        comparable to Views. Pos. is the average rank of the pages that were shown, weighted by
        impressions, so a rising number can mean new pages entering low rather than old ones
        slipping. Mar 2026 covers 10 days, the property's first.{' '}
        {data.searchGenerated ? `Search figures last pulled ${data.searchGenerated}.` : null}
      </p>

      {/* Per-item engagement */}
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-white/70">Engagement by item · {periodLabel}</h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 border border-white/6 rounded-lg p-0.5">
            {(['all', 'scholarship', 'program'] as const).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} className={chip(typeFilter === t)}>
                {t === 'all' ? 'All' : t === 'scholarship' ? 'Scholarships' : 'Programs'}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter by name…"
            className="bg-white/5 border border-white/6 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 outline-none focus:border-white/20"
            style={{ width: 180 }}
          />
        </div>
      </div>

      <div className="border border-white/6 rounded-xl overflow-x-auto mb-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/6 text-white/40 text-xs uppercase">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key, col.numeric)}
                  aria-sort={sortKey === col.key ? (sortDesc ? 'descending' : 'ascending') : undefined}
                  className={`${col.numeric ? 'text-right' : 'text-left'} px-4 py-3 font-medium cursor-pointer select-none hover:text-white transition whitespace-nowrap`}
                >
                  {col.label}
                  <span className="inline-block w-3" style={{ color: '#22d3a5' }}>
                    {sortKey === col.key ? (sortDesc ? '▾' : '▴') : ''}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={COLUMNS.length} className="px-4 py-6 text-white/30 text-center">
                {allRows.length === 0 ? `Nothing recorded in ${periodLabel}.` : 'Nothing matches this filter.'}
              </td></tr>
            )}
            {visible.map(row => (
              <tr key={row.key} className="border-b border-white/4">
                <td className="px-4 py-2.5">{row.title}</td>
                <td className="px-4 py-2.5 text-white/40">{row.itemType}</td>
                <td className="px-4 py-2.5 text-right">{row.views}</td>
                <td className="px-4 py-2.5 text-right">{row.applies}</td>
                <td className="px-4 py-2.5 text-right text-white/60">
                  {row.rate !== null ? `${Math.round(row.rate * 100)}%` : '·'}
                </td>
                <td className="px-4 py-2.5 text-right">{row.saves}</td>
                <td className="px-4 py-2.5 text-right">{row.started}</td>
                <td className="px-4 py-2.5 text-right">{row.alerts}</td>
                <td className="px-4 py-2.5 text-right">{row.onList}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mb-8 gap-3">
        <p className="text-xs text-white/30">
          Applies include clicks from list cards, which skip the detail page, so rates above 100% are possible.
          Started counts students who ticked at least one application step; ticking also shortlists the award,
          so every Started is inside Saves too. On list counts reminders signed up in this period and still active.
        </p>
        {rows.length > 25 && (
          <button onClick={() => setShowAll(s => !s)} className="text-xs text-white/40 hover:text-white transition cursor-pointer whitespace-nowrap">
            {showAll ? 'Show top 25' : `Show all ${rows.length}`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Daily activity */}
        <div>
          <h2 className="text-sm font-semibold mb-2 text-white/70">
            {month === ALL ? 'Events per day, last 14 active days' : `Events per day, ${periodLabel}`}
          </h2>
          <div className="border border-white/6 rounded-xl p-4">
            {dailyRows.length === 0 && <p className="text-white/30 text-sm">No activity in this period.</p>}
            {dailyRows.map(d => (
              <div key={d.day} className="flex items-center gap-3 py-1">
                <span className="text-xs text-white/40 w-20 shrink-0">{d.day.slice(5)}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(d.n / maxDaily) * 100}%`, background: '#22d3a5' }} />
                </div>
                <span className="text-xs text-white/60 w-8 text-right">{d.n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content gaps */}
        <div>
          <h2 className="text-sm font-semibold mb-2 text-white/70">Searches with zero results · {periodLabel}</h2>
          <div className="border border-white/6 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {searches.length === 0 && (
                  <tr><td className="px-4 py-6 text-white/30 text-center">Nothing yet. These are scholarships students looked for and didn&apos;t find.</td></tr>
                )}
                {searches.map(([q, n]) => (
                  <tr key={q} className="border-b border-white/4">
                    <td className="px-4 py-2.5">{q}</td>
                    <td className="px-4 py-2.5 text-right text-white/40">{n}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
