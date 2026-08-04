import { useMemo, useState } from 'react'

export interface AnalyticsData {
  totals: { event: string; n30: number; n7: number }[]
  perItem: { event: string; itemType: string | null; itemId: number | null; n30: number; n7: number }[]
  daily: { day: string; n: number }[]
  emptySearches: { q: string | null; n: number }[]
  /** Live email list: people = distinct addresses, reminders = rows. */
  subscribers: { people: number; reminders: number; new30: number; new7: number }
  perItemSubs: { itemType: string; itemId: number; n: number }[]
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
  quiz_start: 'Quiz starts',
  quiz_complete: 'Quiz completions',
  search_empty: 'Empty searches',
  alert_subscribe: 'Alert signups',
}

interface ItemRow {
  key: string
  title: string
  itemType: string
  views30: number
  applies7: number
  applies30: number
  rate: number | null
  saves30: number
  alerts30: number
  onList: number
}

type SortKey = keyof Pick<ItemRow, 'title' | 'itemType' | 'views30' | 'applies7' | 'applies30' | 'rate' | 'saves30' | 'alerts30' | 'onList'>
type TypeFilter = 'all' | 'scholarship' | 'program'

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'title',     label: 'Item',        numeric: false },
  { key: 'itemType',  label: 'Type',        numeric: false },
  { key: 'views30',   label: 'Views 30d',   numeric: true },
  { key: 'applies7',  label: 'Applies 7d',  numeric: true },
  { key: 'applies30', label: 'Applies 30d', numeric: true },
  { key: 'rate',      label: 'Apply rate',  numeric: true },
  { key: 'saves30',   label: 'Saves 30d',   numeric: true },
  { key: 'alerts30',  label: 'Alerts 30d',  numeric: true },
  { key: 'onList',    label: 'On list',     numeric: true },
]

function buildItemRows(data: AnalyticsData): ItemRow[] {
  const map = new Map<string, ItemRow>()
  const blank = (itemType: string, itemId: number): ItemRow => ({
    key: `${itemType}:${itemId}`,
    title: (itemType === 'program' ? data.titles.program : data.titles.scholarship)[itemId] ?? `#${itemId}`,
    itemType,
    views30: 0, applies7: 0, applies30: 0, rate: null, saves30: 0, alerts30: 0, onList: 0,
  })

  for (const e of data.perItem) {
    if (e.itemId == null || !e.itemType) continue
    const key = `${e.itemType}:${e.itemId}`
    let row = map.get(key)
    if (!row) {
      row = blank(e.itemType, e.itemId)
      map.set(key, row)
    }
    if (e.event === 'detail_view') row.views30 += e.n30
    else if (e.event === 'apply_click') { row.applies30 += e.n30; row.applies7 += e.n7 }
    else if (e.event === 'save') row.saves30 += e.n30
    else if (e.event === 'alert_subscribe') row.alerts30 += e.n30
  }

  // An item can have live reminders without a single event in the window —
  // signups from before it, and everything lost while the event write was
  // being dropped. Those items still belong in the table.
  for (const s of data.perItemSubs) {
    const key = `${s.itemType}:${s.itemId}`
    let row = map.get(key)
    if (!row) {
      row = blank(s.itemType, s.itemId)
      map.set(key, row)
    }
    row.onList += s.n
  }

  for (const row of map.values()) {
    row.rate = row.views30 > 0 ? row.applies30 / row.views30 : null
  }
  return [...map.values()]
}

const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${on ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`

export default function AnalyticsPanel({ data }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('applies30')
  const [sortDesc, setSortDesc] = useState(true)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  const allRows = useMemo(() => buildItemRows(data), [data])

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
      return b.views30 - a.views30
    })
  }, [allRows, typeFilter, query, sortKey, sortDesc])

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
  const maxDaily = Math.max(1, ...data.daily.map(d => d.n))

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-white/40">
            Anonymous event counts, rolling last 30 days. One count per person per visit. No cookies, no IPs, no user ids.
          </p>
        </div>
      </div>

      {/* Totals: 30d big, 7d small */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {Object.entries(EVENT_LABELS).map(([event, label]) => {
          const t = data.totals.find(x => x.event === event)
          const starts30 = data.totals.find(x => x.event === 'quiz_start')?.n30 ?? 0
          const completionRate = event === 'quiz_complete' && starts30 > 0
            ? `${Math.round(((t?.n30 ?? 0) / starts30) * 100)}% of starts`
            : null
          return (
            <div key={event} className="border border-white/6 rounded-xl p-4">
              <p className="text-2xl font-semibold" style={{ color: '#22d3a5' }}>{(t?.n30 ?? 0).toLocaleString()}</p>
              <p className="text-xs text-white/40 mt-1">{label}</p>
              <p className="text-xs text-white/25 mt-0.5">
                {(t?.n7 ?? 0).toLocaleString()} last 7d{completionRate ? ` · ${completionRate}` : ''}
              </p>
            </div>
          )
        })}

        {/* Live list, not a windowed event count: unsubscribing removes the
            row, so this is who is actually on email right now. */}
        <div className="border rounded-xl p-4" style={{ borderColor: 'rgba(34,211,165,0.25)' }}>
          <p className="text-2xl font-semibold" style={{ color: '#22d3a5' }}>
            {data.subscribers.people.toLocaleString()}
          </p>
          <p className="text-xs text-white/40 mt-1">People on email</p>
          <p className="text-xs text-white/25 mt-0.5">
            {data.subscribers.reminders.toLocaleString()} reminder{data.subscribers.reminders === 1 ? '' : 's'} set
            {data.subscribers.new7 > 0 ? ` · ${data.subscribers.new7} new 7d` : ''}
          </p>
        </div>
      </div>

      {/* Per-item engagement */}
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-white/70">Engagement by item</h2>
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

      <div className="border border-white/6 rounded-xl overflow-hidden mb-2">
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
                {allRows.length === 0 ? 'No events yet. Data appears as students use the site.' : 'Nothing matches this filter.'}
              </td></tr>
            )}
            {visible.map(row => (
              <tr key={row.key} className="border-b border-white/4">
                <td className="px-4 py-2.5">{row.title}</td>
                <td className="px-4 py-2.5 text-white/40">{row.itemType}</td>
                <td className="px-4 py-2.5 text-right">{row.views30}</td>
                <td className="px-4 py-2.5 text-right">{row.applies7}</td>
                <td className="px-4 py-2.5 text-right">{row.applies30}</td>
                <td className="px-4 py-2.5 text-right text-white/60">
                  {row.rate !== null ? `${Math.round(row.rate * 100)}%` : '·'}
                </td>
                <td className="px-4 py-2.5 text-right">{row.saves30}</td>
                <td className="px-4 py-2.5 text-right">{row.alerts30}</td>
                <td className="px-4 py-2.5 text-right">{row.onList}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mb-8">
        <p className="text-xs text-white/30">
          Applies include clicks from list cards, which skip the detail page, so rates above 100% are possible.
          On list is live email reminders for that item, all time, not a 30 day window.
        </p>
        {rows.length > 25 && (
          <button onClick={() => setShowAll(s => !s)} className="text-xs text-white/40 hover:text-white transition cursor-pointer">
            {showAll ? 'Show top 25' : `Show all ${rows.length}`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Daily activity */}
        <div>
          <h2 className="text-sm font-semibold mb-2 text-white/70">Events per day, last 14 days</h2>
          <div className="border border-white/6 rounded-xl p-4">
            {data.daily.length === 0 && <p className="text-white/30 text-sm">No activity yet.</p>}
            {data.daily.map(d => (
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
          <h2 className="text-sm font-semibold mb-2 text-white/70">Searches with zero results, last 30 days</h2>
          <div className="border border-white/6 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {data.emptySearches.length === 0 && (
                  <tr><td className="px-4 py-6 text-white/30 text-center">Nothing yet. These are scholarships students looked for and didn&apos;t find.</td></tr>
                )}
                {data.emptySearches.map(s => (
                  <tr key={s.q} className="border-b border-white/4">
                    <td className="px-4 py-2.5">{s.q}</td>
                    <td className="px-4 py-2.5 text-right text-white/40">{s.n}×</td>
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
