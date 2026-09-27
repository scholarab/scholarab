import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import AnalyticsPanel from '../components/admin/AnalyticsPanel'
import type { AnalyticsData } from '../components/admin/AnalyticsPanel'

afterEach(cleanup)

// July and September have activity, August has none; the gap is the point:
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
  // Search Console reaches back further than the events table, so it is what
  // puts May on the month list at all.
  search: [
    { month: '2026-05', clicks: 63, impressions: 1952, position: 11.4, days: 31 },
    { month: '2026-07', clicks: 144, impressions: 6809, position: 12.1, days: 31 },
  ],
  searchGenerated: '2026-09-01',
  monthlySubs: [
    { month: '2026-07', people: 6, reminders: 8 },
    { month: '2026-09', people: 3, reminders: 4 },
  ],
  // Item 99 never produced an event; it exists only on the email list
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
  it('runs the months up to the current one even before it has any rows', () => {
    // The turn of a month: the newest data is September, the clock says
    // October. Without this the panel's newest tab stays September until
    // somebody clicks something, which reads as a stale dashboard.
    render(<AnalyticsPanel data={{ ...data, currentMonth: '2026-10' }} />)
    expect(screen.getByRole('button', { name: 'Oct 2026' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Oct 2026' }))
    expect(monthRow('Oct 2026').slice(1, 5)).toEqual(['0', '0', '0', '0'])
  })

  it('never runs the months backwards from the data', () => {
    // A clock behind the rows would otherwise drop real months off the end.
    render(<AnalyticsPanel data={{ ...data, currentMonth: '2026-08' }} />)
    expect(screen.getByRole('button', { name: 'Sep 2026' })).toBeTruthy()
  })

  it('shows the current month when there is no data at all', () => {
    render(<AnalyticsPanel data={{
      ...data, monthly: [], perItem: [], daily: [], emptySearches: [],
      monthlySubs: [], perItemSubs: [], currentMonth: '2026-10',
    }} />)
    expect(screen.getByRole('button', { name: 'Oct 2026' })).toBeTruthy()
  })

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
    // Live reminders, then the search columns. May is outside the shown months,
    // so its 63 clicks are neither a row nor part of the total.
    expect(total.slice(-5)).toEqual(['12', '144', '6,809', '2.1%', '12.1'])
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

  // The application-step ticker was deleted with /app; its tile could only
  // ever show one historical row, so it is gone rather than left reading 1.
  it('no longer shows the dead Applications started metric', () => {
    render(<AnalyticsPanel data={data} />)
    expect(screen.queryByText('Applications started')).toBeNull()
  })

  it('renders an empty month without crashing', () => {
    render(<AnalyticsPanel data={data} />)
    fireEvent.click(screen.getByRole('button', { name: 'Aug 2026' }))
    expect(screen.getByText(/Nothing recorded in Aug 2026/)).toBeTruthy()
    expect(screen.getByText('No activity in this period.')).toBeTruthy()
  })

  // The real shape as of Aug 2026: events only survive from Jul (the table was
  // wiped Jul 16) but the email list goes back to April. Basing the month list
  // on events alone would drop three months of signups off the page while still
  // counting them in the Total.
  it('starts the months where the events table does, not where the email list does', () => {
    render(<AnalyticsPanel data={{
      ...data,
      monthly: [{ month: '2026-07', event: 'detail_view', n: 184 }, { month: '2026-08', event: 'detail_view', n: 46 }],
      monthlySubs: [
        { month: '2026-04', people: 2, reminders: 2 },
        { month: '2026-05', people: 6, reminders: 15 },
        { month: '2026-07', people: 5, reminders: 10 },
      ],
    }} />)

    // Apr and May are real signups, but a month with no events is a screen of
    // blanks, so the picker begins at July.
    const buttons = screen.getAllByRole('button').map(b => b.textContent)
    expect(buttons.slice(0, 3)).toEqual(['All time', 'Aug 2026', 'Jul 2026'])
    expect(buttons).not.toContain('May 2026')
    expect(buttons).not.toContain('Apr 2026')
  })

  it('leaves search months out of both the list and the all-time total', () => {
    render(<AnalyticsPanel data={data} />)
    const buttons = screen.getAllByRole('button').map(b => b.textContent)
    expect(buttons).not.toContain('May 2026')
    // 144 from July; May's 63 clicks are not shown, so they are not summed.
    fireEvent.click(screen.getByRole('button', { name: 'All time' }))
    const total = monthRow('Total')
    expect(total.slice(-4)).toEqual(['144', '6,809', '2.1%', '12.1'])
  })

  it('falls back to a clean empty state with no data at all', () => {
    render(<AnalyticsPanel data={{ ...data, monthly: [], perItem: [], monthlySubs: [], perItemSubs: [], daily: [], emptySearches: [], search: [] }} />)
    expect(screen.getByText(/No events yet/)).toBeTruthy()
  })
  it('shows How it works as a funnel: where it opened, how far people got, how it ended', () => {
    const withTour = { ...data,
      monthly: [...data.monthly,
        { month: '2026-09', event: 'tour_open', n: 10 },
        { month: '2026-09', event: 'tour_cta', n: 3 }],
      tourMeta: [
        { month: '2026-09', event: 'tour_open', meta: 'auto', n: 6 },
        { month: '2026-09', event: 'tour_open', meta: 'bar', n: 4 },
        { month: '2026-09', event: 'tour_step', meta: '2', n: 8 },
        { month: '2026-09', event: 'tour_step', meta: '5', n: 4 },
        { month: '2026-09', event: 'tour_close', meta: '1', n: 2 },
      ] }
    render(<AnalyticsPanel data={withTour} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sep 2026' }))
    const cells = (label: string) =>
      [...screen.getByText(label).closest('tr')!.querySelectorAll('td')].map(c => c.textContent)
    expect(cells('Opened on its own (first visit)')).toEqual(['Opened on its own (first visit)', '6', '60%'])
    expect(cells('Explore menu')).toEqual(['Explore menu', '0', '0%'])
    expect(cells('Step 1: Find')).toEqual(['Step 1: Find', '10', '100%'])
    expect(cells('Step 2: Shortlist')).toEqual(['Step 2: Shortlist', '8', '80%'])
    expect(cells('Step 5: Guides')).toEqual(['Step 5: Guides', '4', '40%'])
    expect(cells('Went on to the quiz')).toEqual(['Went on to the quiz', '3', '30%'])
    expect(cells('Closed on step 1: Find')).toEqual(['Closed on step 1: Find', '2', '20%'])
    // The pre-split 'button' row only appears when there is something in it
    expect(screen.queryByText(/before Sep 26/)).toBeNull()
  })

  it('splits saves by the button used, with the rate per 100 views', () => {
    const withSaves = { ...data, saveFrom: [
      { month: '2026-09', from: 'page', n: 3 },
      { month: '2026-09', from: 'row', n: 1 },
      { month: '2026-07', from: null, n: 4 },
    ] }
    render(<AnalyticsPanel data={withSaves} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sep 2026' }))
    const cells = (label: string) =>
      [...screen.getByText(label).closest('tr')!.querySelectorAll('td')].map(c => c.textContent)
    expect(cells('Listing page')).toEqual(['Listing page', '3', '75%'])
    expect(cells('Directory row')).toEqual(['Directory row', '1', '25%'])
    expect(cells('Quiz results')).toEqual(['Quiz results', '0', '0%'])
    // July's unplaced saves stay out of September, and so does their row
    expect(screen.queryByText(/Not recorded/)).toBeNull()
    // 4 saves over 25 September views
    expect(screen.getByText(/16\.0 per 100 views/)).toBeTruthy()
  })
})
