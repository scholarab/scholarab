/** @jsxImportSource preact */
import { useEffect, useRef, useState } from 'preact/hooks'
import { emailProblem } from '../lib/utils'
import { requestSetReminder, setReminderDone, type SetPlan } from '../lib/set-reminder'

/**
 * The one reminder sign-up for the quiz results: every listing on the screen
 * that can take a reminder, in one request and one confirmation email. The
 * listing form's look (global.css "Reminder sign-up") and My combo's words
 * (SavedDirectory.astro); lib/set-reminder.ts decides what it covers.
 */
export default function SetReminderForm({ id, plan, open }: { id: string; plan: SetPlan; open: boolean }) {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  // What was sent, so the box keeps describing it if Show all changes the list.
  const [sent, setSent] = useState<SetPlan | null>(null)
  const input = useRef<HTMLInputElement>(null)

  // Focus moves to the field when the button opens the box, never on a re-render.
  const wasOpenRef = useRef(open)
  useEffect(() => {
    if (open && !wasOpenRef.current) input.current?.focus()
    wasOpenRef.current = open
  }, [open])

  async function submit(e: Event) {
    e.preventDefault()
    e.stopPropagation()
    const problem = emailProblem(email)
    if (problem) {
      setMsg({ text: problem, error: true })
      input.current?.focus()
      return
    }
    setBusy(true)
    const result = await requestSetReminder(email.trim(), plan.items, 'match')
    setBusy(false)
    if ('covered' in result) {
      setSent(plan)
      setMsg({ text: setReminderDone(result.covered, plan.items.length), error: false })
    } else {
      setMsg({ text: result.error, error: true })
    }
  }

  // Once flagged, the field clears its error the moment the address is fixed.
  function change(value: string) {
    setEmail(value)
    if (msg?.error) {
      const problem = emailProblem(value)
      setMsg(problem ? { text: problem, error: true } : null)
    }
  }

  const shown = sent ?? plan
  return (
    <section id={id} className="sabd-remind sabd-remind-set" aria-labelledby={`${id}-h`} hidden={!open}>
      <h2 id={`${id}-h`} className="sabd-remind-label">{shown.heading}</h2>
      <div className="sabd-remind-sub">{[shown.sub, shown.note].filter(Boolean).join(' ')}</div>
      {!sent && (
        <form className="sabd-remind-form" onSubmit={e => { void submit(e) }} noValidate>
          <label htmlFor={`${id}-email`} className="sr-only">Your email for deadline reminders</label>
          <input
            ref={input}
            id={`${id}-email`}
            type="email"
            name="email"
            required
            autocomplete="email"
            placeholder="your@email.com"
            className="sabd-remind-input"
            aria-describedby={`${id}-msg`}
            aria-invalid={msg?.error ? true : undefined}
            value={email}
            onInput={e => change(e.currentTarget.value)}
          />
          <button type="submit" className="sab-btn sabd-remind-btn" disabled={busy}>{busy ? 'Saving…' : 'Remind me'}</button>
        </form>
      )}
      <div id={`${id}-msg`} className={`sabd-remind-msg${msg?.error ? ' is-error' : ''}`} role="status" aria-live="polite" hidden={!msg}>{msg?.text}</div>
      <div className="sabd-remind-fine">
        We store your address only to send these reminders, and delete it the moment you unsubscribe.
      </div>
      <details className="sabd-remind-how">
        <summary>What we keep<svg className="sabd-remind-caret" viewBox="0 0 12 8" width="10" height="7" fill="none" aria-hidden="true"><path d="M1 1.5 6 6.5 11 1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg></summary>
        <p>
          Nothing else is sent until you press the button in the confirmation email. If you never do, the
          address is deleted within 30 days. Otherwise each reminder, address included, goes 60 days after its
          deadline or the moment you unsubscribe, whichever comes first. We never sell or trade it.{' '}
          <a href="/privacy/">The full privacy policy</a>.
        </p>
      </details>
    </section>
  )
}
