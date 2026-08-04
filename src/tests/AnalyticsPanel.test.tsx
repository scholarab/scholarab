import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import AnalyticsPanel from '../components/admin/AnalyticsPanel'
import type { AnalyticsData } from '../components/admin/AnalyticsPanel'

afterEach(cleanup)

// July and September have activity, August has none — the gap is the point:
// a skipped month would read as "no data collected" rather than "a quiet month".
const data: AnalyticsData = {
  monthly: [
    { month: '2026-07', event: 'detail_view', n: 100 },
    { month: '2026-07', event: 'apply_click', n: 40 },
    { month: '2026-07', event: 'quiz_start', n: 4 },
    { month: '2026-07', event: 'quiz_complete', n: 3 },
    { month: '2026-09', event: 'detail_view', n: 25 },
    { month: '2026-09', event: 'apply_click', n: 10 },
  ],
  perItem: [
    { month: '2026-07', event: 'detail_view', itemType: 'scholarship', itemId: 1, n: 60 },
    { month: '2026-07', event: 'apply_click', itemType: 'scholarship', itemId: 1, n: 30 },
    { month: '2026-09', event: 'detail_view', itemType: 'scholarship', itemId: 1, n: 20 },
    { month: '2026-09', event: 'apply_click', itemType: 'scholarship', itemId: 1, n: 10 },
    { month: '2026-07', event: 'detail_view', itemType: 'program', itemId: 7, n: 40 },
  ],
  daily: [
    { day: '2026-07-01', n: 12 },
    { day: '2026-09-02', n: 5 },
  ],
  emptySearches: [
    { month: '2026-07', q: 'nursing', n: 3 },
    { month: '2026-09', q: 'aupe', n: 1 },
  ],
  subscribers: { people: 9, reminders: 12 },
  monthlySubs: [
    { month: '2026-07', people: 6, reminders: 8 },
    { month: '2026-09', people: 3, reminders: 4 },
  ],
  // Item 99 never produced an event — it exists only on the email list
  perItemSubs: [
    { month: '2026-07', itemType: 'scholarship', itemId: 1, n: 8 },
    { month: '2026-09', itemType: 'scholarship', itemId: 99, n: 4 },
  ],
  titles: {
    scholarship: { 1: 'Rutherford', 99: 'Quiet Bursary' },
    program: { 7: 'TRIUMF Fellowship' },
  },
}

/** Cells of the "Every month" row whose first cell is `label`. */
function monthRow(label: string): string[] {
  const row = screen.getAllByRole('row').find(r => within(r).queryByText(label))
  if (!row) throw new Error(`no row for ${label}`)
  return [...row.querySelectorAll('td')].map(td => td.textContent ?? '')
}

describe('AnalyticsPanel', () => {
  it('lists every month between the first and last, including empty ones', () => {
    render(<AnalyticsPanel data={data} />)
    // Newest first, and August survives despite having no rows of its own
    const buttons = screen.getAllByRole('button').map(b => b.textContent)
    expect(buttons.slice(0, 4)).toEqual(['All time', 'Sep 2026', 'Aug 2026', 'Jul 2026'])
    expect(monthRow('Aug 2026').slice(1, 3)).toEqual(['0', '0'])
  })

  it('totals every month, and reports the email list as live rather than summed', () => {
    render(<AnalyticsPanel data={data} />)
    const total = monthRow('Total')
    expect(total[1]).toBe('125')  // views: 100 + 25
    expect(total[2]).toBe('50')   // applies: 40 + 10
    // 8 + 4 signups happened, but only 12 reminders are live today
    expect(total[total.length - 1]).toBe('12')
  })

  it('defaults to all time and adds each month together per item', () => {
    render(<AnalyticsPanel data={data} />)
    const row = screen.getAllByRole('row').find(r => within(r).queryByText('Rutherford'))!
    const cells = [...row.querySelectorAll('td')].map(c => c.textContent)
    expect(cells[2]).toBe('80')   // 60 + 20 views
    expect(cells[3]).toBe('40')   // 30 + 10 applies
    expect(cells[4]).toBe('50%')
    expect(cells[7]).toBe('8')    // its own July signups; item 99 holds the other 4
  })

  it('narrows every section to the selected month', () => {
    render(<AnalyticsPanel data={data} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sep 2026' }))

    const row = screen.getAllByRole('row').find(r => within(r).queryByText('Rutherford'))!
    const cells = [...row.querySelectorAll('td')].map(c => c.textContent)
    expect(cells[2]).toBe('20')
    expect(cells[3]).toBe('10')

    // July's program and July's search drop out of view
    expect(screen.queryByText('TRIUMF Fellowship')).toBeNull()
    expect(screen.queryByText('nursing')).toBeNull()
    expect(screen.getByText('aupe')).toBeTruthy()
  })

  it('keeps items that only exist on the email list', () => {
    render(<AnalyticsPanel data={data} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sep 2026' }))
    const row = screen.getAllByRole('row').find(r => within(r).queryByText('Quiet Bursary'))!
    const cells = [...row.querySelectorAll('td')].map(c => c.textContent)
    expect(cells[2]).toBe('0')   // no views
    expect(cells[4]).toBe('·')   // no rate to show
    expect(cells[7]).toBe('4')   // but four people are waiting on it
  })

  it('renders an empty month without crashing', () => {
    render(<AnalyticsPanel data={data} />)
    fireEvent.click(screen.getByRole('button', { name: 'Aug 2026' }))
    expect(screen.getByText(/Nothing recorded in Aug 2026/)).toBeTruthy()
    expect(screen.getByText('No activity in this period.')).toBeTruthy()
  })

  it('falls back to a clean empty state with no data at all', () => {
    render(<AnalyticsPanel data={{ ...data, monthly: [], perItem: [], monthlySubs: [], perItemSubs: [], daily: [], emptySearches: [] }} />)
    expect(screen.getByText(/No events yet/)).toBeTruthy()
  })
})
