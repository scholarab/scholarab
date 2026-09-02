// Cloudflare's Email Obfuscation rewrites any address it finds in our HTML: the
// text becomes the literal "[email protected]" and the link becomes a
// /cdn-cgi/l/email-protection URL that only resolves once its decoder script
// runs. Content blockers routinely eat that script, so the address reads as a
// placeholder and the link lands on Cloudflare's "Email Protection" page.
//
// Bracketing the text in <!--email_off--> tells the edge to leave it alone.
// Listing prose is the risky case: a provider's own address turns up in a
// description or a note ("apply to x@y.ca"), and a student needs to be able to
// read and copy it.
//
// The markers are literal HTML comments, which cannot sit as raw <!-- --> inside
// a JSX expression, so wrapped text is emitted with set:html and escaped here.

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Escaped text, bracketed so Cloudflare's obfuscator skips it. */
export const emailOff = (text: string) =>
  `<!--email_off-->${escapeHtml(text)}<!--/email_off-->`
