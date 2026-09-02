import { describe, it, expect } from 'vitest'
import { senderIdentityHtml, listUnsubscribeHeaders, DEFAULT_MAILING_ADDRESS, SENDER_NAME, SENDER_CONTACT_EMAIL } from './email-identity'
import { confirmEmailHtml } from './confirm-email'

const SITE = 'https://www.scholarab.ca'

describe('senderIdentityHtml', () => {
  it('carries the three things CASL s.6(2) asks to travel in the message', () => {
    const html = senderIdentityHtml({ siteUrl: SITE, unsubscribeUrl: `${SITE}/api/unsubscribe?token=t` })
    expect(html).toContain(SENDER_NAME)
    expect(html).toContain(DEFAULT_MAILING_ADDRESS)
    expect(html).toContain(SENDER_CONTACT_EMAIL)
  })

  it('prefers a configured postal address over the fallback', () => {
    const html = senderIdentityHtml({ siteUrl: SITE, mailingAddress: 'PO Box 1, Medicine Hat, AB T1A 0A1' })
    expect(html).toContain('PO Box 1')
    expect(html).not.toContain(DEFAULT_MAILING_ADDRESS)
  })

  it('falls back when the address is unset or empty rather than rendering nothing', () => {
    for (const mailingAddress of [undefined, '']) {
      expect(senderIdentityHtml({ siteUrl: SITE, mailingAddress })).toContain(DEFAULT_MAILING_ADDRESS)
    }
  })

  it('escapes what it interpolates', () => {
    const html = senderIdentityHtml({ siteUrl: SITE, mailingAddress: '<script>x</script>' })
    expect(html).not.toContain('<script>')
  })
})

describe('confirmEmailHtml', () => {
  const html = confirmEmailHtml('Rutherford Scholarship', `${SITE}/api/confirm?token=abc123`)

  it('gives the recipient a way out, because a consent request is itself a CEM', () => {
    // /api/alert is public JSON and the address is never proved before this is
    // sent, so the recipient may be someone who never asked.
    expect(html).toContain(`${SITE}/api/unsubscribe?token=abc123`)
  })

  it('reuses the confirm token rather than minting a second secret', () => {
    // One secret per subscription. A mismatched pair would mail a working
    // confirm link beside an opt-out that matches no row.
    const tokens = [...html.matchAll(/token=([a-z0-9]+)/g)].map(m => m[1])
    expect(tokens.length).toBeGreaterThan(1)
    expect(new Set(tokens).size).toBe(1)
  })

  it('identifies the sender and links the privacy policy', () => {
    expect(html).toContain(DEFAULT_MAILING_ADDRESS)
    expect(html).toContain('/privacy/')
  })

  it('survives a confirm URL it cannot parse', () => {
    const broken = confirmEmailHtml('Something', 'not-a-url')
    expect(broken).toContain('Something')
    expect(broken).toContain(DEFAULT_MAILING_ADDRESS)
  })

  it('escapes the listing name', () => {
    expect(confirmEmailHtml('<script>x</script>', `${SITE}/api/confirm?token=t`)).not.toContain('<script>x')
  })
})

describe('listUnsubscribeHeaders', () => {
  const url = `${SITE}/api/unsubscribe?token=abc123`

  it('wraps the URL in angle brackets, as RFC 2369 requires', () => {
    // A bare URL is ignored by every parser that matters.
    expect(listUnsubscribeHeaders(url)['List-Unsubscribe']).toContain(`<${url}>`)
  })

  it('offers a mailto alongside the URL, for clients that only do mailto', () => {
    expect(listUnsubscribeHeaders(url)['List-Unsubscribe']).toContain(`<mailto:${SENDER_CONTACT_EMAIL}`)
  })

  it('promises one-click, which /api/unsubscribe honours from the query token', () => {
    expect(listUnsubscribeHeaders(url)['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })

  it('sends nothing at all when there is no subscription URL', () => {
    // Advertising one-click and then having nowhere to POST is worse than
    // sending no header: the provider records a failed unsubscribe.
    expect(listUnsubscribeHeaders()).toEqual({})
    expect(listUnsubscribeHeaders('')).toEqual({})
  })
})
