// The split behind scripts/split-directories.ts, kept here so its unit test
// sits beside the rest of src/.
const CARD_OPEN = /^<div class="sabl-card" data-dir-card\b[^>]*>/
const HIDDEN = /\sdata-dir-(?:later|shut)\b/

export interface Split { page: string; all: string; moved: number }

/** Null when the page has no grid or no hidden cards to move. */
export function splitDirectoryPage(html: string, allHref: string): Split | null {
  const gridAt = html.indexOf('<div class="sabl-grid" data-dir-grid')
  if (gridAt < 0) return null
  const gridTagEnd = html.indexOf('>', gridAt) + 1

  // One pass over the grid's divs: a div opened at depth 1 is a child of the
  // grid (a card); depth 0 is the grid's own close.
  const tag = /<div\b|<\/div>/g
  tag.lastIndex = gridTagEnd
  let depth = 1
  let start = -1
  let gridClose = -1
  const hidden: Array<[number, number]> = []
  for (let m = tag.exec(html); m; m = tag.exec(html)) {
    if (m[0] === '</div>') {
      depth--
      if (depth === 1 && start >= 0) {
        const open = CARD_OPEN.exec(html.slice(start, start + 4000))
        if (open && HIDDEN.test(open[0])) hidden.push([start, tag.lastIndex])
        start = -1
      } else if (depth === 0) { gridClose = m.index; break }
    } else {
      if (depth === 1) start = m.index
      depth++
    }
  }
  if (gridClose < 0) throw new Error('split-directories: unclosed grid')
  if (!hidden.length) return null

  let page = ''
  let all = ''
  let at = 0
  for (const [s, e] of hidden) {
    page += html.slice(at, s)
    all += html.slice(at, s) + '<!--c-->' + html.slice(s, e) + '<!--/c-->'
    at = e
  }
  const tail = html.slice(at)
  const close = gridClose - at
  // The link only a reader without JavaScript sees, where the cut cards were.
  page += tail.slice(0, close)
    + `<noscript><p class="sabl-more-line"><a href="${allHref}">Show every listing</a></p></noscript>`
    + tail.slice(close)
  all += tail
  page = page.slice(0, gridAt) + page.slice(gridAt).replace('data-dir-grid', `data-dir-grid data-dir-rest="${allHref}"`)
  // The copy is a way to the listings, not a page to rank; its canonical
  // already names the page it copies.
  all = all.replace(/<meta name="robots"[^>]*>/, '').replace('<head>', '<head><meta name="robots" content="noindex, follow">')
  return { page, all, moved: hidden.length }
}
