import { sql } from 'drizzle-orm'
import { db } from './db/client'
import { events, subscribers } from './db/schema'
import searchMonths from '../data/search-months.json'

/** One figure in the admin scoreboard strip. */
export interface ScoreCell {
  key: string
  label: string
  /** null when the source could not be read; the strip shows a dash, never a zero. */
  value: number | null
  /** One short line under the figure: the comparison, or where the number comes from. */
  note: string
  /** Up or down on the comparison, for the note's colour. null when there is no fair comparison. */
  trend: 'up' | 'down' | null
}

export interface Scoreboard {
  /** "Oct 1 to 12", the window every event figure covers. */
  period: string
  /** "Sep 1 to 12", what the changes are measured against. */
  against: string
  cells: ScoreCell[]
}

const EVENT_CELLS: [string, string][] = [
  ['detail_view', 'Views'],
  ['apply_click', 'Applies'],
  ['save', 'Saves'],
  ['quiz_complete', 'Quiz done'],
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthName(month: string): string {
  return MONTHS[Number(month.slice(5, 7)) - 1] ?? month
}

/** This month so far against the same days of last month, so the strip never
    compares twelve days with thirty. Alberta time, the same buckets as the
    analytics page. */
export async function loadScoreboard(now = new Date()): Promise<Scoreboard> {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Edmonton', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  const [y, m, d] = today.split('-').map(Number) as [number, number, number]
  const curStart = `${y}-${String(m).padStart(2, '0')}-01`
  const prevY = m === 1 ? y - 1 : y
  const prevM = m === 1 ? 12 : m - 1
  const prevStart = `${prevY}-${String(prevM).padStart(2, '0')}-01`
  const cur = curStart.slice(0, 7)
  const prev = prevStart.slice(0, 7)
  const period = `${monthName(cur)} 1 to ${d}`
  const prevPeriod = `${monthName(prev)} 1 to ${d}`

  const local = sql`(${events.ts} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Edmonton')`
  const cells: ScoreCell[] = []

  try {
    const [rows, subs] = await db.batch([
      db
        .select({
          event: events.event,
          cur: sql<number>`count(*) filter (where ${local} >= ${curStart}::date)::int`,
          prev: sql<number>`count(*) filter (where ${local} < ${curStart}::date and extract(day from ${local}) <= ${d})::int`,
        })
        .from(events)
        .where(sql`${events.event} in ('detail_view', 'apply_click', 'save', 'quiz_complete') and ${local} >= ${prevStart}::date`)
        .groupBy(events.event),
      // The live list: unsubscribing deletes the row, so this is who is on
      // email today. Only counts leave the server, never an address.
      db
        .select({
          people: sql<number>`count(distinct ${subscribers.email}) filter (where ${subscribers.confirmedAt} is not null)::int`,
          joined: sql<number>`count(distinct ${subscribers.email}) filter (where ${subscribers.confirmedAt} is not null and (${subscribers.createdAt} AT TIME ZONE 'America/Edmonton') >= ${curStart}::date)::int`,
        })
        .from(subscribers),
    ])
    const by = new Map(rows.map(r => [r.event, r]))
    for (const [key, label] of EVENT_CELLS) {
      const r = by.get(key)
      const now = r?.cur ?? 0
      const before = r?.prev ?? 0
      cells.push({
        key, label, value: now,
        note: before > 0
          ? `${now >= before ? '+' : ''}${Math.round(((now - before) / before) * 100)}%`
          : 'none before',
        trend: before > 0 ? (now >= before ? 'up' : 'down') : null,
      })
    }
    const s = subs[0]
    cells.push({
      key: 'email', label: 'On email', value: s?.people ?? 0,
      note: `+${s?.joined ?? 0} this month`,
      trend: null,
    })
  } catch (e) {
    console.error('Scoreboard DB error:', e)
    for (const [key, label] of EVENT_CELLS) cells.push({ key, label, value: null, note: 'No data', trend: null })
    cells.push({ key: 'email', label: 'On email', value: null, note: 'No data', trend: null })
  }

  // Search Console is a committed snapshot (npm run gsc-months), so it is
  // shown for the newest month it holds and says when it was pulled.
  const snap = searchMonths as { generated: string; months: { month: string; clicks: number; days: number }[] }
  const latest = snap.months.at(-1)
  cells.splice(4, 0, {
    key: 'google', label: 'Google clicks', value: latest?.clicks ?? null,
    note: latest ? `${monthName(latest.month)} 1 to ${latest.days}` : 'No snapshot',
    trend: null,
  })

  return { period, against: prevPeriod, cells }
}
