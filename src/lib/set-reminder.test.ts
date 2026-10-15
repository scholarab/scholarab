import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MAX_REMINDER_SET, reminderFormCopy } from './alerts'
import { bindSetReminder, planSetReminder, requestSetReminder, setCandidate, setReminderDone, type SetCandidate } from './set-reminder'

const today = new Date('2026-10-14T00:00:00')
const sch = (id: number, row: Omit<SetCandidate, 'type' | 'id'> = {}): SetCandidate => ({ type: 'scholarship', id, active: true, ...row })
// 78 days out, so 30, 14 and 3 are all ahead.
const far = (id: number) => sch(id, { deadline: '2026-12-31' })
// 11 days out: only the 3-day reminder is left.
const near = (id: number) => sch(id, { deadline: '2026-10-25' })
// 2 days out: no reminder is left to send.
const tooSoon = (id: number) => sch(id, { deadline: '2026-10-16' })
const closed = (id: number) => sch(id, { deadline: '2026-09-01' })
const estimated = (id: number) => sch(id, { deadline: '2027-02-01', deadlineEstimated: true })
const opensLater = (id: number) => sch(id, { openDate: '2026-11-01', deadline: '2027-01-15' })
const rolling = (id: number) => sch(id, { rolling: true })

describe('planSetReminder', () => {
  it('offers nothing when no listing can take a reminder', () => {
    expect(planSetReminder([], today)).toBeNull()
    expect(planSetReminder([closed(1), tooSoon(2), rolling(3), sch(4, { concluded: true, deadline: '2026-12-31' })], today)).toBeNull()
    expect(planSetReminder([{ ...far(5), done: true }], today)).toBeNull()
  })

  it('takes the listings that can, in page order, programs included', () => {
    const plan = planSetReminder([
      closed(1), far(2), { type: 'program', id: 9, active: true, deadline: '2026-12-01' }, estimated(3), opensLater(4),
      { type: 'program', id: 10, active: false, deadline: '2026-12-01' },
    ], today)!
    expect(plan.items).toEqual([
      { itemType: 'scholarship', itemId: 2 },
      { itemType: 'program', itemId: 9 },
      { itemType: 'scholarship', itemId: 3 },
      { itemType: 'scholarship', itemId: 4 },
    ])
  })

  it('reads exactly as the listing form when it covers one listing', () => {
    for (const [row, state, days] of [
      [far(1), 'deadline', [30, 14, 3]],
      [near(1), 'deadline', [3]],
      [estimated(1), 'posted', []],
      [opensLater(1), 'open', []],
    ] as const) {
      const copy = reminderFormCopy(state, days)
      const plan = planSetReminder([row], today)!
      expect(plan.heading).toBe(copy.heading)
      expect(plan.sub).toBe(copy.before + copy.when + copy.after)
      expect(plan.note).toBe('')
    }
    expect(planSetReminder([near(1)], today)!.sub).toBe('We send one link to confirm, then a reminder 3 days before the deadline.')
  })

  it('promises every milestone only where every dated listing still has it', () => {
    const plan = planSetReminder([far(1), far(2)], today)!
    expect(plan.heading).toBe('Email me before these 2 close')
    expect(plan.sub).toBe('We send one link to confirm, then a reminder 30, 14 and 3 days before each deadline. Reminders due the same day come in one email.')
    expect(planSetReminder([far(1), near(2)], today)!.sub)
      .toBe('We send one link to confirm, then a reminder 30, 14 and 3 days before each deadline, where there is still time. Reminders due the same day come in one email.')
  })

  it('names the emails a set adds for undated and not yet open listings', () => {
    const sub = (...rows: SetCandidate[]) => planSetReminder(rows, today)!.sub
    expect(sub(far(1), estimated(2))).toContain('before each deadline, and an email when a date is posted. ')
    expect(sub(far(1), opensLater(2))).toContain('before each deadline, and an email when applications open. ')
    expect(sub(estimated(1), opensLater(2), far(3))).toContain(', and an email when a date is posted or applications open. ')
  })

  it('says how many it leaves out and why', () => {
    expect(planSetReminder([far(1), far(2), tooSoon(3)], today)!.note).toBe('The other one closes too soon.')
    expect(planSetReminder([far(1), far(2), { ...far(3), done: true }], today)!.note).toBe('The other one is already submitted.')
    expect(planSetReminder([far(1), rolling(2)], today)!.note).toBe('The other one has no date to watch.')
    expect(planSetReminder([far(1), far(2), rolling(3), tooSoon(4), closed(5), closed(6)], today)!.note)
      .toBe('The other 4 are closed, close too soon or have no date to watch.')
    expect(planSetReminder([far(1), closed(2), closed(3)], today)!.note).toBe('The other 2 are closed.')
  })

  it(`covers the first ${MAX_REMINDER_SET} and says so`, () => {
    const many = Array.from({ length: MAX_REMINDER_SET + 5 }, (_, i) => far(i + 1))
    const plan = planSetReminder([closed(999), ...many], today)!
    expect(plan.items).toHaveLength(MAX_REMINDER_SET)
    expect(plan.items[0]).toEqual({ itemType: 'scholarship', itemId: 1 })
    expect(plan.items.at(-1)).toEqual({ itemType: 'scholarship', itemId: MAX_REMINDER_SET })
    expect(plan.heading).toBe(`Email me before these ${MAX_REMINDER_SET} close`)
    expect(plan.note).toBe(`The other one is closed. One sign-up takes up to ${MAX_REMINDER_SET}, so this one covers the first ${MAX_REMINDER_SET} here.`)
  })
})

describe('setCandidate', () => {
  it('keeps the status fields of a catalogue row and nothing else', () => {
    const row = { id: 4, title: 'Bursary X', url: 'https://example.org', deadline: '2026-12-31', active: true, rolling: false }
    const c = setCandidate('scholarship', row, true)
    expect(c).toEqual({ type: 'scholarship', id: 4, deadline: '2026-12-31', active: true, rolling: false, done: true })
    expect(c).not.toHaveProperty('title')
  })
})

describe('setReminderDone', () => {
  it('never says whether the address was new, waiting or confirmed', () => {
    expect(setReminderDone(1, 1)).toBe('Request received. If confirmation is needed, check your inbox. Existing reminders stay unchanged.')
    expect(setReminderDone(3, 3)).toBe('Request received for all 3. If confirmation is needed, check your inbox for one email. Existing reminders stay unchanged.')
    expect(setReminderDone(2, 3)).toBe('Request received for 2 of 3. If confirmation is needed, check your inbox for one email. Existing reminders stay unchanged.')
  })
})

const items = [{ itemType: 'scholarship', itemId: 1 }, { itemType: 'program', itemId: 9 }] as const

describe('requestSetReminder', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('sends the whole set in one request and reads how many it covered', async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => ({ ok: true, json: async () => ({ ok: true, covered: 1 }) }))
    vi.stubGlobal('fetch', fetch)
    expect(await requestSetReminder('a@b.ca', [...items], 'match')).toEqual({ covered: 1 })
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0]!
    expect(url).toBe('/api/alert')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@b.ca', items: [...items], place: 'match' })
  })

  it('falls back to the set size, then to the server error, then to a network message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => { throw new Error('not json') } })))
    expect(await requestSetReminder('a@b.ca', [...items], 'saved')).toEqual({ covered: 2 })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Too many requests. Try again later.' }) })))
    expect(await requestSetReminder('a@b.ca', [...items], 'saved')).toEqual({ error: 'Too many requests. Try again later.' })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })))
    expect(await requestSetReminder('a@b.ca', [...items], 'saved')).toEqual({ error: 'Something went wrong. Try again.' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
    expect(await requestSetReminder('a@b.ca', [...items], 'saved')).toEqual({ error: 'Could not reach the server. Check your connection and try again.' })
  })
})

// My combo's markup (SavedDirectory.astro), cut to what the binder reads.
const BOX = `
  <div id="root">
    <div data-set-remind hidden>
      <button type="button" aria-expanded="false" data-set-remind-open>Email me before these close</button>
      <section data-set-remind-box hidden>
        <h2 data-set-remind-heading>Email me before these close</h2>
        <div data-set-remind-sub></div>
        <form data-set-remind-form data-place="saved" novalidate>
          <input type="email" name="email" />
          <button type="submit">Remind me</button>
        </form>
        <div data-set-remind-msg hidden></div>
      </section>
    </div>
  </div>`

describe('My combo binder', () => {
  const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!
  const paint = (rows: object[]) => $('#root').dispatchEvent(new CustomEvent('saved:plan', { bubbles: true, detail: rows }))
  const submit = () => $('[data-set-remind-form]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  const flush = () => new Promise(r => setTimeout(r, 0))

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-14T12:00:00-06:00'))
    document.body.innerHTML = BOX
    bindSetReminder()
    bindSetReminder()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('shows the button only while a saved row can take a reminder', () => {
    paint([{ type: 'scholarship', id: 1, deadline: '2026-12-31', active: true, status: 'not-started' }])
    expect($('[data-set-remind]').hidden).toBe(false)
    expect($('[data-set-remind-heading]').textContent).toBe('Email me before it closes')
    paint([
      { type: 'scholarship', id: 1, deadline: '2026-12-31', active: true, status: 'not-started' },
      { type: 'scholarship', id: 2, deadline: '2027-01-31', active: true, status: 'not-started' },
      { type: 'scholarship', id: 3, deadline: '2026-12-31', active: true, status: 'submitted' },
    ])
    expect($('[data-set-remind-heading]').textContent).toBe('Email me before these 2 close')
    expect($('[data-set-remind-sub]').textContent).toMatch(/one email\. The other one is already submitted\.$/)
    paint([{ type: 'scholarship', id: 1, deadline: '2026-09-01', active: true }])
    expect($('[data-set-remind]').hidden).toBe(true)
  })

  it('opens the box in place and puts the cursor in the field', () => {
    paint([{ type: 'scholarship', id: 1, deadline: '2026-12-31', active: true }])
    $('[data-set-remind-open]').click()
    expect($('[data-set-remind-box]').hidden).toBe(false)
    expect($('[data-set-remind-open]').getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe($('input[name="email"]'))
    $('[data-set-remind-open]').click()
    expect($('[data-set-remind-box]').hidden).toBe(true)
    expect($('[data-set-remind-open]').getAttribute('aria-expanded')).toBe('false')
  })

  it('checks the address, sends the set once and then keeps its answer', async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => ({ ok: true, json: async () => ({ ok: true, covered: 2 }) }))
    vi.stubGlobal('fetch', fetch)
    paint([
      { type: 'scholarship', id: 1, deadline: '2026-12-31', active: true },
      { type: 'program', id: 9, deadline: '2026-12-01', active: true },
    ])
    const input = $<HTMLInputElement>('input[name="email"]')
    input.value = 'not-an-address'
    expect(submit()).toBe(false)
    expect($('[data-set-remind-msg]').textContent).toBe('Add an @ to your email, like name@gmail.com.')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    input.value = 'student@example.ca'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(input.hasAttribute('aria-invalid')).toBe(false)
    expect($('[data-set-remind-msg]').hidden).toBe(true)
    expect(fetch).not.toHaveBeenCalled()

    submit()
    await flush()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetch.mock.calls[0]![1].body as string)).toEqual({
      email: 'student@example.ca',
      items: [{ itemType: 'scholarship', itemId: 1 }, { itemType: 'program', itemId: 9 }],
      place: 'saved',
    })
    expect($('[data-set-remind-msg]').textContent).toBe('Request received for all 2. If confirmation is needed, check your inbox for one email. Existing reminders stay unchanged.')
    expect($('[data-set-remind-form]').style.display).toBe('none')
    // A later repaint (a status change, another tab) leaves the answer alone.
    paint([{ type: 'scholarship', id: 1, deadline: '2026-09-01', active: true }])
    expect($('[data-set-remind]').hidden).toBe(false)
    expect($('[data-set-remind-msg]').textContent).toMatch(/^Request received for all 2\./)
  })

  it('shows the server error and lets the student try again', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Too many requests. Try again later.' }) })))
    paint([{ type: 'scholarship', id: 1, deadline: '2026-12-31', active: true }])
    $<HTMLInputElement>('input[name="email"]').value = 'student@example.ca'
    submit()
    await flush()
    expect($('[data-set-remind-msg]').textContent).toBe('Too many requests. Try again later.')
    expect($('[data-set-remind-msg]').classList.contains('is-error')).toBe(true)
    const btn = $<HTMLButtonElement>('[data-set-remind-form] button')
    expect(btn.disabled).toBe(false)
    expect(btn.textContent).toBe('Remind me')
    expect($('[data-set-remind-form]').style.display).toBe('')
  })
})
