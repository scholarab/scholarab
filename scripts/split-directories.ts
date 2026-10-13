#!/usr/bin/env node
/**
 * Ships a directory page with only the cards its first screen shows.
 *
 * /scholarships/ carried all 1,691 cards in its HTML (3.6 MB, 358 KiB on the
 * wire) for the 24 a reader sees, and Lighthouse's slow-4G phone waits for the
 * whole document before its first paint: mobile scored 80. With the hidden
 * cards out of the page it scored 95 to 98 (2026-10-13).
 *
 * After `astro build`, every directory page is copied whole to <page>/all/
 * (noindex, follow) with each hidden card wrapped in <!--c-->...<!--/c-->.
 * The page itself keeps its headings and first-step cards, the ones not
 * marked data-dir-later or data-dir-shut, which global.css hides under html.js
 * anyway, and names the copy in data-dir-rest. directory-client fetches the
 * copy and appends the wrapped cards before its first render, which places
 * every card it shows, so the page looks as it did. Without JavaScript the
 * grid ends in a link to the copy, where every listing is on one page.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { splitDirectoryPage } from '../src/lib/split-directories.ts'

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? htmlFiles(p) : name === 'index.html' ? [p] : []
  })
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = 'dist/client'
  let pages = 0
  let before = 0
  let after = 0
  for (const file of htmlFiles(root)) {
    const html = readFileSync(file, 'utf8')
    if (!html.includes('data-dir-grid')) continue
    const dir = relative(root, file).split(sep).slice(0, -1).join('/')
    const split = splitDirectoryPage(html, `/${dir}/all/`)
    if (!split) continue
    mkdirSync(join(root, dir, 'all'), { recursive: true })
    writeFileSync(join(root, dir, 'all', 'index.html'), split.all)
    writeFileSync(file, split.page)
    pages++
    before += html.length
    after += split.page.length
  }
  console.log(`split-directories: ${pages} pages, ${(before / 1e6).toFixed(1)} MB of HTML down to ${(after / 1e6).toFixed(1)} MB`)
}
