#!/usr/bin/env node
/**
 * Fails the build on a colon or semicolon in the prose a visitor reads.
 *
 * The 2026-10-10 rule took every prose colon and semicolon out of site copy,
 * and nothing enforced it: five days later the built site still had them on
 * every page, from listing data, guides and shared components alike. Like the
 * em dash check in validate-data, the rule is enforced here instead of
 * remembered. It reads the built pages, not the sources, because listing text,
 * titles and metas are assembled at build time and only the output shows what
 * a visitor sees.
 *
 * A mark counts when it follows a word, number or closing bracket and comes
 * before a space or the end of a text node, so clock times (9:30), URLs and
 * ratios pass. Official names that contain a colon pass too: every listing
 * title, program name and provider from the catalogue, plus OFFICIAL_NAMES
 * below. Rewrite the sentence instead of adding to that list.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const MARK = /[\p{L}\p{N})%'"’\]][:;](?=\s|$)/u

// Contest themes and titles quoted in listing text, spelled as their owners do.
export const OFFICIAL_NAMES = [
  'The Moment I Realized I Belonged: My Definition of Community',
  'Nature of Truth: Environmentalism in an Age of Disinformation',
]

const decode = (s: string) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ').replace(/&(?!amp;)[a-z]+;/gi, ' ').replace(/&amp;/g, '&')

/** The visitor-facing strings in one page: title, description metas and body text. */
export function pageText(html: string): string[] {
  const out: string[] = []
  for (const m of html.matchAll(/<title>([\s\S]*?)<\/title>/g)) out.push(m[1]!)
  for (const m of html.matchAll(/<meta[^>]+(?:name|property)="(?:description|og:description|og:title|twitter:description|twitter:title)"[^>]*content="([^"]*)"/g)) out.push(m[1]!)
  const body = html
    .replace(/<head>[\s\S]*?<\/head>/, ' ')
    .replace(/<(script|style|template|pre|code)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->/g, '<x>')
  for (const m of body.matchAll(/>([^<]+)</g)) out.push(m[1]!)
  return out.map(t => decode(t).replace(/\s+/g, ' ').trim()).filter(Boolean)
}

/** Strings that still carry a prose colon or semicolon once allowed names are taken out. */
export function proseMarks(texts: string[], allowed: string[]): string[] {
  const names = allowed.filter(n => MARK.test(n)).sort((a, b) => b.length - a.length)
  return texts.filter(t => MARK.test(names.reduce((s, n) => s.split(n).join(' '), t)))
}

function catalogueNames(): string[] {
  const read = (f: string) => JSON.parse(readFileSync(join('src/data', f), 'utf8')) as Record<string, unknown>[]
  return [...read('scholarships.json'), ...read('research-programs.json')]
    .flatMap(x => [x.title, x.name, x.provider])
    .filter((v): v is string => typeof v === 'string')
}

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = join(dir, e.name)
    return e.isDirectory() ? htmlFiles(full) : e.name.endsWith('.html') ? [full] : []
  })
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  const root = 'dist/client'
  const allowed = [...catalogueNames(), ...OFFICIAL_NAMES]
  const hits = new Map<string, string>()
  for (const file of htmlFiles(root)) {
    for (const t of proseMarks(pageText(readFileSync(file, 'utf8')), allowed)) {
      if (!hits.has(t)) hits.set(t, file.slice(root.length))
    }
  }
  for (const [t, page] of hits) console.error(`prose colon or semicolon on ${page}: ${t.slice(0, 160)}`)
  if (hits.size) {
    console.error(`check-prose-marks: ${hits.size} string(s). Rewrite the sentence (split it, or use a comma or "and").`)
    process.exit(1)
  }
}
