#!/usr/bin/env node
/**
 * Fails the build if a _redirects rule points away from a page the build made.
 *
 * Cloudflare applies _redirects before it serves assets, so a rule whose
 * source is a built page hides that page. validate-data checks listings and
 * hubs before the build, but combo pages come and go with the date
 * (lib/combos.ts): the 2026-10-01 rules for the Lethbridge and Fort McMurray
 * combos outlived the pages' return, and both 301'd away while /combos/ and
 * the city hubs still linked them. Only the built output knows every page.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export function shadowedSources(redirects: string, isPage: (path: string) => boolean): string[] {
  return redirects.split('\n')
    .map(line => line.trim().split(/\s+/)[0] ?? '')
    .filter(from => from.startsWith('/') && !from.includes('*') && !from.includes(':'))
    .filter(from => isPage(from.endsWith('/') ? from : `${from}/`))
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  const root = 'dist/client'
  const shadowed = shadowedSources(
    readFileSync(join(root, '_redirects'), 'utf8'),
    path => existsSync(join(root, path, 'index.html')),
  )
  for (const from of shadowed) console.error(`_redirects: ${from} is a page this build made. The rule hides it; delete the rule.`)
  if (shadowed.length) process.exit(1)
}
