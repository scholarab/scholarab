// Shared pieces for the admin analytics page. Styles are the .adm-* rules in
// styles/admin.css.
import type { ReactNode } from 'react'

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

/** The strip of figures under the bar, with the analytics page's period cells
    and controls. */
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
