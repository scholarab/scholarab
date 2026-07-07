export interface AnalyticsData {
  totals: { event: string; n: number }[]
  perItem: { event: string; itemType: string | null; itemId: number | null; n30: number; n7: number }[]
  quizDaily: { day: string; n: number }[]
  emptySearches: { q: string | null; n: number }[]
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
  saves30: number
  alerts30: number
}

function buildItemRows(data: AnalyticsData): ItemRow[] {
  const map = new Map<string, ItemRow>()
  for (const e of data.perItem) {
    if (e.itemId == null || !e.itemType) continue
    const key = `${e.itemType}:${e.itemId}`
    let row = map.get(key)
    if (!row) {
      const titles = e.itemType === 'program' ? data.titles.program : data.titles.scholarship
      row = {
        key,
        title: titles[e.itemId] ?? `#${e.itemId}`,
        itemType: e.itemType,
        views30: 0, applies7: 0, applies30: 0, saves30: 0, alerts30: 0,
      }
      map.set(key, row)
    }
    if (e.event === 'detail_view') row.views30 += e.n30
    else if (e.event === 'apply_click') { row.applies30 += e.n30; row.applies7 += e.n7 }
    else if (e.event === 'save') row.saves30 += e.n30
    else if (e.event === 'alert_subscribe') row.alerts30 += e.n30
  }
  return [...map.values()].sort((a, b) => b.applies30 - a.applies30 || b.views30 - a.views30)
}

export default function AnalyticsPanel({ data }: Props) {
  if (data.error) {
    return (
      <div className="text-white/50 text-sm">
        Couldn&apos;t load analytics. Check that the events table exists and DATABASE_URL is set.
      </div>
    )
  }

  const itemRows = buildItemRows(data)
  const maxQuizDay = Math.max(1, ...data.quizDaily.map(d => d.n))

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-white/40">
            Anonymous event counts, last 30 days. No cookies, no IPs, no user ids.
          </p>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
        {Object.entries(EVENT_LABELS).map(([event, label]) => {
          const n = data.totals.find(t => t.event === event)?.n ?? 0
          return (
            <div key={event} className="border border-white/6 rounded-xl p-4">
              <p className="text-2xl font-semibold" style={{ color: '#22d3a5' }}>{n.toLocaleString()}</p>
              <p className="text-xs text-white/40 mt-1">{label}</p>
            </div>
          )
        })}
      </div>

      {/* Per-item engagement */}
      <h2 className="text-sm font-semibold mb-2 text-white/70">Engagement by item</h2>
      <div className="border border-white/6 rounded-xl overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/6 text-white/40 text-xs uppercase">
              <th className="text-left px-4 py-3 font-medium">Item</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-right px-4 py-3 font-medium">Views 30d</th>
              <th className="text-right px-4 py-3 font-medium">Applies 7d</th>
              <th className="text-right px-4 py-3 font-medium">Applies 30d</th>
              <th className="text-right px-4 py-3 font-medium">Apply rate</th>
              <th className="text-right px-4 py-3 font-medium">Saves 30d</th>
              <th className="text-right px-4 py-3 font-medium">Alerts 30d</th>
            </tr>
          </thead>
          <tbody>
            {itemRows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-white/30 text-center">No events yet. Data appears as students use the site.</td></tr>
            )}
            {itemRows.slice(0, 50).map(row => (
              <tr key={row.key} className="border-b border-white/4">
                <td className="px-4 py-2.5">{row.title}</td>
                <td className="px-4 py-2.5 text-white/40">{row.itemType}</td>
                <td className="px-4 py-2.5 text-right">{row.views30}</td>
                <td className="px-4 py-2.5 text-right">{row.applies7}</td>
                <td className="px-4 py-2.5 text-right">{row.applies30}</td>
                <td className="px-4 py-2.5 text-right text-white/60">
                  {row.views30 > 0 ? `${Math.round((row.applies30 / row.views30) * 100)}%` : '·'}
                </td>
                <td className="px-4 py-2.5 text-right">{row.saves30}</td>
                <td className="px-4 py-2.5 text-right">{row.alerts30}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-white/30 -mt-6 mb-8">
        Applies include clicks from list cards, which skip the detail page, so rates above 100% are possible.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Quiz completions per day */}
        <div>
          <h2 className="text-sm font-semibold mb-2 text-white/70">Quiz completions, last 14 days</h2>
          <div className="border border-white/6 rounded-xl p-4">
            {data.quizDaily.length === 0 && <p className="text-white/30 text-sm">No completions yet.</p>}
            {data.quizDaily.map(d => (
              <div key={d.day} className="flex items-center gap-3 py-1">
                <span className="text-xs text-white/40 w-20 shrink-0">{d.day.slice(5)}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(d.n / maxQuizDay) * 100}%`, background: '#22d3a5' }} />
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
