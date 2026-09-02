# Compliance notes

What ScholarAB's privacy and anti-spam position actually rests on, and the one
change that would break it. Written down here because the reasoning previously
lived only in a source comment and in a gitignored outreach plan, which is not
where anyone would look before shipping a change that invalidates it.

Companion documents: the [privacy policy](../src/pages/privacy.astro) is what
users are told, [SECURITY.md](../SECURITY.md) covers breach handling, and
[src/lib/email-identity.ts](../src/lib/email-identity.ts) is where the sender
identification is actually built.

## The one thing that must not be forgotten

> **The day ScholarAB earns money, the CASL position below stops being
> defensible, and a real postal address has to go into every email before the
> next send.**

Money means any of: an affiliate link, a sponsor, a paid placement, a
commission from a provider, advertising, a paid tier, or donations solicited
in an email. It does not mean someone privately sending a thank-you.

What to do when that day comes, in order:

1. Get a postal address that can receive mail: a PO box or a virtual mailbox.
   A municipality is not a postal address for CASL's purposes.
2. Bind `ALERT_MAILING_ADDRESS` to it on the Worker and in the GitHub Actions
   environment used by `scripts/send-alerts.ts`. No code change is needed;
   the constant in `email-identity.ts` is only a fallback.
3. Re-read the consent trail. Express consent is already on file for every
   confirmed subscriber (`confirmed_at`), which is the hard part, and it
   carries over. What changes is identification, not consent.
4. Update the privacy policy: the "no business model here that would want it"
   line in *What we don't collect* becomes false the moment there is one.

## CASL

The site sends two kinds of email, both to addresses that asked for them:
a confirmation request and a deadline reminder.

**Position:** these are not commercial electronic messages. CASL s.1(2) turns
on whether a message encourages participation in a *commercial activity*.
ScholarAB sells nothing, carries no advertising, takes no commission, and has
no revenue of any kind. A reminder that a scholarship a student picked out
closes in fourteen days encourages participation in a scholarship application.

This is an argument, not a certainty, and it was made deliberately after
pricing PO boxes on 2026-08-22. Everything else CASL asks for is done anyway,
because it is cheap and it is the honest handling:

| CASL requirement | How it is met |
|---|---|
| Express consent | Double opt-in. `send-alerts.ts` filters `confirmed_at IS NOT NULL`; an unconfirmed row is never mailed a reminder. |
| Consent request is itself a CEM | The confirmation email carries the full footer and an unsubscribe link, because the address is attacker-supplied and unproven at that point. |
| Sender identification | Name, locality, website and contact address in every message footer, valid well past 60 days. |
| Mailing address | **Locality only.** This is the gap the position above covers. |
| Unsubscribe, readily performed | A link in every footer, plus RFC 8058 one-click headers so mail apps show their own button. |
| Honoured within 10 business days | Immediately. The row is deleted; there is no suppression list. |

## PIPEDA and Alberta PIPA

Both bind organizations collecting personal information **in the course of
commercial activity**. ScholarAB has none, so neither statute clearly applies.
The site is built to meet PIPEDA anyway, on the view that a directory aimed at
minors should not be relying on a jurisdictional technicality.

What that means in practice:

- **Consent** is express and provable, per the table above.
- **Limiting collection.** One category of personal information is stored: an
  email address, with the listing it is a reminder for. The match quiz asks
  about family income, Indigenous and BIPOC identity, foster care and gender;
  none of it is transmitted, stored, or persisted anywhere, not even in the
  browser. The site is told only that a quiz started and that one finished.
- **Limiting retention** is enforced by `scripts/prune-events.ts`, monthly:
  events 180 days, subscriptions 60 days past a deadline, unconfirmed sign-ups
  30 days, rate-limit windows 2 days.
- **Access and correction** run through the contact address in the privacy
  policy, answered within days; the statutory maximum is 30.
- **Erasure** is self-serve: *Delete all my data* on the unsubscribe page wipes
  every row for the address. The token in the emailed link is the ownership
  proof, which is why no endpoint accepts a bare address; one that did would
  let anyone wipe anyone's reminders and double as a test of whether an
  address is on the list.
- **Safeguards and breach response** are in [SECURITY.md](../SECURITY.md),
  including the OPC notification path and PIPEDA's requirement to keep records
  of *all* breaches, including ones judged not to meet the real-risk threshold.
- **No IP address is ever stored.** The rate limiter hashes it with a salted
  digest before anything reaches the database; see `src/lib/rate-limit.ts`.

## What does not apply, and why

- **GDPR / UK GDPR.** No establishment in the EU or UK, and no targeting of
  either: the entire directory is Alberta scholarships, priced in Canadian
  dollars, for students at Alberta high schools. An incidental visitor from
  the EU does not by itself trigger Article 3(2).
- **CCPA / CPRA.** None of the three thresholds are met, and nothing is sold
  or shared. Revenue is zero, which is one threshold that will stay unmet
  longer than the others.
- **COPPA.** A US statute, and this is not a US-directed service. The privacy
  policy still asks under-13s to check with a parent and honours a guardian's
  deletion request without question, which is the substance of it.

## Third-party processors

Named in the privacy policy, all US-based, all told so to the reader:
Cloudflare (hosting, page views), Neon (the database holding sign-ups),
Resend (delivery), GitHub (the scheduled job that decides whose deadline is
close), Google (Gmail carries mail to the contact address).

Adding a sixth means adding a row to the `processors` table in
`src/pages/privacy.astro` in the same change. A processor the policy does not
name is the most likely way this document goes stale.

## Review triggers

Re-read this file when any of these happen, not on a calendar:

- Money arrives, in any form. See the top of this document.
- A new table stores anything about a person, or an existing one gains a
  column that does.
- A new third-party service touches user data.
- The site starts targeting students outside Alberta.
- Anything is added to `/api/event`, especially anything carrying free text.
