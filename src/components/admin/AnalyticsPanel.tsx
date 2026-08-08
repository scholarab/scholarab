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
  titles: { scholarship: Record<number, string>; program: Record<number, string> }
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

/** Compact column headers for the by-month table — the tile labels are too long. */
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

  // An item can have live reminders without a single event in the period —
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
  // "no data collected" rather than "nobody did anything".
  const months = useMemo(() => {
    const seen = [...data.monthly.map(m => m.month), ...data.monthlySubs.map(m => m.month)].filter(Boolean)
    if (seen.length === 0) return []
    const first = seen.reduce((a, b) => (a < b ? a : b))
    const last = seen.reduce((a, b) => (a > b ? a : b))
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
  }, [data.monthly, data.monthlySubs])

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

  const counts = countsFor(month)
  const subs = subsFor(month)
  // The month directly before the selected one, for the "vs" line on each tile
  const prevMonth = month === ALL ? null : months[months.indexOf(month) + 1] ?? null
  const prevCounts = prevMonth ? countsFor(prevMonth) : null

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
            session — so one student shortlisting 26 awards is 26 saves, not 26 students, and
            the same student on wifi then cellular counts twice. No cookies, no IPs, no user ids.
          </p>
        </div>
      </div>

      {/* Period picker — drives every section below */}
      <div className="flex gap-1 border border-white/6 rounded-lg p-0.5 mb-6 flex-wrap w-fit">
        <button onClick={() => setMonth(ALL)} className={chip(month === ALL)}>All time</button>
        {months.map(m => (
          <button key={m} onClick={() => setMonth(m)} className={chip(month === m)}>{monthLabel(m)}</button>
        ))}
      </div>

      {/* Totals for the selected period */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {Object.entries(EVENT_LABELS).map(([event, label]) => {
          const n = counts[event] ?? 0
          const starts = counts['quiz_start'] ?? 0
          const completionRate = event === 'quiz_complete' && starts > 0
            ? `${Math.round((n / starts) * 100)}% of starts`
            : null
          const prev = prevCounts ? prevCounts[event] ?? 0 : null
          return (
            <div key={event} className="border border-white/6 rounded-xl p-4">
              <p className="text-2xl font-semibold" style={{ color: '#22d3a5' }}>{n.toLocaleString()}</p>
              <p className="text-xs text-white/40 mt-1">{label}</p>
              <p className="text-xs text-white/25 mt-0.5">
                {completionRate ?? (prev !== null ? `${prev.toLocaleString()} in ${monthLabel(prevMonth!)}` : periodLabel)}
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
            </tr>
          </thead>
          <tbody>
            {months.length === 0 && (
              <tr><td colSpan={MONTH_COLUMNS.length + 2} className="px-4 py-6 text-white/30 text-center">
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
                  {MONTH_COLUMNS.map(col => (
                    <td key={col.key} className="px-4 py-2.5 text-right">{(c[col.key] ?? 0).toLocaleString()}</td>
                  ))}
                  <td className="px-4 py-2.5 text-right text-white/60">{subsFor(m).reminders.toLocaleString()}</td>
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
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-white/30 mb-8">
        On email counts signups from that month that are still active, read from the list itself, so the Total is
        the list as it stands today rather than the sum of the months above it. Alerts counts the signup event,
        which was being dropped before Aug 4 2026, so it under-reports every month before that. Months before
        Jul 2026 predate the events table and carry email signups only. Saves only started recording on
        Aug 4 2026 and Started on Aug 8 2026 — earlier months read 0 because nothing was counting, not
        because nobody did it.
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
