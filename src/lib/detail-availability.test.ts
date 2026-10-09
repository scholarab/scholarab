import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { transform } from '@astrojs/compiler-rs'
import { experimental_AstroContainer } from 'astro/container'
import scholarships from '../data/scholarships.json'
import programs from '../data/research-programs.json'
import { saysNoApplication } from './apply-method'

const routePath = resolve('src/pages/[type]/[slug].astro')
const componentPath = resolve('src/components/sab/SabDetail.astro')
const route = readFileSync(routePath, 'utf8').split('---')[1]!
const component = readFileSync(componentPath, 'utf8')
const require = createRequire(import.meta.url)

// Compile the actual route's data preparation and actual Astro component in
// memory. No site build, generated output, server, or replacement render logic.
async function moduleFrom(source: string, directory: string) {
  const compiled = await build({
    stdin: { contents: source, resolveDir: directory, loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', write: false,
    external: ['file:*'], logLevel: 'silent',
  })
  const url = `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString('base64')}`
  return import(/* @vite-ignore */ url)
}

let prepare: (props: Record<string, unknown>) => Record<string, unknown>
let render: (data: Record<string, unknown>) => Promise<void>
let refresh: () => void
let prepareSaved: (props: Record<string, unknown>) => Array<{ type: string; id: number; active?: boolean }>

beforeAll(async () => {
  const imports = route.match(/^import .*;$/gm)!.filter(line => !/\.astro|data-loader/.test(line)).join('\n')
  const preparation = route.slice(route.indexOf('const { kind,'), route.indexOf('// The explainer for this listing'))
  prepare = (await moduleFrom(`${imports}\nexport function prepare(props) { const Astro = { props }; ${preparation}\nreturn d; }`, dirname(routePath))).prepare
  const compiled = transform(component, {
    filename: componentPath, internalURL: pathToFileURL(require.resolve('astro/compiler-runtime')).href,
    resultScopedSlot: true, resolvePath: value => value,
  })
  const detail = (await moduleFrom(compiled.code.replace(/^import "[^"]+\.css";$/gm, ''), dirname(componentPath))).default
  const container = await experimental_AstroContainer.create()
  render = async data => {
    const html = await container.renderToString(detail, { props: {
      ...data, name: data.itemName, backHref: data.currentPath, backLabel: 'Back',
      alternatives: [{ href: '/scholarships/open-award/', title: 'Open alternative', value: '$1,000', when: 'Open' }],
    } })
    // The clock function below is executed explicitly. Do not ask happy-dom
    // to load Astro's virtual browser module from this memory-only render.
    document.body.innerHTML = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  }
  const clock = component.slice(component.indexOf('  function refreshStatusChip()'), component.indexOf('  // Per-item views'))
  refresh = (await moduleFrom(`import { todayDate } from '../../lib/calendar';
    import { URGENT_DAYS, SOON_DAYS } from '../../lib/list-core';
    import { LIKELY_DATE, STATUS_WORDS } from '../../lib/status';
    ${clock}\nexport { refreshStatusChip };`, dirname(componentPath))).refreshStatusChip
  const savedSource = readFileSync(resolve('src/components/sab/SavedDirectory.astro'), 'utf8').split('---')[1]!
  const savedImports = savedSource.match(/^import .*;$/gm)!.join('\n')
  const savedPreparation = savedSource.slice(savedSource.indexOf('const { initialScholarships,'))
  prepareSaved = (await moduleFrom(`${savedImports}\nexport function prepare(props) { const Astro = { props }; ${savedPreparation}\nreturn items; }`, dirname(componentPath))).prepare
})

afterEach(() => { vi.useRealTimers(); document.body.innerHTML = '' })
const text = (selector: string) => document.querySelector(selector)?.textContent?.trim()
function data(kind: 'scholarship' | 'program', record: object) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-29T12:00:00-06:00'))
  return prepare({ kind, [kind]: record, related: [], crossRelated: [], alternatives: [], metaDescription: 'Recorded scholarship description.' })
}

describe('detail availability', () => {
  it('carries all inactive program flags into the saved payload without adding active defaults', () => {
    const payload = prepareSaved({ initialScholarships: [], initialPrograms: programs })
    expect(payload).toHaveLength(286)
    expect(payload.filter(p => p.active === false).map(p => p.id)).toEqual(programs.filter(p => p.active === false).map(p => p.id))
    expect(payload.filter(p => p.active !== false).every(p => !('active' in p))).toBe(true)
  })

  it('keeps every inactive program neutral, linked, and explained after clock repaint', async () => {
    const inactive = programs.filter(p => p.active === false)
    expect(inactive).toHaveLength(15)
    for (const p of inactive) {
      const d = data('program', p)
      await render(d)
      expect(text('[data-status-chip]'), p.name).toBe('Not currently listed')
      expect(document.querySelector('.sabd-deadline-value')).toBeNull()
      expect(text('.sabd-cta')).toContain('Visit the program site')
      expect(document.querySelector('.sabd-cta')?.getAttribute('href')).toBe(p.url)
      expect(text('.sabd-about')).toBe(p.description)
      expect(d.description).not.toMatch(/^Open year-round\./)
      expect(document.querySelector('[data-remind]')).toBeNull()
      // Even stale date attributes must not override curated availability.
      const chip = document.querySelector<HTMLElement>('[data-status-chip]')!
      chip.dataset.deadline = '2027-01-01'
      chip.dataset.inactive = ''
      refresh()
      expect(chip.textContent).toBe('Not currently listed')
    }
  })

  it('ends the concluded scholarship without a next-cycle promise, preserving alternatives and provider', async () => {
    const s = scholarships.find(s => s.id === 59)!
    await render(data('scholarship', s))
    expect(text('[data-status-chip]')).toBe('Ended')
    expect(text('.sabd-estimate-note')).toBe('This scholarship has ended.')
    expect(document.querySelector('.sabd-deadline-value')).toBeNull()
    expect(text('.sabd-cta')).toBe('Ended')
    expect(document.querySelector('.sabd-visit')?.getAttribute('href')).toBe(s.url)
    expect(text('.sabd-alts')).toContain('Open alternative')
    expect(text('.sabd-about')).toBe(s.description)
    const chip = document.querySelector<HTMLElement>('[data-status-chip]')!
    chip.dataset.deadline = '2027-01-01'
    chip.dataset.openDate = '2026-12-01'
    refresh()
    expect(chip.textContent).toBe('Ended')
  })

  it('retains ordinary closed-cycle wording, alternatives and provider access', async () => {
    const s = scholarships.find(s => s.id === 312)!
    await render(data('scholarship', s))
    expect(text('[data-status-chip]')).toBe('Closed')
    expect(text('.sabd-estimate-note')).toContain('This cycle is over')
    expect(text('.sabd-alts')).toContain('Open alternative')
    expect(document.querySelector('.sabd-visit')?.getAttribute('href')).toBe(s.url)
    refresh()
    expect(text('[data-status-chip]')).toBe('Closed')
  })

  it('distinguishes every rolling deadline from unconfirmed and estimated dates', async () => {
    const rolling = scholarships.filter(s => 'rolling' in s && s.rolling)
    expect(rolling).toHaveLength(3)
    for (const s of rolling) {
      await render(data('scholarship', s))
      expect(text('.sabd-deadline-value')).toBe('No fixed deadline')
      refresh()
      expect(text('[data-status-chip]')).toBe('Open now')
    }
    await render(data('scholarship', scholarships.find(s => s.id === 20)!))
    expect(text('.sabd-deadline-value')).toBe('Around May 31, 2027')
    expect(text('.sabd-estimate-note')).toContain("Last year's date")
    refresh()
    expect(text('[data-status-chip]')).toBe('Likely date, not posted yet')
  })

  it('preserves all no-separate-application routes and provider links', async () => {
    const records = scholarships.filter(s => saysNoApplication(s.notes, s.metaDetail, s.description))
    expect(records).toHaveLength(75)
    for (const s of records) {
      await render(data('scholarship', s))
      expect(text('.sabd-cta'), s.title).not.toMatch(/^Apply\b/)
      expect([...document.querySelectorAll('h2')].some(h => h.textContent === 'How to apply'), s.title).toBe(false)
      expect([...document.querySelectorAll('a')].some(a => a.getAttribute('href') === s.url), s.title).toBe(true)
    }
  })
})
