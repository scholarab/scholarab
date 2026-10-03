/** Shared presentation for reminder confirmation and unsubscribe responses.
 * Route bodies are trusted templates; escape every value inserted into them. */
export function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export const reminderBackLink = '<p class="back"><a href="/">← Back to ScholarAB</a></p>'

export function reminderPage(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeAttr(title)} | ScholarAB</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;
        min-height:100vh;margin:0;background:#FFFFFF;color:#141915}
      .card{text-align:center;padding:2rem;max-width:420px}
      h1{font-size:1.5rem;margin:0 0 .5rem}
      p{color:#5A605B;font-size:.95rem;line-height:1.5}
      a{color:#141915}
      button{font:inherit;font-weight:600;background:#2FD3A0;color:#08120E;border:0;border-radius:4px;
        padding:12px 28px;cursor:pointer;margin-top:1.25rem}
      button:hover{background:#28BC8E}
      button.secondary{background:transparent;color:#5A605B;border:1px solid #d8d4c8;font-weight:500;
        padding:10px 22px;margin-top:.75rem}
      button.secondary:hover{background:#F2F3F5;color:#141915}
      .fine{font-size:.8rem;color:#5C5F5B;margin-top:1rem}
      .fine a{color:#5C5F5B}
      .back{display:inline-block;margin-top:1.5rem;font-size:.9rem}
    </style></head>
    <body><main class="card">${body}</main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export function reminderError(reason: 'missing-token' | 'invalid-form' | 'rate-limit'): Response {
  if (reason === 'rate-limit') {
    return reminderPage('Try again later',
      `<h1>Too many requests</h1><p>Wait 15 minutes, then reopen the link in your ScholarAB email.</p>${reminderBackLink}`, 429)
  }
  return reminderPage('Open your email link',
    `<h1>${reason === 'missing-token' ? 'This link is incomplete' : 'The form could not be read'}</h1>
     <p>Open the full link in your ScholarAB email and try again.</p>${reminderBackLink}`, 400)
}
