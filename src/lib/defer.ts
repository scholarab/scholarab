// Cloudflare Workers cancel any pending I/O the moment the handler returns its
// Response. A bare `promise.catch(() => {})` before `return` therefore never
// lands, which is how /api/event's rate-limit writes and /api/alert's
// alert_subscribe event were silently dropped for weeks (rate_limit sat at 0
// rows while 430 events were accepted). waitUntil keeps the request alive until
// the work finishes, without making the visitor wait for it.
type CtxLocals = { runtime?: { ctx?: { waitUntil?: (p: Promise<unknown>) => void } } }

/**
 * Run background work that must complete but must not delay the response.
 * Falls back to awaiting inline where there is no Workers ctx (dev, tests);
 * callers there are already awaiting `defer` or discarding it.
 */
export function defer(locals: unknown, work: Promise<unknown>): Promise<void> {
  const settled = Promise.resolve(work).then(() => {}, () => {})
  const waitUntil = (locals as CtxLocals | undefined)?.runtime?.ctx?.waitUntil
  if (waitUntil) {
    try {
      waitUntil.call((locals as CtxLocals).runtime!.ctx, settled)
      return Promise.resolve()
    } catch { /* fall through to the inline await below */ }
  }
  return settled
}
